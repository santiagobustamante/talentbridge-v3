import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService, UserRole, NotificationType, JobOfferStatus } from '@app/database';
import { computeSkillMatch } from '@app/contracts';
import { titleCaseText, trimText } from '@app/common';
import { CreateJobOfferDto, UpdateJobOfferDto } from './dto/create-job-offer.dto';

/** Debajo de este % de coincidencia con los requisitos, no vale la pena alertar al candidato — sería ruido. */
const JOB_MATCH_ALERT_THRESHOLD = 50;

// Alias del enum real de Prisma (en vez de los `'PUBLISHED' as any` que había
// antes) — mismos nombres para no tocar el resto del archivo, pero ahora
// TypeScript sí valida que coincidan con los valores reales del enum.
const { PUBLISHED, DRAFT, CLOSED, ARCHIVED } = JobOfferStatus;
// string[] (no JobOfferStatus[]) porque se compara contra un query param
// arbitrario (string) para decidir si es un status válido, no al revés.
const ALL_STATUSES: string[] = [PUBLISHED, DRAFT, CLOSED, ARCHIVED];

/** Valida que el salario máximo no sea menor al mínimo cuando se informan los dos — misma regla que ya aplica el formulario del frontend, repetida acá porque el backend no confía solo en esa validación de cliente. */
function assertValidSalaryRange(salaryMin?: number, salaryMax?: number): void {
  if (salaryMin != null && salaryMax != null && salaryMax < salaryMin) {
    throw new BadRequestException('El salario máximo no puede ser menor que el salario mínimo');
  }
}

