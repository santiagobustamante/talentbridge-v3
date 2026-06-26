import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '@app/database';
import { SkillDto } from './dto/skill.dto';

@Injectable()
export class SkillsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSkills(userId: number) {
    const profile = await this.prisma.profile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException('Perfil no encontrado');
    return this.prisma.skill.findMany({
      where: { profileId: profile.id },
      orderBy: { createdAt: 'desc' },
    });
  }

  async addSkill(userId: number, dto: SkillDto) {
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
}
