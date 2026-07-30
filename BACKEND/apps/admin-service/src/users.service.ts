import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService, UserRole } from '@app/database';
import { AuditLogService } from './audit-log.service';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

  async list(params: { role?: string; q?: string; page: number; limit: number }) {
    const where: any = {};
    if (params.role) where.role = params.role;
    if (params.q) where.email = { contains: params.q, mode: 'insensitive' };

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
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
        skip: (params.page - 1) * params.limit,
        take: params.limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    return { data, total, page: params.page, limit: params.limit };
  }

  async setSuspended(id: number, suspended: boolean, adminId: number, ipAddress?: string) {
    if (id === adminId && suspended) {
      throw new BadRequestException('No puedes suspender tu propia cuenta');
    }

    const before = await this.prisma.user.findUnique({ where: { id }, select: { id: true, email: true, suspended: true, role: true } });
    if (!before) throw new NotFoundException('Usuario no encontrado');
    if (before.role === UserRole.ADMIN && suspended) {
      throw new BadRequestException('No se puede suspender una cuenta ADMIN desde acá');
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: { suspended },
      select: { id: true, email: true, suspended: true },
    });

    await this.auditLog.record({
      adminId,
      action: suspended ? 'SUSPEND_USER' : 'REACTIVATE_USER',
      entityType: 'User',
      entityId: String(id),
      before: { suspended: before.suspended },
      after: { suspended: updated.suspended },
      ipAddress,
    });

    return updated;
  }
}
