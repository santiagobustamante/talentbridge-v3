import { Injectable, NotFoundException } from '@nestjs/common';
import { CompanyProfileRepository } from '@app/repository';
import {
  titleCaseText,
  trimText,
  normalizePhoneStorage,
  normalizeNitStorage,
  normalizeUrl,
} from '@app/common';

@Injectable()
export class CompanyProfileService {
  constructor(private readonly companyProfileRepository: CompanyProfileRepository) {}

  async getProfile(userId: number) {
    const profile = await this.companyProfileRepository.findByUserId(userId);
    if (!profile) throw new NotFoundException('Perfil de empresa no encontrado');
    return profile;
  }

  async updateProfile(userId: number, dto: any) {
    const profile = await this.companyProfileRepository.findByUserId(userId);
    if (!profile) throw new NotFoundException('Perfil de empresa no encontrado');

    return this.companyProfileRepository.update(userId, this.normalizeCompanyDto(dto));
  }

  /** No se confía únicamente en lo que ya llegó formateado del frontend. */
  private normalizeCompanyDto(dto: Record<string, unknown>): Record<string, unknown> {
    const normalized: Record<string, unknown> = { ...dto };

    if (typeof dto.companyName === 'string') normalized.companyName = titleCaseText(dto.companyName);
    if (typeof dto.sector === 'string') normalized.sector = titleCaseText(dto.sector);
    // Sin titleCaseText: viene del catálogo DIVIPOLA con su casing oficial
    // (incluye conectores en minúscula, ej. "San José de la Montaña").
    if (typeof dto.city === 'string') normalized.city = trimText(dto.city);
    if (typeof dto.description === 'string') normalized.description = trimText(dto.description);
    if (typeof dto.phone === 'string') normalized.phone = dto.phone ? normalizePhoneStorage(dto.phone) : dto.phone;
    if (typeof dto.nit === 'string') normalized.nit = dto.nit ? normalizeNitStorage(dto.nit) : dto.nit;
    if (typeof dto.websiteUrl === 'string') normalized.websiteUrl = dto.websiteUrl ? normalizeUrl(dto.websiteUrl) : dto.websiteUrl;

    return normalized;
  }

  async getPublicProfile(userId: number) {
    const profile = await this.companyProfileRepository.findPublicByUserId(userId);
    if (!profile) throw new NotFoundException('Empresa no encontrada');
    return profile;
  }
}
