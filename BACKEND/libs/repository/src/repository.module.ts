import { Global, Module } from '@nestjs/common';
import { ProfileRepository } from './profile.repository';
import { UserRepository } from './user.repository';
import { ProfileViewRepository } from './profile-view.repository';
import { CompanyProfileRepository } from './company-profile.repository';
import { SkillRepository } from './skill.repository';
import { ConversationRepository } from './conversation.repository';
import { JobApplicationRepository } from './job-application.repository';
import { JobOfferRepository } from './job-offer.repository';
import { SystemCatalogRepository } from './system-catalog.repository';
import { SystemParameterRepository } from './system-parameter.repository';
import { NotificationRepository } from './notification.repository';
import { ReportRepository } from './report.repository';
import { SkillEndorsementRepository } from './skill-endorsement.repository';
import { ExperienceRepository } from './experience.repository';
import { EducationRepository } from './education.repository';
import { ProjectRepository } from './project.repository';
import { CvDocumentRepository } from './cv-document.repository';
import { CvAnalysisRepository } from './cv-analysis.repository';
import { ChatMessageRepository } from './chat-message.repository';
import { ChatBlockRepository } from './chat-block.repository';
import { VerificationTokenRepository } from './verification-token.repository';
import { AdminAuditLogRepository } from './admin-audit-log.repository';

/**
 * Un repositorio por modelo de Prisma que se va migrando fase a fase (ver
 * `docs/plan-repository-pattern.md`) — `@Global()` igual que `PrismaModule`/
 * `CommonModule`. Cada microservicio es su propia app Nest con su propio
 * árbol de módulos, así que `@Global()` solo alcanza dentro de esa app: hay
 * que importar `RepositoryModule` explícitamente en el `<servicio>.module.ts`
 * de cada consumidor (mismo criterio que ya se aplica a `PrismaModule`/
 * `CommonModule` en este proyecto), no alcanza con que exista en el repo.
 */
const REPOSITORIES = [
  ProfileRepository,
  UserRepository,
  ProfileViewRepository,
  CompanyProfileRepository,
  SkillRepository,
  ConversationRepository,
  JobApplicationRepository,
  JobOfferRepository,
  SystemCatalogRepository,
  SystemParameterRepository,
  NotificationRepository,
  ReportRepository,
  SkillEndorsementRepository,
  ExperienceRepository,
  EducationRepository,
  ProjectRepository,
  CvDocumentRepository,
  CvAnalysisRepository,
  ChatMessageRepository,
  ChatBlockRepository,
  VerificationTokenRepository,
  AdminAuditLogRepository,
];

@Global()
@Module({
  providers: REPOSITORIES,
  exports: REPOSITORIES,
})
export class RepositoryModule {}
