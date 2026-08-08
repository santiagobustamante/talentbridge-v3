import { Injectable } from '@nestjs/common';
import { PrismaService, Prisma } from '@app/database';

/** Include compartido por `findByEmailWithProfiles`/`findByIdWithProfiles` — login y `me()` devuelven el mismo shape (perfil de candidato o de empresa, el que exista), solo cambia la clave de búsqueda. */
const USER_WITH_PROFILES_INCLUDE = {
  profile: true,
  companyProfile: true,
} satisfies Prisma.UserInclude;

/**
 * Acceso a datos del modelo `User` — nace en la Fase 2 del patrón
 * repositorio con lo mínimo que necesita `candidate-service`, y se extiende
 * a fondo en la Fase 7 (`auth-service`, el consumidor más pesado de este
 * modelo). Ver `docs/plan-repository-pattern.md`.
 */
@Injectable()
export class UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(userId: number, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.user.findUnique({ where: { id: userId } });
  }

  /** Con el perfil de candidato o de empresa incluido — `AuthService.me()`. */
  async findByIdWithProfiles(userId: number, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.user.findUnique({ where: { id: userId }, include: USER_WITH_PROFILES_INCLUDE });
  }

  /** Como `findByIdWithProfiles`, pero además con las habilidades del perfil — `AssistantService` necesita el nombre (candidato o empresa) y las skills para el matching, en una sola consulta. */
  async findByIdWithProfileAndSkills(userId: number, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.user.findUnique({
      where: { id: userId },
      include: { profile: { include: { skills: true } }, companyProfile: true },
    });
  }

  async findByEmail(email: string, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.user.findUnique({ where: { email } });
  }

  /** Con el perfil de candidato o de empresa incluido — los tres flujos de login (`login`/`loginCompany`) necesitan validar el rol y devolver el perfil junto con el usuario en una sola consulta. */
  async findByEmailWithProfiles(email: string, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.user.findUnique({ where: { email }, include: USER_WITH_PROFILES_INCLUDE });
  }

  /**
   * `Prisma.UserCreateInput` (checked, no `Unchecked`): a diferencia de
   * `JobOffer`/`Report`/etc., acá no hay una FK escalar directa que armar —
   * el candidato/empresa se crea con `profile: { create: {...} }` o
   * `companyProfile: { create: {...} }` anidado, ambos ya expresables con el
   * tipo checked. Un solo método genérico porque la única diferencia entre
   * `register()` y `registerCompany()` es CUÁL relación anidada arma el
   * service — no amerita dos métodos.
   */
  async create(data: Prisma.UserCreateInput, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.user.create({ data, include: { profile: true, companyProfile: true } });
  }

  async update(userId: number, data: Prisma.UserUpdateInput, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.user.update({ where: { id: userId }, data });
  }

  /** `where` dinámico (rol/búsqueda por email) armado por `UsersService.list` — panel admin, pantalla de Usuarios. */
  async findManyForAdmin(where: Prisma.UserWhereInput, skip: number, take: number, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        role: true,
        emailVerified: true,
        suspended: true,
        createdAt: true,
        profile: { select: { fullName: true } },
        companyProfile: { select: { companyName: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    });
  }

  /** Total de usuarios que matchean el mismo `where` dinámico usado por `findManyForAdmin` (Fase 8) o cualquier otro filtro puntual (ej. `suspended: true` del dashboard) — para paginación o para un conteo simple. */
  async count(where: Prisma.UserWhereInput, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.user.count({ where });
  }

  /** Cuántos usuarios hay por rol — tarjetas del dashboard admin. */
  async groupByRole(tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.user.groupBy({ by: ['role'], _count: true });
  }

  /** Registro acotado (sin `passwordHash`) para el chequeo de `UsersService.setSuspended` antes de decidir si la suspensión está permitida. */
  async findByIdForSuspension(userId: number, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.user.findUnique({ where: { id: userId }, select: { id: true, email: true, suspended: true, role: true } });
  }

  /**
   * `select` explícito (no el `update` genérico de arriba): el resultado de
   * este método se devuelve tal cual por HTTP (`UsersService.setSuspended`)
   * — con el `update` genérico, que trae el registro completo, se filtraría
   * `passwordHash` en la respuesta. Acá el `select` acotado es la barrera de
   * seguridad, no una optimización.
   */
  async updateSuspendedStatus(userId: number, suspended: boolean, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.user.update({
      where: { id: userId },
      data: { suspended },
      select: { id: true, email: true, suspended: true },
    });
  }

  /** Registro acotado para resolver a quién pertenece un `entityId`/`targetId` genérico (auditoría, moderación) sin traer el usuario completo. */
  async findManyByIdsForAdminLookup(ids: number[], tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.user.findMany({ where: { id: { in: ids } }, select: { id: true, email: true, name: true, suspended: true } });
  }
}
