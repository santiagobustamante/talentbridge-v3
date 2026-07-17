import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@app/database';

const PUBLISHED = 'PUBLISHED' as any;
const DRAFT = 'DRAFT' as any;
const CLOSED = 'CLOSED' as any;

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getCandidateDashboard(userId: number) {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
      include: { skills: true, experiences: true, educations: true, projects: true },
    });
    if (!profile) throw new NotFoundException('Perfil no encontrado');

    const applicationsCount = await this.prisma.jobApplication.count({ where: { candidateId: userId } });
    const profileViewsCount = await this.prisma.profileView.count({ where: { profileId: profile.id } });

    const recentApplications = await this.prisma.jobApplication.findMany({
      where: { candidateId: userId },
      include: {
        jobOffer: {
          select: { id: true, title: true, city: true, modality: true, status: true, company: { select: { companyProfile: { select: { companyName: true } } } } },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    const recentJobs = await this.prisma.jobOffer.findMany({
      where: { status: PUBLISHED },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true, title: true, city: true, modality: true, contractType: true,
        customContractType: true, workload: true, customWorkload: true,
        skillsRequired: true, salaryMin: true, salaryMax: true, currency: true,
        publishedAt: true, createdAt: true,
        company: { select: { companyProfile: { select: { companyName: true, logoUrl: true } } } },
      },
    });

    const conversations = await this.prisma.conversation.findMany({ where: { candidateId: userId }, select: { id: true } });
    const unreadMessages = conversations.length > 0
      ? await this.prisma.chatMessage.count({
          where: { conversationId: { in: conversations.map((c) => c.id) }, senderId: { not: userId }, readAt: null },
        })
      : 0;

    const recentConversations = await this.prisma.conversation.findMany({
      where: { candidateId: userId },
      orderBy: { lastMessageAt: 'desc' },
      take: 3,
      include: {
        company: { select: { companyProfile: { select: { companyName: true, logoUrl: true } } } },
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });

    const hasBasicInfo = !!(profile.fullName && profile.professionalTitle);
    let profilePercent = 0;
    if (hasBasicInfo) profilePercent += 25;
    if (profile.skills.length > 0) profilePercent += 25;
    if (profile.experiences.length > 0 || profile.educations.length > 0) profilePercent += 25;
    if (profile.projects.length > 0) profilePercent += 25;

    let nextStep = { label: 'Completa tu perfil', action: 'edit_profile', route: '/app/profile' };
    if (profilePercent >= 100) nextStep = { label: 'Explora ofertas de trabajo', action: 'explore_jobs', route: '/app/jobs' };
    else if (profile.skills.length === 0) nextStep = { label: 'Agrega habilidades', action: 'add_skills', route: '/app/skills' };
    else if (!profile.fullName) nextStep = { label: 'Completa tu nombre', action: 'edit_profile', route: '/app/profile' };
    else if (applicationsCount === 0) nextStep = { label: 'Aplica a tu primera oferta', action: 'explore_jobs', route: '/app/jobs' };

    return {
      profilePercent,
      skillsCount: profile.skills.length,
      projectsCount: profile.projects.length,
      applicationsCount,
      unreadMessagesCount: unreadMessages,
      profileViewsCount,
      isPublished: profile.isPublished,
      recentJobs: recentJobs.map((j) => ({
        id: j.id, title: j.title, city: j.city, modality: j.modality, contractType: j.contractType,
        customContractType: j.customContractType, workload: j.workload, customWorkload: j.customWorkload,
        skillsRequired: j.skillsRequired, salaryMin: j.salaryMin, salaryMax: j.salaryMax, currency: j.currency,
        publishedAt: j.publishedAt, createdAt: j.createdAt,
        company: j.company?.companyProfile ? { companyName: j.company.companyProfile.companyName, logoUrl: j.company.companyProfile.logoUrl } : null,
      })),
      recentApplications: recentApplications.map((a) => ({
        id: a.id, jobId: a.jobOffer?.id || 0, jobTitle: a.jobOffer?.title || '', status: a.status, createdAt: a.createdAt.toISOString(),
      })),
      recentConversations: recentConversations.map((c) => ({
        id: c.id, companyName: c.company?.companyProfile?.companyName,
        logoUrl: c.company?.companyProfile?.logoUrl,
        lastMessage: c.messages[0]?.body || null, lastMessageAt: c.lastMessageAt?.toISOString() || null,
      })),
      nextStep,
    };
  }

  async getCompanyDashboard(userId: number) {
    const companyProfile = await this.prisma.companyProfile.findUnique({ where: { userId } });
    if (!companyProfile) throw new NotFoundException('Perfil de empresa no encontrado');

    const totalJobs = await this.prisma.jobOffer.count({ where: { companyId: userId } });
    const publishedJobs = await this.prisma.jobOffer.count({ where: { companyId: userId, status: PUBLISHED } });
    const draftJobs = await this.prisma.jobOffer.count({ where: { companyId: userId, status: DRAFT } });
    const closedJobs = await this.prisma.jobOffer.count({ where: { companyId: userId, status: CLOSED } });
    const applicationsCount = await this.prisma.jobApplication.count({ where: { jobOffer: { companyId: userId } } });

    const publishedCandidates = await this.prisma.profile.count({ where: { isPublished: true } });

    const recentJobs = await this.prisma.jobOffer.findMany({
      where: { companyId: userId },
      orderBy: { updatedAt: 'desc' },
      take: 5,
      include: { _count: { select: { applications: true } } },
    });

    const recentApplications = await this.prisma.jobApplication.findMany({
      where: { jobOffer: { companyId: userId } },
      include: {
        jobOffer: { select: { id: true, title: true } },
        candidate: { select: { id: true, profile: { select: { fullName: true, slug: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    const conversations = await this.prisma.conversation.findMany({ where: { companyId: userId }, select: { id: true } });
    const unreadMessages = conversations.length > 0
      ? await this.prisma.chatMessage.count({
          where: { conversationId: { in: conversations.map((c) => c.id) }, senderId: { not: userId }, readAt: null },
        })
      : 0;

    const recentConversations = await this.prisma.conversation.findMany({
      where: { companyId: userId },
      orderBy: { lastMessageAt: 'desc' },
      take: 3,
      include: {
        candidate: { select: { profile: { select: { fullName: true } } } },
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });

    return {
      companyName: companyProfile.companyName,
      logoUrl: companyProfile.logoUrl,
      candidatesCount: publishedCandidates,
      publishedJobsCount: publishedJobs,
      draftJobsCount: draftJobs,
      closedJobsCount: closedJobs,
      totalJobsCount: totalJobs,
      applicationsCount,
      unreadMessagesCount: unreadMessages,
      recentJobs: recentJobs.map((j) => ({
        id: j.id, title: j.title, city: j.city, modality: j.modality,
        status: j.status, applicationsCount: j._count.applications, publishedAt: j.publishedAt?.toISOString() || null,
      })),
      recentApplications: recentApplications.map((a) => ({
        id: a.id, jobId: a.jobOffer.id, jobTitle: a.jobOffer.title,
        candidateName: a.candidate?.profile?.fullName || null, candidateSlug: a.candidate?.profile?.slug || null,
        candidateId: a.candidate?.id || null, status: a.status, createdAt: a.createdAt.toISOString(),
      })),
      recentConversations: recentConversations.map((c) => ({
        id: c.id, candidateName: c.candidate?.profile?.fullName,
        lastMessage: c.messages[0]?.body || null, lastMessageAt: c.lastMessageAt?.toISOString() || null,
      })),
    };
  }
}
