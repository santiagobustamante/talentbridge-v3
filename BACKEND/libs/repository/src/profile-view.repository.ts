import { Injectable } from '@nestjs/common';
import { PrismaService, Prisma } from '@app/database';

/**
 * Acceso a datos del modelo `ProfileView` — creado en la Fase 2 (el prompt
 * original de Fases 2-9 lo atribuía a la Fase 5, pero `profile.service.ts`
 * de la Fase 2 ya tiene una llamada a este modelo y la regla del patrón es
 * que ningún service migrado se quede con un `this.prisma.<modelo>` directo
 * — se creó acá, un poco antes de lo previsto, y la Fase 5 solo lo extiende
 * con lo que necesite `recordView`). Ver `docs/DECISIONS.md`.
 */
@Injectable()
export class ProfileViewRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Historial de vistas de un perfil, con el resumen de quién lo vio (email + nombre de empresa). */
  async findByProfileId(profileId: number, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.profileView.findMany({
      where: { profileId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        createdAt: true,
        companyUser: {
          select: {
            email: true,
            companyProfile: { select: { companyName: true, logoUrl: true } },
          },
        },
      },
    });
  }

  /**
   * Las dos siguientes participan de la transacción `Serializable` de
   * `PublicPortfolioService.recordView` (dedup de vistas repetidas en una
   * ventana de 10 minutos) — por eso `tx` acá no es opcional en la práctica,
   * aunque la firma lo permita: la orquestación de la transacción se queda
   * en el service (ver `docs/plan-repository-pattern.md`, Fase 5).
   */
  async findRecentByProfileAndCompany(profileId: number, companyUserId: number, since: Date, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.profileView.findFirst({ where: { profileId, companyUserId, createdAt: { gte: since } } });
  }

  async create(profileId: number, companyUserId: number, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.profileView.create({ data: { profileId, companyUserId } });
  }
}
