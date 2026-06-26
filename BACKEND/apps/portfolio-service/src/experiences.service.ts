import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@app/database';
import { ExperienceDto } from './dto/experience.dto';

@Injectable()
export class ExperiencesService {
  constructor(private readonly prisma: PrismaService) {}

  async getExperiences(userId: number) {
    const profile = await this.prisma.profile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException('Perfil no encontrado');
    return this.prisma.experience.findMany({
      where: { profileId: profile.id },
      orderBy: { startDate: 'desc' },
    });
  }

  async addExperience(userId: number, dto: ExperienceDto) {
    const profile = await this.prisma.profile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException('Perfil no encontrado');

    return this.prisma.experience.create({
      data: {
        profileId: profile.id,
        company: dto.company,
        position: dto.position,
        city: dto.city,
        workMode: dto.workMode,
        contractType: dto.contractType,
        description: dto.description,
        functions: dto.functions,
        achievements: dto.achievements,
        tools: dto.tools,
        learnedSkills: dto.learnedSkills || [],
        startDate: new Date(dto.startDate),
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        isCurrent: dto.isCurrent || false,
      },
    });
  }

  async updateExperience(userId: number, expId: number, dto: ExperienceDto) {
    const profile = await this.prisma.profile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException('Perfil no encontrado');

    const exp = await this.prisma.experience.findFirst({
      where: { id: expId, profileId: profile.id },
    });
    if (!exp) throw new NotFoundException('Experiencia no encontrada');

    return this.prisma.experience.update({
      where: { id: expId },
      data: {
        ...(dto.company && { company: dto.company }),
        ...(dto.position && { position: dto.position }),
        ...(dto.city !== undefined && { city: dto.city }),
        ...(dto.workMode !== undefined && { workMode: dto.workMode }),
        ...(dto.contractType !== undefined && { contractType: dto.contractType }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.functions !== undefined && { functions: dto.functions }),
        ...(dto.achievements !== undefined && { achievements: dto.achievements }),
        ...(dto.tools !== undefined && { tools: dto.tools }),
        ...(dto.learnedSkills && { learnedSkills: dto.learnedSkills }),
        ...(dto.startDate && { startDate: new Date(dto.startDate) }),
        ...(dto.endDate !== undefined && { endDate: dto.endDate ? new Date(dto.endDate) : null }),
        ...(dto.isCurrent !== undefined && { isCurrent: dto.isCurrent }),
      },
    });
  }

  async removeExperience(userId: number, expId: number) {
    const profile = await this.prisma.profile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException('Perfil no encontrado');

    const exp = await this.prisma.experience.findFirst({
      where: { id: expId, profileId: profile.id },
    });
    if (!exp) throw new NotFoundException('Experiencia no encontrada');

    await this.prisma.experience.delete({ where: { id: expId } });
    return { message: 'Experiencia eliminada' };
  }
}
