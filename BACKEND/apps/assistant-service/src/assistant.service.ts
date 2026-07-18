import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@app/database';
import { DeepSeekService, DeepSeekChatMessage } from '@app/common';
import { computeSkillMatch } from '@app/contracts';
import { ChatHistoryItemDto } from './dto/assistant-message.dto';

interface AssistantResponse {
  reply: string;
  role: string;
  intent: string;
  actions: { label: string; route: string }[];
  results: any[];
}

interface AssistantLlmOutput {
  reply: string;
  actions?: { label: string; route: string }[];
  showProfileCard?: boolean;
  showCandidateMatches?: boolean;
}

interface CandidateCardData {
  fullName: string | null;
  professionalTitle: string | null;
  city: string | null;
  slug: string;
  skills?: string[];
}

const CANDIDATE_ROUTES: Record<string, string> = {
  '/app/inicio': 'Panel principal / dashboard del candidato',
  '/app/profile': 'Editar perfil profesional (nombre, título, resumen, contacto, redes)',
  '/app/skills': 'Agregar o editar habilidades',
  '/app/experience': 'Agregar o editar experiencia laboral',
  '/app/education': 'Agregar o editar educación/formación',
  '/app/projects': 'Agregar o editar proyectos del portafolio',
  '/app/jobs': 'Explorar ofertas de trabajo y ver postulaciones propias',
  '/app/messages': 'Mensajes/chat con empresas',
  '/app/cv-analysis': 'Subir y analizar la hoja de vida (CV)',
  '/app/public-view': 'Ver cómo se ve el portafolio público propio',
};

const COMPANY_ROUTES: Record<string, string> = {
  '/company/dashboard': 'Panel principal de la empresa',
  '/company/profile': 'Editar perfil de la empresa',
  '/company/candidates': 'Buscar candidatos por ciudad, profesión o habilidades',
  '/company/jobs': 'Crear y gestionar ofertas laborales, ver postulaciones',
  '/company/messages': 'Mensajes/chat con candidatos',
};

const FALLBACK_REPLY =
  'Ahora mismo no puedo responder — puede que el servicio de IA esté temporalmente no disponible. Intenta de nuevo en un momento.';

@Injectable()
export class AssistantService {
  private readonly logger = new Logger(AssistantService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly deepSeek: DeepSeekService,
  ) {}

