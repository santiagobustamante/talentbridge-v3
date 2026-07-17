import { Injectable, NotFoundException, ConflictException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '@app/database';
import { SkillDto } from './dto/skill.dto';

@Injectable()
export class SkillsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSkills(userId: number) {
    const profile = await this.prisma.profile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException('Perfil no encontrado');
    const skills = await this.prisma.skill.findMany({
      where: { profileId: profile.id },
      orderBy: { createdAt: 'desc' },
      include: {
        endorsements: {
          include: { company: { select: { companyProfile: { select: { companyName: true } } } } },
        },
      },
    });

    return skills.map((s) => ({
      ...s,
      endorsements: s.endorsements.map((e) => e.company.companyProfile?.companyName || 'Empresa'),
    }));
  }

  async addSkill(userId: number, dto: SkillDto) {
    if (!dto.name?.trim()) throw new BadRequestException('El nombre de la habilidad es requerido');

    const profile = await this.prisma.profile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException('Perfil no encontrado');

    const normalized = dto.name.trim().toLowerCase();
    const existing = await this.prisma.skill.findUnique({
      where: { profileId_normalizedName: { profileId: profile.id, normalizedName: normalized } },
    });
    if (existing) throw new ConflictException('Esta habilidad ya existe en tu perfil');

    return this.prisma.skill.create({
      data: {
        profileId: profile.id,
        name: dto.name,
        normalizedName: normalized,
        level: dto.level || 'BASIC',
      },
    });
  }

  async updateSkill(userId: number, skillId: number, dto: SkillDto) {
    const profile = await this.prisma.profile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException('Perfil no encontrado');

    const skill = await this.prisma.skill.findFirst({
      where: { id: skillId, profileId: profile.id },
    });
    if (!skill) throw new NotFoundException('Habilidad no encontrada');

    const normalized = dto.name ? dto.name.trim().toLowerCase() : skill.normalizedName;
    return this.prisma.skill.update({
      where: { id: skillId },
      data: {
        name: dto.name || skill.name,
        normalizedName: normalized,
        level: dto.level || skill.level,
      },
    });
  }

  async removeSkill(userId: number, skillId: number) {
    const profile = await this.prisma.profile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException('Perfil no encontrado');

    const skill = await this.prisma.skill.findFirst({
      where: { id: skillId, profileId: profile.id },
    });
    if (!skill) throw new NotFoundException('Habilidad no encontrada');

    await this.prisma.skill.delete({ where: { id: skillId } });
    return { message: 'Habilidad eliminada' };
  }

  async endorseSkill(companyUserId: number, skillId: number) {
    const skill = await this.prisma.skill.findUnique({
      where: { id: skillId },
      include: { profile: { select: { userId: true } } },
    });
    if (!skill) throw new NotFoundException('Habilidad no encontrada');

    const hasRelationship = await this.companyHasContactedCandidate(companyUserId, skill.profile.userId);
    if (!hasRelationship) {
      throw new ForbiddenException('Solo puedes avalar habilidades de candidatos con los que ya tuviste una conversación o postulación');
    }

    await this.prisma.skillEndorsement.upsert({
      where: { skillId_companyId: { skillId, companyId: companyUserId } },
      create: { skillId, companyId: companyUserId },
      update: {},
    });

    return { message: 'Habilidad avalada' };
  }

  async unendorseSkill(companyUserId: number, skillId: number) {
    await this.prisma.skillEndorsement.deleteMany({
      where: { skillId, companyId: companyUserId },
    });
    return { message: 'Aval retirado' };
  }

  private async companyHasContactedCandidate(companyUserId: number, candidateUserId: number): Promise<boolean> {
    const conversation = await this.prisma.conversation.findUnique({
      where: { candidateId_companyId: { candidateId: candidateUserId, companyId: companyUserId } },
    });
    if (conversation) return true;

    const application = await this.prisma.jobApplication.findFirst({
      where: { candidateId: candidateUserId, jobOffer: { companyId: companyUserId } },
    });
    return !!application;
  }
}
