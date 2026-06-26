import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@app/database';
import { ProjectDto } from './dto/project.dto';

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async getProjects(userId: number) {
    const profile = await this.prisma.profile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException('Perfil no encontrado');
    return this.prisma.project.findMany({
      where: { profileId: profile.id },
      orderBy: { createdAt: 'desc' },
    });
  }

  async addProject(userId: number, dto: ProjectDto) {
    const profile = await this.prisma.profile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException('Perfil no encontrado');

    return this.prisma.project.create({
      data: {
        profileId: profile.id,
        name: dto.name,
        description: dto.description,
        role: dto.role,
        responsibilities: dto.responsibilities,
        technologies: dto.technologies || [],
        repositoryUrl: dto.repositoryUrl,
        demoUrl: dto.demoUrl,
        imageUrl: dto.imageUrl,
        projectType: dto.projectType,
        status: dto.status,
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        endDate: dto.endDate ? new Date(dto.endDate) : null,
      },
    });
  }

  async updateProject(userId: number, projId: number, dto: ProjectDto) {
    const profile = await this.prisma.profile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException('Perfil no encontrado');

    const proj = await this.prisma.project.findFirst({
      where: { id: projId, profileId: profile.id },
    });
    if (!proj) throw new NotFoundException('Proyecto no encontrado');

    return this.prisma.project.update({
      where: { id: projId },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.role !== undefined && { role: dto.role }),
        ...(dto.responsibilities !== undefined && { responsibilities: dto.responsibilities }),
        ...(dto.technologies && { technologies: dto.technologies }),
        ...(dto.repositoryUrl !== undefined && { repositoryUrl: dto.repositoryUrl }),
        ...(dto.demoUrl !== undefined && { demoUrl: dto.demoUrl }),
        ...(dto.imageUrl !== undefined && { imageUrl: dto.imageUrl }),
        ...(dto.projectType !== undefined && { projectType: dto.projectType }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.startDate !== undefined && { startDate: dto.startDate ? new Date(dto.startDate) : null }),
        ...(dto.endDate !== undefined && { endDate: dto.endDate ? new Date(dto.endDate) : null }),
      },
    });
  }

  async removeProject(userId: number, projId: number) {
    const profile = await this.prisma.profile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException('Perfil no encontrado');

    const proj = await this.prisma.project.findFirst({
      where: { id: projId, profileId: profile.id },
    });
    if (!proj) throw new NotFoundException('Proyecto no encontrado');

    await this.prisma.project.delete({ where: { id: projId } });
    return { message: 'Proyecto eliminado' };
  }
}
