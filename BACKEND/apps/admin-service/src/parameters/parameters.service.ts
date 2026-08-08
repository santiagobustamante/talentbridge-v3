import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ParameterType } from '@app/database';
import { SystemParameterRepository } from '@app/repository';
import { AuditLogService } from '../audit-log/audit-log.service';

@Injectable()
export class ParametersService {
  constructor(
    private readonly systemParameterRepository: SystemParameterRepository,
    private readonly auditLog: AuditLogService,
  ) {}

  async list() {
    return this.systemParameterRepository.findAll();
  }

  async findByKey(key: string) {
    const parameter = await this.systemParameterRepository.findByKey(key);
    if (!parameter) throw new NotFoundException(`Parámetro "${key}" no encontrado`);
    return parameter;
  }

  /**
   * Valida el valor nuevo contra la metadata del propio parámetro
   * (type/min/max/allowedValues) antes de guardarlo — la fila describe sus
   * propias reglas, así que esta validación sirve para cualquier parámetro
   * futuro sin tener que escribir un caso especial por cada uno.
   */
  async update(key: string, rawValue: string, adminId: number, ipAddress?: string) {
    const parameter = await this.findByKey(key);
    this.validateValue(parameter, rawValue);

    const before = { value: parameter.value };
    const updated = await this.systemParameterRepository.updateByKey(key, { value: rawValue, updatedById: adminId });

    await this.auditLog.record({
      adminId,
      action: 'UPDATE_PARAMETER',
      entityType: 'SystemParameter',
      entityId: key,
      before,
      after: { value: rawValue },
      ipAddress,
    });

    return updated;
  }

  private validateValue(
    parameter: { type: ParameterType; minValue: number | null; maxValue: number | null; allowedValues: unknown },
    rawValue: string,
  ): void {
    if (parameter.type === ParameterType.NUMBER) {
      const num = Number(rawValue);
      if (Number.isNaN(num)) {
        throw new BadRequestException('El valor debe ser un número');
      }
      if (parameter.minValue !== null && num < parameter.minValue) {
        throw new BadRequestException(`El valor no puede ser menor que ${parameter.minValue}`);
      }
      if (parameter.maxValue !== null && num > parameter.maxValue) {
        throw new BadRequestException(`El valor no puede ser mayor que ${parameter.maxValue}`);
      }
    }

    if (parameter.type === ParameterType.BOOLEAN && rawValue !== 'true' && rawValue !== 'false') {
      throw new BadRequestException('El valor debe ser "true" o "false"');
    }

    if (parameter.type === ParameterType.STRING && Array.isArray(parameter.allowedValues)) {
      if (!(parameter.allowedValues as string[]).includes(rawValue)) {
        throw new BadRequestException(`El valor debe ser uno de: ${(parameter.allowedValues as string[]).join(', ')}`);
      }
    }

    if (parameter.type === ParameterType.JSON) {
      try {
        JSON.parse(rawValue);
      } catch {
        throw new BadRequestException('El valor debe ser JSON válido');
      }
    }
  }
}
