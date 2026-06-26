import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@app/database';

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
      data: dto,
    });
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
