import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@app/database';
import { titleCaseText, trimText } from '@app/common';
import { EducationDto } from './dto/education.dto';

/** Claves de `SystemCatalog` para las opciones de formación académica (Fase 10). */
const EDUCATION_CATALOG_KEYS = {
  educationType: 'EDUCATION_TYPE',
  formationLevel: 'FORMATION_LEVEL',
} as const;

@Injectable()
export class EducationService {
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

  /** Catálogos de opciones para el formulario de formación académica (Fase 10). */
  async getEducationCatalogs() {
    const [educationType, formationLevel] = await Promise.all([
      this.prisma.systemCatalog.findMany({ where: { catalogKey: EDUCATION_CATALOG_KEYS.educationType, active: true }, orderBy: { sortOrder: 'asc' } }),
      this.prisma.systemCatalog.findMany({ where: { catalogKey: EDUCATION_CATALOG_KEYS.formationLevel, active: true }, orderBy: { sortOrder: 'asc' } }),
    ]);
    const toOptions = (rows: { value: string; label: string }[]) => rows.map((r) => ({ value: r.value, label: r.label }));
    return { educationType: toOptions(educationType), formationLevel: toOptions(formationLevel) };
  }

  async getEducation(userId: number) {
    const profile = await this.prisma.profile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException('Perfil no encontrado');
    return this.prisma.education.findMany({
      where: { profileId: profile.id },
      orderBy: { startDate: 'desc' },
    });
  }

  async addEducation(userId: number, dto: EducationDto) {
    const profile = await this.prisma.profile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException('Perfil no encontrado');

    await this.assertValidCatalogValue(EDUCATION_CATALOG_KEYS.educationType, dto.educationType, 'El tipo de formación');
    await this.assertValidCatalogValue(EDUCATION_CATALOG_KEYS.formationLevel, dto.formationLevel, 'El nivel de formación');

    return this.prisma.education.create({
      data: {
        profileId: profile.id,
        institution: titleCaseText(dto.institution),
        degree: titleCaseText(dto.degree),
        fieldOfStudy: dto.fieldOfStudy ? titleCaseText(dto.fieldOfStudy) : dto.fieldOfStudy,
        educationType: dto.educationType || 'FORMAL',
        formationLevel: dto.formationLevel,
        customFormationLevel: dto.formationLevel === 'Otro' ? dto.customFormationLevel : undefined,
        description: dto.description ? trimText(dto.description) : dto.description,
        startDate: new Date(dto.startDate),
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        isCurrent: dto.isCurrent || false,
      },
    });
  }

  async updateEducation(userId: number, eduId: number, dto: EducationDto) {
    const profile = await this.prisma.profile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException('Perfil no encontrado');

    const edu = await this.prisma.education.findFirst({
      where: { id: eduId, profileId: profile.id },
    });
    if (!edu) throw new NotFoundException('Educación no encontrada');

    await this.assertValidCatalogValue(EDUCATION_CATALOG_KEYS.educationType, dto.educationType, 'El tipo de formación');
    await this.assertValidCatalogValue(EDUCATION_CATALOG_KEYS.formationLevel, dto.formationLevel, 'El nivel de formación');

    return this.prisma.education.update({
      where: { id: eduId },
      data: {
        ...(dto.institution && { institution: titleCaseText(dto.institution) }),
        ...(dto.degree && { degree: titleCaseText(dto.degree) }),
        ...(dto.fieldOfStudy !== undefined && { fieldOfStudy: dto.fieldOfStudy ? titleCaseText(dto.fieldOfStudy) : dto.fieldOfStudy }),
        ...(dto.educationType && { educationType: dto.educationType }),
        ...(dto.formationLevel !== undefined && {
          formationLevel: dto.formationLevel,
          customFormationLevel: dto.formationLevel === 'Otro' ? dto.customFormationLevel : null,
        }),
        ...(dto.description !== undefined && { description: dto.description ? trimText(dto.description) : dto.description }),
        ...(dto.startDate && { startDate: new Date(dto.startDate) }),
        ...(dto.endDate !== undefined && { endDate: dto.endDate ? new Date(dto.endDate) : null }),
        ...(dto.isCurrent !== undefined && { isCurrent: dto.isCurrent }),
      },
    });
  }

  async removeEducation(userId: number, eduId: number) {
    const profile = await this.prisma.profile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException('Perfil no encontrado');

    const edu = await this.prisma.education.findFirst({
      where: { id: eduId, profileId: profile.id },
    });
    if (!edu) throw new NotFoundException('Educación no encontrada');

    await this.prisma.education.delete({ where: { id: eduId } });
    return { message: 'Educación eliminada' };
  }
}
