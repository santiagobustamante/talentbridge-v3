import { Injectable } from '@nestjs/common';
import { PrismaService } from '@app/database';

interface AssistantResponse {
  reply: string;
  role: string;
  intent: string;
  actions: { label: string; route: string }[];
  results: any[];
}

@Injectable()
export class AssistantService {
  constructor(private readonly prisma: PrismaService) {}

  async processMessage(userId: number, role: string, message: string): Promise<AssistantResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: { include: { skills: true } }, companyProfile: true },
    });

    const userName = user?.profile?.fullName || user?.companyProfile?.companyName || 'Usuario';
    const msg = message.toLowerCase().trim();

    if (role === 'CANDIDATE') {
      return this.candidateResponses(userId, userName, msg, user);
    } else {
      return this.companyResponses(userId, userName, msg, user);
    }
  }

  private async candidateResponses(userId: number, userName: string, msg: string, user: any): Promise<AssistantResponse> {
    const stats = await this.getCandidateStats(userId);
    const profile = user?.profile;
    const slug = profile?.slug;

    if (msg.includes('hola') || msg.includes('ayuda') || msg.includes('qué puedes') || msg === '') {
      return {
        reply: `¡Hola ${userName}! 👋 Soy Joaquín, tu asistente en TalentBridge. Puedo ayudarte con tu perfil, buscar ofertas de trabajo, ver tus postulaciones, revisar mensajes y más. ¿En qué te ayudo hoy?`,
        role: 'CANDIDATE',
        intent: 'greeting',
        actions: [
          { label: 'Editar perfil', route: '/app/profile' },
          { label: 'Ver ofertas', route: '/app/jobs' },
          { label: 'Dashboard', route: '/app/inicio' },
        ],
        results: profile ? [{ fullName: profile.fullName, professionalTitle: profile.professionalTitle, city: profile.city, slug: profile.slug }] : [],
      };
    }

    if (msg.includes('perfil') || msg.includes('completado')) {
      const hasBasicInfo = !!(profile?.fullName && profile?.professionalTitle);
      let completion = 0;
      if (hasBasicInfo) completion += 25;
      if (stats.skillsCount > 0) completion += 25;
      if (stats.experiencesCount > 0 || stats.educationsCount > 0) completion += 25;
      if (stats.projectsCount > 0) completion += 25;

      const tips: string[] = [];
      if (!profile?.fullName) tips.push('Agrega tu nombre completo');
      if (stats.skillsCount === 0) tips.push('Agrega al menos 3 habilidades');
      if (!profile?.professionalTitle) tips.push('Define tu título profesional');

      return {
        reply: `📊 Tu perfil está al ${completion}% completado.\n\n${tips.length > 0 ? '📝 Recomendaciones:\n- ' + tips.join('\n- ') : '✅ ¡Tu perfil está completo!'}`,
        role: 'CANDIDATE',
        intent: 'profile_check',
        actions: [
          { label: 'Editar perfil', route: '/app/profile' },
          { label: 'Ver perfil público', route: slug ? `/portfolio/${slug}` : '/app/profile' },
        ],
        results: profile ? [{ fullName: profile.fullName, professionalTitle: profile.professionalTitle, city: profile.city, slug: profile.slug, skills: profile.skills?.map((s: any) => s.name) }] : [],
      };
    }

    if (msg.includes('oferta') || msg.includes('trabajo') || msg.includes('vacante')) {
      const availableJobs = await this.prisma.jobOffer.count({ where: { status: 'PUBLISHED' } });
      return {
        reply: `💼 Actualmente hay ${availableJobs} ofertas de trabajo publicadas. Has aplicado a ${stats.applicationsCount} ofertas. Puedes explorar todas las ofertas desde /app/jobs`,
        role: 'CANDIDATE',
        intent: 'jobs_info',
        actions: [{ label: 'Ver ofertas', route: '/app/jobs' }],
        results: [],
      };
    }

    if (msg.includes('postulacion') || msg.includes('aplicacion')) {
      return {
        reply: `📋 Tienes ${stats.applicationsCount} postulaciones activas. Para aplicar a una oferta, asegúrate de tener al menos una habilidad que coincida con los requisitos.`,
        role: 'CANDIDATE',
        intent: 'applications_info',
        actions: [{ label: 'Ver postulaciones', route: '/app/jobs' }],
        results: [],
      };
    }

    if (msg.includes('mensaje') || msg.includes('chat')) {
      return {
        reply: `💬 Tienes ${stats.unreadMessages} mensajes sin leer. Puedes revisar tus conversaciones desde la sección de mensajes.`,
        role: 'CANDIDATE',
        intent: 'messages_info',
        actions: [{ label: 'Ver mensajes', route: '/app/messages' }],
        results: [],
      };
    }

    if (msg.includes('dashboard') || msg.includes('inicio')) {
      return {
        reply: `📊 Dashboard de ${userName}:\n- Perfil: ${profile?.fullName ? 'Completándose' : 'Incompleto'}\n- Habilidades: ${stats.skillsCount}\n- Postulaciones: ${stats.applicationsCount}\n- Mensajes sin leer: ${stats.unreadMessages}`,
        role: 'CANDIDATE',
        intent: 'dashboard',
        actions: [{ label: 'Ir al dashboard', route: '/app/inicio' }],
        results: profile ? [{ fullName: profile.fullName, professionalTitle: profile.professionalTitle, city: profile.city, slug: profile.slug, skills: profile.skills?.map((s: any) => s.name) }] : [],
      };
    }

    return {
      reply: `Entiendo tu pregunta sobre "${msg}". Puedo ayudarte con tu perfil, ofertas de trabajo, postulaciones, mensajes y dashboard. ¿En qué te ayudo?`,
      role: 'CANDIDATE',
      intent: 'unknown',
      actions: [
        { label: 'Dashboard', route: '/app/inicio' },
        { label: 'Ver ofertas', route: '/app/jobs' },
      ],
      results: [],
    };
  }

  private async companyResponses(userId: number, userName: string, msg: string, user: any): Promise<AssistantResponse> {
    const stats = await this.getCompanyStats(userId);

    if (msg.includes('hola') || msg.includes('ayuda') || msg.includes('qué puedes') || msg === '') {
      return {
        reply: `¡Hola ${userName}! 👋 Soy Joaquín, tu asistente en TalentBridge. Puedo ayudarte a buscar candidatos, gestionar ofertas, revisar postulaciones y más. ¿En qué te ayudo?`,
        role: 'COMPANY',
        intent: 'greeting',
        actions: [
          { label: 'Buscar candidatos', route: '/company/candidates' },
          { label: 'Ver ofertas', route: '/company/jobs' },
          { label: 'Dashboard', route: '/company/dashboard' },
        ],
        results: [],
      };
    }

    if (msg.includes('candidato') || msg.includes('buscar') || msg.includes('talento')) {
      return {
        reply: `🔍 Puedes buscar candidatos por ciudad, profesión o habilidades desde la sección de búsqueda. Usa filtros como ciudad, profesión o habilidades específicas.`,
        role: 'COMPANY',
        intent: 'search_candidates',
        actions: [{ label: 'Buscar candidatos', route: '/company/candidates' }],
        results: [],
      };
    }

    if (msg.includes('oferta') || msg.includes('vacante') || msg.includes('publicar')) {
      return {
        reply: `📋 Tienes ${stats.activeJobs} ofertas activas (${stats.totalJobs} en total). Para crear una nueva oferta ve a /company/jobs, completa los campos y publícala.`,
        role: 'COMPANY',
        intent: 'jobs_info',
        actions: [{ label: 'Gestionar ofertas', route: '/company/jobs' }],
        results: [],
      };
    }

    if (msg.includes('postulacion') || msg.includes('aplicante')) {
      return {
        reply: `📊 Tienes ${stats.pendingApplications} postulaciones pendientes de revisar (${stats.totalApplications} en total). Puedes cambiar el estado de cada una desde tus ofertas.`,
        role: 'COMPANY',
        intent: 'applications_info',
        actions: [{ label: 'Ver ofertas', route: '/company/jobs' }],
        results: [],
      };
    }

    if (msg.includes('mensaje') || msg.includes('chat')) {
      return {
        reply: `💬 Tienes ${stats.unreadMessages} mensajes sin leer. Puedes chatear con candidatos desde la sección de mensajes.`,
        role: 'COMPANY',
        intent: 'messages_info',
        actions: [{ label: 'Ver mensajes', route: '/company/messages' }],
        results: [],
      };
    }

    if (msg.includes('dashboard') || msg.includes('inicio') || msg.includes('resumen')) {
      return {
        reply: `📊 Dashboard de ${userName}:\n- Ofertas activas: ${stats.activeJobs}\n- Total postulaciones: ${stats.totalApplications}\n- Pendientes: ${stats.pendingApplications}\n- Mensajes sin leer: ${stats.unreadMessages}`,
        role: 'COMPANY',
        intent: 'dashboard',
        actions: [{ label: 'Ir al dashboard', route: '/company/dashboard' }],
        results: [],
      };
    }

    return {
      reply: `Entiendo tu pregunta sobre "${msg}". Puedo ayudarte con búsqueda de candidatos, ofertas de trabajo, postulaciones, mensajes y dashboard. ¿En qué te ayudo?`,
      role: 'COMPANY',
      intent: 'unknown',
      actions: [
        { label: 'Dashboard', route: '/company/dashboard' },
        { label: 'Buscar candidatos', route: '/company/candidates' },
      ],
      results: [],
    };
  }

  private async getCandidateStats(userId: number) {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
      include: { skills: true, experiences: true, educations: true, projects: true },
    });

    const applicationsCount = await this.prisma.jobApplication.count({ where: { candidateId: userId } });

    const conversations = await this.prisma.conversation.findMany({
      where: { candidateId: userId },
      select: { id: true },
    });

    const unreadMessages = conversations.length > 0
      ? await this.prisma.chatMessage.count({
          where: { conversationId: { in: conversations.map((c) => c.id) }, senderId: { not: userId }, readAt: null },
        })
      : 0;

    return {
      skillsCount: profile?.skills.length || 0,
      experiencesCount: profile?.experiences.length || 0,
      educationsCount: profile?.educations.length || 0,
      projectsCount: profile?.projects.length || 0,
      applicationsCount,
      unreadMessages,
    };
  }

  private async getCompanyStats(userId: number) {
    const totalJobs = await this.prisma.jobOffer.count({ where: { companyId: userId } });
    const activeJobs = await this.prisma.jobOffer.count({ where: { companyId: userId, status: 'PUBLISHED' } });
    const totalApplications = await this.prisma.jobApplication.count({ where: { jobOffer: { companyId: userId } } });
    const pendingApplications = await this.prisma.jobApplication.count({
      where: { jobOffer: { companyId: userId }, status: 'PENDING' },
    });

    const conversations = await this.prisma.conversation.findMany({
      where: { companyId: userId },
      select: { id: true },
    });

    const unreadMessages = conversations.length > 0
      ? await this.prisma.chatMessage.count({
          where: { conversationId: { in: conversations.map((c) => c.id) }, senderId: { not: userId }, readAt: null },
        })
      : 0;

    return { totalJobs, activeJobs, totalApplications, pendingApplications, unreadMessages };
  }
}
