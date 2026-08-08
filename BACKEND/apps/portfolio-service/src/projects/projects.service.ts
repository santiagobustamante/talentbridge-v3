import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { ProfileRepository, ProjectRepository, SystemCatalogRepository } from '@app/repository';
import { ProjectDto } from './project.dto';

/** Claves de `SystemCatalog` para las opciones de proyecto (Fase 10). */
const PROJECT_CATALOG_KEYS = {
  projectType: 'PROJECT_TYPE',
  status: 'PROJECT_STATUS',
} as const;

@Injectable()
export class ProjectsService {
  constructor(
    private readonly profileRepository: ProfileRepository,
    private readonly projectRepository: ProjectRepository,
    private readonly systemCatalogRepository: SystemCatalogRepository,
  ) {}

  private async assertValidCatalogValue(catalogKey: string, value: string | undefined, fieldLabel: string): Promise<void> {
    if (value === undefined) return;
    const entry = await this.systemCatalogRepository.findByKeyAndValue(catalogKey, value);
    if (!entry || !entry.active) {
      throw new BadRequestException(`${fieldLabel} no es un valor válido`);
    }
  }

  /** Catálogos de opciones para el formulario de proyectos (Fase 10). */
  async getProjectCatalogs() {
    const [projectType, status] = await Promise.all([
      this.systemCatalogRepository.findActiveByKey(PROJECT_CATALOG_KEYS.projectType),
      this.systemCatalogRepository.findActiveByKey(PROJECT_CATALOG_KEYS.status),
    ]);
    const toOptions = (rows: { value: string; label: string }[]) => rows.map((r) => ({ value: r.value, label: r.label }));
    return { projectType: toOptions(projectType), status: toOptions(status) };
  }

  async getProjects(userId: number) {
    const profile = await this.profileRepository.findByUserId(userId);
    if (!profile) throw new NotFoundException('Perfil no encontrado');
    return this.projectRepository.findByProfileId(profile.id);
  }

  async addProject(userId: number, dto: ProjectDto) {
    const profile = await this.profileRepository.findByUserId(userId);
    if (!profile) throw new NotFoundException('Perfil no encontrado');

    await this.assertValidCatalogValue(PROJECT_CATALOG_KEYS.projectType, dto.projectType, 'El tipo de proyecto');
    await this.assertValidCatalogValue(PROJECT_CATALOG_KEYS.status, dto.status, 'El estado del proyecto');

    return this.projectRepository.create({
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
    });
  }

  async updateProject(userId: number, projId: number, dto: ProjectDto) {
    const profile = await this.profileRepository.findByUserId(userId);
    if (!profile) throw new NotFoundException('Perfil no encontrado');

    const proj = await this.projectRepository.findByIdAndProfileId(projId, profile.id);
    if (!proj) throw new NotFoundException('Proyecto no encontrado');

    await this.assertValidCatalogValue(PROJECT_CATALOG_KEYS.projectType, dto.projectType, 'El tipo de proyecto');
    await this.assertValidCatalogValue(PROJECT_CATALOG_KEYS.status, dto.status, 'El estado del proyecto');

    return this.projectRepository.update(projId, {
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
    });
  }

  async removeProject(userId: number, projId: number) {
    const profile = await this.profileRepository.findByUserId(userId);
    if (!profile) throw new NotFoundException('Perfil no encontrado');

    const proj = await this.projectRepository.findByIdAndProfileId(projId, profile.id);
    if (!proj) throw new NotFoundException('Proyecto no encontrado');

    await this.projectRepository.delete(projId);
    return { message: 'Proyecto eliminado' };
  }
}
