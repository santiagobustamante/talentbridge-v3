import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { titleCaseText, trimText, normalizeSkillDisplay, normalizeSkillKey } from '@app/common';
import { ProfileRepository, ExperienceRepository, SystemCatalogRepository } from '@app/repository';
import { ExperienceDto } from './experience.dto';

/** Dedup case-insensitive preservando la primera capitalización que llegó. */
function dedupeSkillList(skills: string[]): string[] {
  const seen = new Map<string, string>();
  for (const raw of skills) {
    const display = normalizeSkillDisplay(raw);
    if (!display) continue;
    const key = normalizeSkillKey(display);
    if (!seen.has(key)) seen.set(key, display);
  }
  return Array.from(seen.values());
}

/** Claves de `SystemCatalog` para las opciones de experiencia laboral (Fase 10) — distintas de `JOB_MODALITY`/`JOB_CONTRACT_TYPE` (oferta laboral): una es clasificación genérica de experiencia del candidato, la otra son tipos de contrato legales colombianos de una vacante. Unificarlas sería un error conceptual (ver Fase 3 de docs/plan-panel-administrativo.md). */
const EXPERIENCE_CATALOG_KEYS = {
  workMode: 'EXPERIENCE_WORK_MODE',
  contractType: 'EXPERIENCE_CONTRACT_TYPE',
} as const;

@Injectable()
export class ExperiencesService {
  constructor(
    private readonly profileRepository: ProfileRepository,
    private readonly experienceRepository: ExperienceRepository,
    private readonly systemCatalogRepository: SystemCatalogRepository,
  ) {}

  /** Mismo patrón que `JobsService.assertValidCatalogValue()` — reemplaza el `@IsIn(ARRAY_ESTATICO)` que tenía el DTO. */
  private async assertValidCatalogValue(catalogKey: string, value: string | undefined, fieldLabel: string): Promise<void> {
    if (value === undefined) return;
    const entry = await this.systemCatalogRepository.findByKeyAndValue(catalogKey, value);
    if (!entry || !entry.active) {
      throw new BadRequestException(`${fieldLabel} no es un valor válido`);
    }
  }

  /** Catálogos de opciones para el formulario de experiencia laboral (Fase 10). */
  async getExperienceCatalogs() {
    const [workMode, contractType] = await Promise.all([
      this.systemCatalogRepository.findActiveByKey(EXPERIENCE_CATALOG_KEYS.workMode),
      this.systemCatalogRepository.findActiveByKey(EXPERIENCE_CATALOG_KEYS.contractType),
    ]);
    const toOptions = (rows: { value: string; label: string }[]) => rows.map((r) => ({ value: r.value, label: r.label }));
    return { workMode: toOptions(workMode), contractType: toOptions(contractType) };
  }

  async getExperiences(userId: number) {
    const profile = await this.profileRepository.findByUserId(userId);
    if (!profile) throw new NotFoundException('Perfil no encontrado');
    return this.experienceRepository.findByProfileId(profile.id);
  }

  async addExperience(userId: number, dto: ExperienceDto) {
    const profile = await this.profileRepository.findByUserId(userId);
    if (!profile) throw new NotFoundException('Perfil no encontrado');

    await this.assertValidCatalogValue(EXPERIENCE_CATALOG_KEYS.workMode, dto.workMode, 'La modalidad de trabajo');
    await this.assertValidCatalogValue(EXPERIENCE_CATALOG_KEYS.contractType, dto.contractType, 'El tipo de contrato');

    return this.experienceRepository.create({
      profileId: profile.id,
      company: titleCaseText(dto.company),
      position: titleCaseText(dto.position),
      // Sin titleCaseText: viene del catálogo DIVIPOLA con su casing
      // oficial (incluye conectores en minúscula, ej. "San José de la Montaña").
      city: dto.city ? trimText(dto.city) : dto.city,
      workMode: dto.workMode,
      contractType: dto.contractType,
      customContractType: dto.customContractType,
      description: dto.description ? trimText(dto.description) : dto.description,
      functions: dto.functions ? trimText(dto.functions) : dto.functions,
      achievements: dto.achievements ? trimText(dto.achievements) : dto.achievements,
      tools: dto.tools ? trimText(dto.tools) : dto.tools,
      learnedSkills: dto.learnedSkills ? dedupeSkillList(dto.learnedSkills) : [],
      startDate: new Date(dto.startDate),
      endDate: dto.endDate ? new Date(dto.endDate) : null,
      isCurrent: dto.isCurrent || false,
    });
  }

  async updateExperience(userId: number, expId: number, dto: ExperienceDto) {
    const profile = await this.profileRepository.findByUserId(userId);
    if (!profile) throw new NotFoundException('Perfil no encontrado');

    const exp = await this.experienceRepository.findByIdAndProfileId(expId, profile.id);
    if (!exp) throw new NotFoundException('Experiencia no encontrada');

    await this.assertValidCatalogValue(EXPERIENCE_CATALOG_KEYS.workMode, dto.workMode, 'La modalidad de trabajo');
    await this.assertValidCatalogValue(EXPERIENCE_CATALOG_KEYS.contractType, dto.contractType, 'El tipo de contrato');

    return this.experienceRepository.update(expId, {
      ...(dto.company && { company: titleCaseText(dto.company) }),
      ...(dto.position && { position: titleCaseText(dto.position) }),
      ...(dto.city !== undefined && { city: dto.city ? trimText(dto.city) : dto.city }),
      ...(dto.workMode !== undefined && { workMode: dto.workMode }),
      ...(dto.contractType !== undefined && { contractType: dto.contractType }),
      ...(dto.customContractType !== undefined && { customContractType: dto.customContractType }),
      ...(dto.description !== undefined && { description: dto.description ? trimText(dto.description) : dto.description }),
      ...(dto.functions !== undefined && { functions: dto.functions ? trimText(dto.functions) : dto.functions }),
      ...(dto.achievements !== undefined && { achievements: dto.achievements ? trimText(dto.achievements) : dto.achievements }),
      ...(dto.tools !== undefined && { tools: dto.tools ? trimText(dto.tools) : dto.tools }),
      ...(dto.learnedSkills && { learnedSkills: dedupeSkillList(dto.learnedSkills) }),
      ...(dto.startDate && { startDate: new Date(dto.startDate) }),
      ...(dto.endDate !== undefined && { endDate: dto.endDate ? new Date(dto.endDate) : null }),
      ...(dto.isCurrent !== undefined && { isCurrent: dto.isCurrent }),
    });
  }

  async removeExperience(userId: number, expId: number) {
    const profile = await this.profileRepository.findByUserId(userId);
    if (!profile) throw new NotFoundException('Perfil no encontrado');

    const exp = await this.experienceRepository.findByIdAndProfileId(expId, profile.id);
    if (!exp) throw new NotFoundException('Experiencia no encontrada');

    await this.experienceRepository.delete(expId);
    return { message: 'Experiencia eliminada' };
  }
}
