import { Injectable, NotFoundException, ConflictException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { Prisma } from '@app/database';
import { normalizeSkillDisplay, normalizeSkillKey } from '@app/common';
import { ProfileRepository, SkillRepository, SkillEndorsementRepository, SystemCatalogRepository } from '@app/repository';
import { SkillDto } from './skill.dto';
import { CandidateAccessService } from '../shared/candidate-access.service';

/** Clave de `SystemCatalog` para el nivel de habilidad (Fase 10). */
const SKILL_LEVEL_CATALOG_KEY = 'SKILL_LEVEL';

@Injectable()
export class SkillsService {
  constructor(
    private readonly profileRepository: ProfileRepository,
    private readonly skillRepository: SkillRepository,
    private readonly skillEndorsementRepository: SkillEndorsementRepository,
    private readonly systemCatalogRepository: SystemCatalogRepository,
    private readonly candidateAccess: CandidateAccessService,
  ) {}

  private async assertValidCatalogValue(catalogKey: string, value: string | undefined, fieldLabel: string): Promise<void> {
    if (value === undefined) return;
    const entry = await this.systemCatalogRepository.findByKeyAndValue(catalogKey, value);
    if (!entry || !entry.active) {
      throw new BadRequestException(`${fieldLabel} no es un valor válido`);
    }
  }

  /** Catálogo de niveles de habilidad (Fase 10). */
  async getSkillCatalogs() {
    const level = await this.systemCatalogRepository.findActiveByKey(SKILL_LEVEL_CATALOG_KEY);
    return { level: level.map((r) => ({ value: r.value, label: r.label })) };
  }

  async getSkills(userId: number) {
    const profile = await this.profileRepository.findByUserId(userId);
    if (!profile) throw new NotFoundException('Perfil no encontrado');
    const skills = await this.skillRepository.findByProfileIdWithEndorsements(profile.id);

    return skills.map((s) => ({
      ...s,
      endorsements: s.endorsements.map((e) => e.company.companyProfile?.companyName || 'Empresa'),
    }));
  }

  async addSkill(userId: number, dto: SkillDto) {
    if (!dto.name?.trim()) throw new BadRequestException('El nombre de la habilidad es requerido');

    const profile = await this.profileRepository.findByUserId(userId);
    if (!profile) throw new NotFoundException('Perfil no encontrado');

    const displayName = normalizeSkillDisplay(dto.name);
    const normalized = normalizeSkillKey(dto.name);
    const existing = await this.skillRepository.findByProfileIdAndNormalizedName(profile.id, normalized);
    if (existing) throw new ConflictException('Esta habilidad ya existe en tu perfil');

    await this.assertValidCatalogValue(SKILL_LEVEL_CATALOG_KEY, dto.level, 'El nivel');

    // El chequeo de `existing` es best-effort: dos requests simultáneas
    // agregando la misma habilidad pueden pasarlo las dos. La constraint
    // única profileId+normalizedName en la base es la que realmente lo
    // impide; acá traducimos su violación (P2002) al mismo 409 amigable.
    try {
      return await this.skillRepository.create({
        profileId: profile.id,
        name: displayName,
        normalizedName: normalized,
        level: dto.level || 'BASIC',
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException('Esta habilidad ya existe en tu perfil');
      }
      throw err;
    }
  }

  async updateSkill(userId: number, skillId: number, dto: SkillDto) {
    const profile = await this.profileRepository.findByUserId(userId);
    if (!profile) throw new NotFoundException('Perfil no encontrado');

    const skill = await this.skillRepository.findByIdAndProfileId(skillId, profile.id);
    if (!skill) throw new NotFoundException('Habilidad no encontrada');

    // `dto.name` truthy no alcanza: un string de solo espacios ("   ") es
    // truthy pero `normalizeSkillDisplay`/`normalizeSkillKey` lo colapsan a
    // "" — sin este chequeo, eso vaciaba silenciosamente el nombre de la
    // habilidad en vez de rechazar el cambio (mismo criterio que `addSkill`).
    if (dto.name !== undefined && !dto.name.trim()) {
      throw new BadRequestException('El nombre de la habilidad no puede estar vacío');
    }
    await this.assertValidCatalogValue(SKILL_LEVEL_CATALOG_KEY, dto.level, 'El nivel');

    const normalized = dto.name ? normalizeSkillKey(dto.name) : skill.normalizedName;
    return this.skillRepository.update(skillId, {
      name: dto.name ? normalizeSkillDisplay(dto.name) : skill.name,
      normalizedName: normalized,
      level: dto.level || skill.level,
    });
  }

  async removeSkill(userId: number, skillId: number) {
    const profile = await this.profileRepository.findByUserId(userId);
    if (!profile) throw new NotFoundException('Perfil no encontrado');

    const skill = await this.skillRepository.findByIdAndProfileId(skillId, profile.id);
    if (!skill) throw new NotFoundException('Habilidad no encontrada');

    await this.skillRepository.delete(skillId);
    return { message: 'Habilidad eliminada' };
  }

  async endorseSkill(companyUserId: number, skillId: number) {
    const skill = await this.skillRepository.findByIdWithProfileUserId(skillId);
    if (!skill) throw new NotFoundException('Habilidad no encontrada');

    const hasRelationship = await this.candidateAccess.companyHasContactedCandidate(companyUserId, skill.profile.userId);
    if (!hasRelationship) {
      throw new ForbiddenException('Solo puedes avalar habilidades de candidatos con los que ya tuviste una conversación o postulación');
    }

    await this.skillEndorsementRepository.upsert(skillId, companyUserId);

    return { message: 'Habilidad avalada' };
  }

  async unendorseSkill(companyUserId: number, skillId: number) {
    await this.skillEndorsementRepository.deleteMany(skillId, companyUserId);
    return { message: 'Aval retirado' };
  }
}
