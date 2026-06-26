import { Injectable, NotFoundException, ForbiddenException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService, JobOfferStatus, JobApplicationStatus } from '@app/database';

@Injectable()
export class ApplicationsService {
  constructor(private readonly prisma: PrismaService) {}

  async apply(candidateUserId: number, jobId: number, coverMessage?: string) {
    const job = await this.prisma.jobOffer.findUnique({ where: { id: jobId } });
    if (!job) throw new NotFoundException('Oferta no encontrada');
    if (job.status !== JobOfferStatus.PUBLISHED) throw new BadRequestException('Esta oferta no está publicada');

    const profile = await this.prisma.profile.findUnique({ where: { userId: candidateUserId } });
    if (!profile) throw new BadRequestException('Completa tu perfil antes de aplicar');

    const existing = await this.prisma.jobApplication.findUnique({
      where: { jobOfferId_candidateId: { jobOfferId: jobId, candidateId: candidateUserId } },
    });
    if (existing) throw new ConflictException('Ya aplicaste a esta oferta');

    const requiredSkills = (job.skillsRequired || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);

    if (requiredSkills.length > 0) {
      const candidateSkills = (
        await this.prisma.skill.findMany({ where: { profileId: profile.id } })
      ).map((s) => s.normalizedName.toLowerCase());

      const hasMatch = requiredSkills.some((s) => candidateSkills.includes(s));
      if (!hasMatch) {
        throw new BadRequestException('No tienes al menos una habilidad que coincida con los requisitos de esta oferta');
      }
    }

    return this.prisma.jobApplication.create({
      data: {
        jobOfferId: jobId,
        candidateId: candidateUserId,
        coverMessage,
        status: JobApplicationStatus.PENDING,
      },
    });
  }

  async getMyApplications(candidateUserId: number) {
    return this.prisma.jobApplication.findMany({
      where: { candidateId: candidateUserId },
      include: {
        jobOffer: {
          select: {
            id: true,
            title: true,
            city: true,
            modality: true,
            status: true,
            skillsRequired: true,
            company: {
              select: {
                companyProfile: {
                  select: { companyName: true, logoUrl: true },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getJobApplications(companyUserId: number, jobId: number) {
    const job = await this.prisma.jobOffer.findUnique({ where: { id: jobId } });
    if (!job) throw new NotFoundException('Oferta no encontrada');
    if (job.companyId !== companyUserId) throw new ForbiddenException('No autorizado');

    return this.prisma.jobApplication.findMany({
      where: { jobOfferId: jobId },
      include: {
        candidate: {
          select: {
            id: true,
            email: true,
            profile: {
              select: {
                fullName: true,
                professionalTitle: true,
                city: true,
                slug: true,
                photoUrl: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateStatus(companyUserId: number, applicationId: number, newStatus: string) {
    const application = await this.prisma.jobApplication.findUnique({
      where: { id: applicationId },
      include: { jobOffer: true },
    });

    if (!application) throw new NotFoundException('Postulación no encontrada');
    if (application.jobOffer.companyId !== companyUserId) throw new ForbiddenException('No autorizado');

    const validStatuses = Object.values(JobApplicationStatus);
    if (!validStatuses.includes(newStatus as JobApplicationStatus)) {
      throw new BadRequestException('Estado no válido');
    }

    return this.prisma.jobApplication.update({
      where: { id: applicationId },
      data: { status: newStatus as JobApplicationStatus },
    });
  }
}
