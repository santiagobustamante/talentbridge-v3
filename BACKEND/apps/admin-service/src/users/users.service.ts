import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { UserRole } from '@app/database';
import { UserRepository } from '@app/repository';
import { AuditLogService } from '../audit-log/audit-log.service';

@Injectable()
export class UsersService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly auditLog: AuditLogService,
  ) {}

  async list(params: { role?: string; q?: string; page: number; limit: number }) {
    const where: any = {};
    if (params.role) where.role = params.role;
    if (params.q) where.email = { contains: params.q, mode: 'insensitive' };

    const [data, total] = await Promise.all([
      this.userRepository.findManyForAdmin(where, (params.page - 1) * params.limit, params.limit),
      this.userRepository.count(where),
    ]);

    return { data, total, page: params.page, limit: params.limit };
  }

  async setSuspended(id: number, suspended: boolean, adminId: number, ipAddress?: string) {
    if (id === adminId && suspended) {
      throw new BadRequestException('No puedes suspender tu propia cuenta');
    }

    const before = await this.userRepository.findByIdForSuspension(id);
    if (!before) throw new NotFoundException('Usuario no encontrado');
    if (before.role === UserRole.ADMIN && suspended) {
      throw new BadRequestException('No se puede suspender una cuenta ADMIN desde acá');
    }

    const updated = await this.userRepository.updateSuspendedStatus(id, suspended);

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
