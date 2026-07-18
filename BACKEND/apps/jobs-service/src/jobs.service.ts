import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService, UserRole } from '@app/database';
import { computeSkillMatch } from '@app/contracts';
import { titleCaseText, trimText } from '@app/common';

const PUBLISHED = 'PUBLISHED' as any;
const DRAFT = 'DRAFT' as any;
const CLOSED = 'CLOSED' as any;
const ARCHIVED = 'ARCHIVED' as any;

@Injectable()
export class JobsService {
  constructor(private readonly prisma: PrismaService) {}

  async getCompanyJobs(companyUserId: number, status?: string) {
    const where: any = { companyId: companyUserId };
    if (status) where.status = status;

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

  async createJob(companyUserId: number, dto: any) {
    return this.prisma.jobOffer.create({
      data: {
        companyId: companyUserId,
        title: titleCaseText(dto.title),
        description: trimText(dto.description),
        requirements: dto.requirements ? trimText(dto.requirements) : dto.requirements,
        responsibilities: dto.responsibilities ? trimText(dto.responsibilities) : dto.responsibilities,
        city: dto.city ? titleCaseText(dto.city) : dto.city,
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

  async updateJob(companyUserId: number, jobId: number, dto: any) {
    const job = await this.prisma.jobOffer.findUnique({ where: { id: jobId } });
    if (!job) throw new NotFoundException('Oferta no encontrada');
    if (job.companyId !== companyUserId) throw new ForbiddenException('No autorizado');

    const updateData: any = {};
    if (dto.title !== undefined) updateData.title = titleCaseText(dto.title);
    if (dto.description !== undefined) updateData.description = trimText(dto.description);
    if (dto.requirements !== undefined) updateData.requirements = dto.requirements ? trimText(dto.requirements) : dto.requirements;
    if (dto.responsibilities !== undefined) updateData.responsibilities = dto.responsibilities ? trimText(dto.responsibilities) : dto.responsibilities;
    if (dto.city !== undefined) updateData.city = dto.city ? titleCaseText(dto.city) : dto.city;
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
    const job = await this.prisma.jobOffer.findUnique({ where: { id: jobId } });
    if (!job) throw new NotFoundException('Oferta no encontrada');
    if (job.companyId !== companyUserId) throw new ForbiddenException('No autorizado');

    await this.prisma.jobOffer.delete({ where: { id: jobId } });
    return { message: 'Oferta eliminada' };
  }

  async publishJob(companyUserId: number, jobId: number) {
    const job = await this.prisma.jobOffer.findUnique({ where: { id: jobId } });
    if (!job) throw new NotFoundException('Oferta no encontrada');
    if (job.companyId !== companyUserId) throw new ForbiddenException('No autorizado');
    if (!job.title || !job.description) throw new BadRequestException('La oferta necesita título y descripción');

    return this.prisma.jobOffer.update({
      where: { id: jobId },
      data: { status: PUBLISHED, publishedAt: new Date() },
    });
  }

  async closeJob(companyUserId: number, jobId: number) {
    const job = await this.prisma.jobOffer.findUnique({ where: { id: jobId } });
    if (!job) throw new NotFoundException('Oferta no encontrada');
    if (job.companyId !== companyUserId) throw new ForbiddenException('No autorizado');
    return this.prisma.jobOffer.update({
      where: { id: jobId },
      data: { status: CLOSED, closedAt: new Date() },
    });
  }

  async archiveJob(companyUserId: number, jobId: number) {
    const job = await this.prisma.jobOffer.findUnique({ where: { id: jobId } });
    if (!job) throw new NotFoundException('Oferta no encontrada');
    if (job.companyId !== companyUserId) throw new ForbiddenException('No autorizado');
    return this.prisma.jobOffer.update({ where: { id: jobId }, data: { status: ARCHIVED } });
  }

  async restoreJob(companyUserId: number, jobId: number) {
    const job = await this.prisma.jobOffer.findUnique({ where: { id: jobId } });
    if (!job) throw new NotFoundException('Oferta no encontrada');
    if (job.companyId !== companyUserId) throw new ForbiddenException('No autorizado');
    return this.prisma.jobOffer.update({ where: { id: jobId }, data: { status: DRAFT } });
  }

  async getCandidateJobs(candidateUserId: number, query?: any) {
    const profile = await this.prisma.profile.findUnique({ where: { userId: candidateUserId } });
    const candidateSkills = profile
      ? await this.prisma.skill.findMany({ where: { profileId: profile.id }, select: { normalizedName: true, level: true } })
      : [];

    const page = query?.page ? +query.page : 1;
    const limit = Math.min(query?.limit ? +query.limit : 20, 100);

    const where: any = { status: PUBLISHED };
    if (query?.q) {
      const q = query.q.toLowerCase();
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ];
    }
    if (query?.city) where.city = { contains: query.city, mode: 'insensitive' };

    const [jobs, total] = await Promise.all([
      this.prisma.jobOffer.findMany({
        where,
        include: {
          company: {
            select: { companyProfile: { select: { companyName: true, logoUrl: true, city: true } } },
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
        requiredSkillsList: match.breakdown.map((b) => b.name.toLowerCase()),
        matchedSkills: match.breakdown.filter((b) => b.status !== 'missing').map((b) => b.name.toLowerCase()),
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

    const profile = await this.prisma.profile.findUnique({ where: { userId: candidateUserId } });
    const candidateSkills = profile
      ? await this.prisma.skill.findMany({ where: { profileId: profile.id }, select: { normalizedName: true, level: true } })
      : [];

    const match = computeSkillMatch(job.skillsRequired, candidateSkills);

    return {
      ...job,
      requiredSkillsList: match.breakdown.map((b) => b.name.toLowerCase()),
      matchedSkills: match.breakdown.filter((b) => b.status !== 'missing').map((b) => b.name.toLowerCase()),
      canApplyBySkills: match.hasAnyMatch,
      skillMatch: match,
      hasApplied: job.applications.length > 0,
    };
  }
}
