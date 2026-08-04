import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@app/database';
import { ProjectDto } from './dto/project.dto';

/** Claves de `SystemCatalog` para las opciones de proyecto (Fase 10). */
const PROJECT_CATALOG_KEYS = {
  projectType: 'PROJECT_TYPE',
  status: 'PROJECT_STATUS',
} as const;

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertValidCatalogValue(catalogKey: string, value: string | undefined, fieldLabel: string): Promise<void> {
    if (value === undefined) return;
    const entry = await this.prisma.systemCatalog.findUnique({
      where: { catalogKey_value: { catalogKey, value } },
    });
    if (!entry || !entry.active) {
      throw new BadRequestException(`${fieldLabel} no es un valor válido`);
    }
  }

  /** Catálogos de opciones para el formulario de proyectos (Fase 10). */
  async getProjectCatalogs() {
    const [projectType, status] = await Promise.all([
      this.prisma.systemCatalog.findMany({ where: { catalogKey: PROJECT_CATALOG_KEYS.projectType, active: true }, orderBy: { sortOrder: 'asc' } }),
      this.prisma.systemCatalog.findMany({ where: { catalogKey: PROJECT_CATALOG_KEYS.status, active: true }, orderBy: { sortOrder: 'asc' } }),
    ]);
    const toOptions = (rows: { value: string; label: string }[]) => rows.map((r) => ({ value: r.value, label: r.label }));
    return { projectType: toOptions(projectType), status: toOptions(status) };
  }

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

    await this.assertValidCatalogValue(PROJECT_CATALOG_KEYS.projectType, dto.projectType, 'El tipo de proyecto');
    await this.assertValidCatalogValue(PROJECT_CATALOG_KEYS.status, dto.status, 'El estado del proyecto');

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

    await this.assertValidCatalogValue(PROJECT_CATALOG_KEYS.projectType, dto.projectType, 'El tipo de proyecto');
    await this.assertValidCatalogValue(PROJECT_CATALOG_KEYS.status, dto.status, 'El estado del proyecto');

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
