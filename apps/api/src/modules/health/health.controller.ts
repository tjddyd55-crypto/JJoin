import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { resolveApiAppVariant } from '../../config/app-variant';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async check() {
    let database: 'connected' | 'disconnected' | 'skipped' = 'skipped';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      database = 'connected';
    } catch {
      database = 'disconnected';
    }

    const status = database === 'disconnected' ? 'degraded' : 'ok';
    const appVariant = resolveApiAppVariant();
    return {
      status,
      service: 'jjoin-api',
      database,
      // Never include DATABASE_URL / secrets
      env: process.env.NODE_ENV ?? 'development',
      appVariant,
      railwayEnvironment: process.env.RAILWAY_ENVIRONMENT_NAME ?? null,
    };
  }
}
