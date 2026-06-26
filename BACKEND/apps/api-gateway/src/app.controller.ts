import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '@app/database';

@ApiTags('Health')
@Controller()
export class AppController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('health')
  @ApiOperation({ summary: 'Verificar salud del API Gateway' })
  async health() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        service: 'api-gateway',
        status: 'ok',
        database: 'connected',
        timestamp: new Date().toISOString(),
      };
    } catch {
      return {
        service: 'api-gateway',
        status: 'ok',
        database: 'disconnected',
        timestamp: new Date().toISOString(),
      };
    }
  }
}