@Injectable()
export class JobsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Trae una oferta y valida que pertenezca a la empresa autenticada — chequeo que se repetía al principio de casi todos los métodos de escritura de este service. */
  private async getOwnedJobOrThrow(companyUserId: number, jobId: number) {
    const job = await this.prisma.jobOffer.findUnique({ where: { id: jobId } });
    if (!job) throw new NotFoundException('Oferta no encontrada');
    if (job.companyId !== companyUserId) throw new ForbiddenException('No autorizado');
    return job;
  }

  async getCompanyJobs(companyUserId: number, status?: string) {
    const where: any = { companyId: companyUserId };
    // Un status inválido en el query param antes llegaba tal cual al `where`
    // de Prisma y explotaba con un error crudo (el campo es un enum en la
    // base) — se ignora en vez de filtrar, mismo criterio que ya usa
    // `ApplicationsService.getMyApplications` para su propio filtro de status.
    if (status && ALL_STATUSES.includes(status)) where.status = status;

    return this.prisma.jobOffer.findMany({
      where,
      include: {
        _count: { select: { applications: true } },
        company: {
          select: {
            companyProfile: { select: { companyName: true, logoUrl: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getCompanyJob(companyUserId: number, jobId: number) {
    const job = await this.prisma.jobOffer.findFirst({
      where: { id: jobId, companyId: companyUserId },
      include: {
        _count: { select: { applications: true } },
        company: {
          select: {
            companyProfile: { select: { companyName: true, logoUrl: true } },
          },
        },
      },
    });
    if (!job) throw new NotFoundException('Oferta no encontrada');
    return job;
  }

  async createJob(companyUserId: number, dto: CreateJobOfferDto) {
    assertValidSalaryRange(dto.salaryMin, dto.salaryMax);
    return this.prisma.jobOffer.create({
      data: {
        companyId: companyUserId,
        title: titleCaseText(dto.title),
        description: trimText(dto.description),
        requirements: dto.requirements ? trimText(dto.requirements) : dto.requirements,
        responsibilities: dto.responsibilities ? trimText(dto.responsibilities) : dto.responsibilities,
        // Sin titleCaseText: viene del catálogo DIVIPOLA con su casing
        // oficial (incluye conectores en minúscula, ej. "San José de la Montaña").
        city: dto.city ? trimText(dto.city) : dto.city,
        modality: dto.modality,
        contractType: dto.contractType,
        customContractType: dto.customContractType,
        workload: dto.workload,
        customWorkload: dto.customWorkload,
        salaryMin: dto.salaryMin,
        salaryMax: dto.salaryMax,
        currency: dto.currency || 'COP',
        skillsRequired: dto.skillsRequired
          ? Array.isArray(dto.skillsRequired) ? dto.skillsRequired.join(',') : dto.skillsRequired
          : undefined,
        status: DRAFT,
      },
    });
  }

  async updateJob(companyUserId: number, jobId: number, dto: UpdateJobOfferDto) {
    const job = await this.getOwnedJobOrThrow(companyUserId, jobId);

    // Se valida el rango efectivo (lo que llega en el PATCH combinado con lo
    // que ya tenía la oferta), no solo los campos presentes en este body —
    // un PATCH que solo manda `salaryMax` igual debe chocar contra el
    // `salaryMin` ya guardado si el resultado quedaría invertido.
    assertValidSalaryRange(
      dto.salaryMin !== undefined ? dto.salaryMin : (job.salaryMin ?? undefined),
      dto.salaryMax !== undefined ? dto.salaryMax : (job.salaryMax ?? undefined),
    );

    const updateData: any = {};
    if (dto.title !== undefined) updateData.title = titleCaseText(dto.title);
    if (dto.description !== undefined) updateData.description = trimText(dto.description);
    if (dto.requirements !== undefined) updateData.requirements = dto.requirements ? trimText(dto.requirements) : dto.requirements;
    if (dto.responsibilities !== undefined) updateData.responsibilities = dto.responsibilities ? trimText(dto.responsibilities) : dto.responsibilities;
    if (dto.city !== undefined) updateData.city = dto.city ? trimText(dto.city) : dto.city;
    if (dto.modality !== undefined) updateData.modality = dto.modality;
    if (dto.contractType !== undefined) updateData.contractType = dto.contractType;
    if (dto.customContractType !== undefined) updateData.customContractType = dto.customContractType;
    if (dto.workload !== undefined) updateData.workload = dto.workload;
    if (dto.customWorkload !== undefined) updateData.customWorkload = dto.customWorkload;
    if (dto.salaryMin !== undefined) updateData.salaryMin = dto.salaryMin;
    if (dto.salaryMax !== undefined) updateData.salaryMax = dto.salaryMax;
    if (dto.currency !== undefined) updateData.currency = dto.currency;
    if (dto.skillsRequired !== undefined) {
      updateData.skillsRequired = Array.isArray(dto.skillsRequired)
        ? dto.skillsRequired.join(',')
        : dto.skillsRequired;
    }

    return this.prisma.jobOffer.update({ where: { id: jobId }, data: updateData });
  }

  async deleteJob(companyUserId: number, jobId: number) {
    await this.getOwnedJobOrThrow(companyUserId, jobId);

    await this.prisma.jobOffer.delete({ where: { id: jobId } });
    return { message: 'Oferta eliminada' };
  }

  async publishJob(companyUserId: number, jobId: number) {
    const job = await this.getOwnedJobOrThrow(companyUserId, jobId);
    if (!job.title || !job.description) throw new BadRequestException('La oferta necesita título y descripción');
    // Espeja las transiciones que expone la UI (company-jobs.component.html):
    // el botón "Publicar"/"Republicar" solo aparece en DRAFT o CLOSED. Una
    // oferta ARCHIVED tiene que pasar por "Restaurar" (→ DRAFT) primero.
    if (job.status !== DRAFT && job.status !== CLOSED) {
      throw new BadRequestException('Solo se puede publicar una oferta en borrador o cerrada');
    }

    const published = await this.prisma.jobOffer.update({
      where: { id: jobId },
      // `closedAt: null` limpia la fecha de cierre de un ciclo anterior —
      // sin esto, republicar una oferta CLOSED dejaba "closedAt" con la
      // fecha del cierre viejo aunque la oferta ya estuviera activa de nuevo.
      data: { status: PUBLISHED, publishedAt: new Date(), closedAt: null },
    });

    await this.notifyMatchingCandidates(published);

    return published;
  }

  /**
   * Al publicar una vacante, alerta (notificación in-app tipo JOB_MATCH) a los
   * candidatos cuyo perfil matchea razonablemente los requisitos — mismo
   * `computeSkillMatch` que usa el resto de la plataforma para el % de match.
   * Si la oferta no pide ninguna skill puntual, no hay "match" real que avisar
   * (todo el mundo "matchea" trivialmente) — se omite para no generar ruido.
   */
  private async notifyMatchingCandidates(job: { id: number; title: string; skillsRequired: string | null }): Promise<void> {
    if (!job.skillsRequired?.trim()) return;

    const profiles = await this.prisma.profile.findMany({
      where: { isPublished: true },
      select: {
        userId: true,
        skills: { select: { normalizedName: true, level: true } },
      },
    });

    const matchingUserIds = profiles
      .map((p) => ({ userId: p.userId, match: computeSkillMatch(job.skillsRequired, p.skills) }))
      .filter((p) => p.match.matchPercent >= JOB_MATCH_ALERT_THRESHOLD)
      .map((p) => p.userId);

    if (matchingUserIds.length === 0) return;

    await this.prisma.notification.createMany({
      data: matchingUserIds.map((userId) => ({
        userId,
        type: NotificationType.JOB_MATCH,
        title: 'Vacante que podría interesarte',
        body: `"${job.title}" coincide con tu perfil. Revísala antes de que se llene.`,
        link: `/app/jobs?jobId=${job.id}`,
      })),
    });
  }

  async closeJob(companyUserId: number, jobId: number) {
    const job = await this.getOwnedJobOrThrow(companyUserId, jobId);
    if (job.status !== PUBLISHED) {
      throw new BadRequestException('Solo se puede cerrar una oferta publicada');
    }
    return this.prisma.jobOffer.update({
      where: { id: jobId },
      data: { status: CLOSED, closedAt: new Date() },
    });
  }

  async archiveJob(companyUserId: number, jobId: number) {
    const job = await this.getOwnedJobOrThrow(companyUserId, jobId);
    // La UI solo ofrece "Archivar" para ofertas en DRAFT (company-jobs.component.html) — una PUBLISHED debe cerrarse primero.
    if (job.status !== DRAFT) {
      throw new BadRequestException('Solo se puede archivar una oferta en borrador');
    }
    return this.prisma.jobOffer.update({ where: { id: jobId }, data: { status: ARCHIVED } });
  }

  async restoreJob(companyUserId: number, jobId: number) {
    const job = await this.getOwnedJobOrThrow(companyUserId, jobId);
    if (job.status !== ARCHIVED) {
      throw new BadRequestException('Solo se puede restaurar una oferta archivada');
    }
    return this.prisma.jobOffer.update({ where: { id: jobId }, data: { status: DRAFT } });
  }

  async getCandidateJobs(candidateUserId: number, query?: any) {
    const profile = await this.prisma.profile.findUnique({ where: { userId: candidateUserId } });
    const candidateSkills = profile
      ? await this.prisma.skill.findMany({ where: { profileId: profile.id }, select: { normalizedName: true, level: true } })
      : [];

    // parseInt(...) || fallback en vez de `+query.page`: un query param no
    // numérico (ej. "?page=abc") con `+` da NaN y rompía el `skip`/`take`
    // de Prisma más abajo con un error crudo en vez de simplemente usar la
    // página por defecto.
    const page = Math.max(1, parseInt(query?.page, 10) || 1);
    const limit = Math.min(Math.max(1, parseInt(query?.limit, 10) || 20), 100);

    const where: any = { status: PUBLISHED };
    if (query?.q) {
      const q = query.q.toLowerCase();
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ];
    }
    if (query?.city) where.city = { contains: query.city, mode: 'insensitive' };
    // El frontend ya mandaba estos dos filtros (candidate-jobs.component.ts),
    // pero acá nunca se leían del query -- elegir una modalidad o un tipo de
    // contrato no tenía ningún efecto en los resultados.
    if (query?.modality) where.modality = query.modality;
    if (query?.contractType) where.contractType = query.contractType;

    const [jobs, total] = await Promise.all([
      this.prisma.jobOffer.findMany({
        where,
        include: {
          company: {
            select: { id: true, companyProfile: { select: { companyName: true, logoUrl: true, city: true } } },
          },
          applications: {
            where: { candidateId: candidateUserId },
            select: { id: true, status: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.jobOffer.count({ where }),
    ]);

    const data = jobs.map((job) => {
      const match = computeSkillMatch(job.skillsRequired, candidateSkills);
      const hasApplied = job.applications.length > 0;

      return {
        ...job,
        requiredSkillsList: match.breakdown.map((b) => b.name.toLocaleLowerCase('es-CO')),
        matchedSkills: match.breakdown.filter((b) => b.status !== 'missing').map((b) => b.name.toLocaleLowerCase('es-CO')),
        canApplyBySkills: match.hasAnyMatch,
        skillMatch: match,
        hasApplied,
        applicationStatus: job.applications[0]?.status || null,
        applicationId: job.applications[0]?.id || null,
      };
    });

    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getJobById(candidateUserId: number, jobId: number) {
    const job = await this.prisma.jobOffer.findUnique({
      where: { id: jobId },
      include: {
        company: {
          select: {
            id: true,
            companyProfile: { select: { companyName: true, logoUrl: true, city: true, description: true, websiteUrl: true } },
          },
        },
        applications: {
          where: { candidateId: candidateUserId },
          select: { id: true, status: true },
        },
      },
    });
    if (!job) throw new NotFoundException('Oferta no encontrada');

    // Sin este chequeo, un candidato podía ver el detalle de cualquier
    // oferta adivinando su id numérico en la URL, incluidas las que la
    // empresa nunca publicó (DRAFT) o ya cerró/archivó — el listado
    // (`getCandidateJobs`) ya filtra por PUBLISHED, pero este endpoint de
    // detalle no lo hacía. Se deja pasar igual si el candidato ya se
    // postuló (mientras estaba publicada), para no romper el detalle desde
    // "mis postulaciones" aunque la oferta haya cambiado de estado después.
    const hasApplied = job.applications.length > 0;
    if (job.status !== PUBLISHED && !hasApplied) {
      throw new NotFoundException('Oferta no encontrada');
    }

    const profile = await this.prisma.profile.findUnique({ where: { userId: candidateUserId } });
    const candidateSkills = profile
      ? await this.prisma.skill.findMany({ where: { profileId: profile.id }, select: { normalizedName: true, level: true } })
      : [];

    const match = computeSkillMatch(job.skillsRequired, candidateSkills);

    return {
      ...job,
      requiredSkillsList: match.breakdown.map((b) => b.name.toLocaleLowerCase('es-CO')),
      matchedSkills: match.breakdown.filter((b) => b.status !== 'missing').map((b) => b.name.toLocaleLowerCase('es-CO')),
      canApplyBySkills: match.hasAnyMatch,
      skillMatch: match,
      hasApplied: job.applications.length > 0,
    };
  }
}