  async processMessage(
    userId: number,
    role: string,
    message: string,
    history?: ChatHistoryItemDto[],
  ): Promise<AssistantResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: { include: { skills: true } }, companyProfile: true },
    });

    const isCandidate = role === 'CANDIDATE';
    const userName = user?.profile?.fullName || user?.companyProfile?.companyName || 'Usuario';
    const profile = user?.profile;

    const stats = isCandidate ? await this.getCandidateStats(userId) : await this.getCompanyStats(userId);
    const routes = isCandidate ? CANDIDATE_ROUTES : COMPANY_ROUTES;

    // Contexto real de compatibilidad — sin esto, Joaquín solo veía conteos
    // agregados y no podía responder preguntas concretas de matching ("¿qué
    // oferta me conviene más?", "¿qué candidato le sirve a esta vacante?").
    const companyMatches = isCandidate ? null : await this.getCompanyCandidateMatches(userId);
    const matchContext = isCandidate
      ? await this.getCandidateJobMatchesText(profile?.skills || [])
      : companyMatches!.text;

    const system = this.buildSystemPrompt(isCandidate, userName, stats, routes, matchContext);

    const messages: DeepSeekChatMessage[] = [
      ...(history || []).map((h) => ({ role: h.role, content: h.content }) as DeepSeekChatMessage),
      { role: 'user', content: message },
    ];

    let llmOutput: AssistantLlmOutput;
    try {
      llmOutput = await this.deepSeek.chatJson<AssistantLlmOutput>({ system, messages, maxTokens: 600 });
    } catch (err) {
      this.logger.error(`Fallo la llamada a DeepSeek para Joaquín: ${(err as Error).message}`);
      return { reply: FALLBACK_REPLY, role, intent: 'error', actions: [], results: [] };
    }

    const actions = (llmOutput.actions || [])
      .filter((a) => a && typeof a.route === 'string' && routes[a.route])
      .slice(0, 3)
      .map((a) => ({ label: a.label || routes[a.route], route: a.route }));

    let results: any[] = [];
    if (isCandidate && llmOutput.showProfileCard && profile) {
      results = [
        {
          fullName: profile.fullName,
          professionalTitle: profile.professionalTitle,
          city: profile.city,
          slug: profile.slug,
          skills: profile.skills?.map((s) => s.name),
        },
      ];
    } else if (!isCandidate && llmOutput.showCandidateMatches && companyMatches) {
      results = companyMatches.topCandidates;
    }

    return {
      reply: llmOutput.reply || FALLBACK_REPLY,
      role,
      intent: 'ai',
      actions,
      results,
    };
  }

  private buildSystemPrompt(
    isCandidate: boolean,
    userName: string,
    stats: Record<string, number>,
    routes: Record<string, string>,
    matchContext: string,
  ): string {
    const routeList = Object.entries(routes)
      .map(([route, desc]) => `- ${route}: ${desc}`)
      .join('\n');

    const statsList = Object.entries(stats)
      .map(([k, v]) => `- ${k}: ${v}`)
      .join('\n');

    const audience = isCandidate
      ? 'un candidato que busca empleo y arma su portafolio profesional'
      : 'una empresa que busca talento y publica ofertas laborales';

    const matchLabel = isCandidate
      ? 'Compatibilidad real de este candidato con las ofertas publicadas (de mayor a menor match, ya calculado — úsalo para responder cuál oferta/empresa conviene más, nunca inventes un porcentaje distinto)'
      : 'Candidatos con mejor compatibilidad para cada oferta activa de esta empresa (ya calculado)';

    return `Eres Joaquín, el asistente virtual de TalentBridge, una plataforma colombiana que conecta candidatos con empresas.

Hablas en español neutro de Colombia, con tuteo (tú, puedes, tienes) — NUNCA voseo (vos, podés, tenés). Tono cercano, profesional y breve (2-4 frases salvo que el usuario pida más detalle). No inventes datos: usa solo la información real que se te da abajo.

Estás hablando con ${audience}, llamado/a ${userName}.

Datos reales de este usuario en la plataforma ahora mismo:
${statsList}

${matchLabel}:
${matchContext}

Rutas válidas de la aplicación a las que podés sugerir navegar (usa el path EXACTO, nunca inventes una ruta que no esté en esta lista):
${routeList}

Respondé ÚNICAMENTE con un objeto JSON con esta forma exacta, sin texto antes ni después:
{
  "reply": "tu respuesta en lenguaje natural",
  "actions": [{"label": "texto corto del botón", "route": "una de las rutas válidas de arriba"}],
  "showProfileCard": boolean,
  "showCandidateMatches": boolean
}

"actions" es opcional, máximo 2, solo si de verdad ayuda a la conversación (no lo agregues en cada respuesta). "showProfileCard" (solo para candidatos) solo debe ser true si tiene sentido mostrarle un resumen de su propio perfil. "showCandidateMatches" (solo para empresas) solo debe ser true si el usuario pregunta por candidatos compatibles/recomendados y tiene sentido mostrarle tarjetas de esos candidatos.`;
  }

  /** Compatibilidad real candidato→ofertas, reusando la misma lógica de matching
   *  que ya usa la pantalla de ofertas (`computeSkillMatch`) — nunca un número inventado. */
  private async getCandidateJobMatchesText(
    candidateSkills: { normalizedName: string; level: string }[],
  ): Promise<string> {
    const jobs = await this.prisma.jobOffer.findMany({
      where: { status: 'PUBLISHED' },
      include: { company: { select: { companyProfile: { select: { companyName: true } } } } },
      orderBy: { createdAt: 'desc' },
      take: 40,
    });

    if (jobs.length === 0) return 'No hay ofertas publicadas en este momento.';

    const scored = jobs
      .map((job) => ({ job, match: computeSkillMatch(job.skillsRequired, candidateSkills) }))
      .sort((a, b) => b.match.matchPercent - a.match.matchPercent)
      .slice(0, 8);

    return scored
      .map(
        ({ job, match }) =>
          `- "${job.title}" en ${job.company.companyProfile?.companyName || 'una empresa'} (${job.city || 'ciudad no especificada'}): ${match.matchPercent}% de match (${match.matchedCount}/${match.totalCount} habilidades requeridas que ya tiene)`,
      )
      .join('\n');
  }

  /** Compatibilidad real empresa→candidatos por cada oferta activa propia. Solo
   *  mira perfiles publicados (misma visibilidad que ya respeta la búsqueda de
   *  candidatos existente) — no expone perfiles que el candidato mantiene privados. */
  private async getCompanyCandidateMatches(
    companyUserId: number,
  ): Promise<{ text: string; topCandidates: CandidateCardData[] }> {
    const jobs = await this.prisma.jobOffer.findMany({
      where: { companyId: companyUserId, status: 'PUBLISHED' },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    if (jobs.length === 0) {
      return { text: 'Esta empresa no tiene ofertas publicadas actualmente.', topCandidates: [] };
    }

    const candidates = await this.prisma.profile.findMany({
      where: { isPublished: true },
      include: { skills: true },
      take: 200,
    });

    const lines: string[] = [];
    const topCandidatesByKey = new Map<string, CandidateCardData>();

    for (const job of jobs) {
      const scored = candidates
        .map((c) => ({
          profile: c,
          match: computeSkillMatch(
            job.skillsRequired,
            c.skills.map((s) => ({ normalizedName: s.normalizedName, level: s.level })),
          ),
        }))
        .sort((a, b) => b.match.matchPercent - a.match.matchPercent)
        .slice(0, 3);

      lines.push(`Oferta "${job.title}":`);
      for (const { profile, match } of scored) {
        lines.push(
          `  - ${profile.fullName || 'Candidato'} (${profile.city || 'ciudad no especificada'}): ${match.matchPercent}% de match`,
        );
        topCandidatesByKey.set(profile.slug, {
          fullName: profile.fullName,
          professionalTitle: profile.professionalTitle,
          city: profile.city,
          slug: profile.slug,
        });
      }
    }

    return {
      text: lines.join('\n'),
      topCandidates: Array.from(topCandidatesByKey.values()).slice(0, 6),
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

    const availableJobs = await this.prisma.jobOffer.count({ where: { status: 'PUBLISHED' } });

    const hasBasicInfo = !!(profile?.fullName && profile?.professionalTitle);
    let profileCompletion = 0;
    if (hasBasicInfo) profileCompletion += 25;
    if ((profile?.skills.length || 0) > 0) profileCompletion += 25;
    if ((profile?.experiences.length || 0) > 0 || (profile?.educations.length || 0) > 0) profileCompletion += 25;
    if ((profile?.projects.length || 0) > 0) profileCompletion += 25;

    return {
      perfilCompletadoPorcentaje: profileCompletion,
      habilidadesRegistradas: profile?.skills.length || 0,
      experienciasRegistradas: profile?.experiences.length || 0,
      educacionesRegistradas: profile?.educations.length || 0,
      proyectosRegistrados: profile?.projects.length || 0,
      postulacionesRealizadas: applicationsCount,
      mensajesSinLeer: unreadMessages,
      ofertasPublicadasEnLaPlataforma: availableJobs,
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

    return {
      ofertasTotales: totalJobs,
      ofertasActivas: activeJobs,
      postulacionesTotales: totalApplications,
      postulacionesPendientes: pendingApplications,
      mensajesSinLeer: unreadMessages,
    };
  }
}
