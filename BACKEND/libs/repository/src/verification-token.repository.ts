import { Injectable } from '@nestjs/common';
import { PrismaService, Prisma } from '@app/database';

@Injectable()
export class VerificationTokenRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** `UncheckedCreateInput`: el service arma `userId` como FK escalar directa. Usado para tokens de reset de contraseña y de verificación de correo (el `type` distingue cuál es cuál). */
  async create(data: Prisma.VerificationTokenUncheckedCreateInput, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.verificationToken.create({ data });
  }

  async findByTokenHash(tokenHash: string, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.verificationToken.findUnique({ where: { tokenHash } });
  }

  /** Marca el token como consumido — se llama junto con la actualización que ese token autoriza (password nueva o correo verificado), ambas dentro de la misma transacción para que sea atómico. */
  async markUsed(tokenId: number, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.verificationToken.update({ where: { id: tokenId }, data: { usedAt: new Date() } });
  }
}
