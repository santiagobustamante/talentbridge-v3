import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@app/database';
import {
  titleCaseText,
  trimText,
  normalizePhoneStorage,
  normalizeNitStorage,
  normalizeUrl,
} from '@app/common';

@Injectable()
export class CompanyProfileService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: number) {
    const profile = await this.prisma.companyProfile.findUnique({
      where: { userId },
    });
    if (!profile) throw new NotFoundException('Perfil de empresa no encontrado');
    return profile;
  }

  async updateProfile(userId: number, dto: any) {
    const profile = await this.prisma.companyProfile.findUnique({
      where: { userId },
    });
    if (!profile) throw new NotFoundException('Perfil de empresa no encontrado');

    return this.prisma.companyProfile.update({
      where: { userId },
      data: this.normalizeCompanyDto(dto),
    });
  }

  /** No se confía únicamente en lo que ya llegó formateado del frontend. */
  private normalizeCompanyDto(dto: Record<string, unknown>): Record<string, unknown> {
    const normalized: Record<string, unknown> = { ...dto };

    if (typeof dto.companyName === 'string') normalized.companyName = titleCaseText(dto.companyName);
    if (typeof dto.sector === 'string') normalized.sector = titleCaseText(dto.sector);
    if (typeof dto.city === 'string') normalized.city = titleCaseText(dto.city);
    if (typeof dto.description === 'string') normalized.description = trimText(dto.description);
    if (typeof dto.phone === 'string') normalized.phone = dto.phone ? normalizePhoneStorage(dto.phone) : dto.phone;
    if (typeof dto.nit === 'string') normalized.nit = dto.nit ? normalizeNitStorage(dto.nit) : dto.nit;
    if (typeof dto.websiteUrl === 'string') normalized.websiteUrl = dto.websiteUrl ? normalizeUrl(dto.websiteUrl) : dto.websiteUrl;

    return normalized;
  }

  async getPublicProfile(userId: number) {
    const profile = await this.prisma.companyProfile.findUnique({
      where: { userId },
      select: {
        companyName: true,
        sector: true,
        city: true,
        phone: true,
        websiteUrl: true,
        description: true,
        logoUrl: true,
      },
    });
    if (!profile) throw new NotFoundException('Empresa no encontrada');
    return profile;
  }
}
