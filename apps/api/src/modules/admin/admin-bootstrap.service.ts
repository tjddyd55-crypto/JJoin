import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { hashPassword, readAdminBootstrapEnv, verifyPassword } from '../../auth/password';

export type AdminBootstrapResult =
  | { action: 'skipped'; reason: 'missing_credentials' | 'incomplete_credentials' | 'db_unavailable' }
  | { action: 'created'; userId: string }
  | { action: 'synchronized'; userId: string; passwordUpdated: boolean };

@Injectable()
export class AdminBootstrapService implements OnModuleInit {
  private readonly logger = new Logger(AdminBootstrapService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit(): Promise<void> {
    try {
      const result = await this.synchronizeFromEnv();
      if (result.action === 'created') {
        this.logger.log('Admin bootstrap created');
      } else if (result.action === 'synchronized') {
        this.logger.log(
          result.passwordUpdated
            ? 'Admin bootstrap synchronized'
            : 'Admin bootstrap synchronized',
        );
      } else if (result.reason === 'missing_credentials') {
        this.logger.log('Admin bootstrap skipped: missing required admin credentials');
      } else if (result.reason === 'incomplete_credentials') {
        this.logger.warn('Admin bootstrap skipped: incomplete admin credentials');
      } else {
        this.logger.warn('Admin bootstrap skipped: db unavailable');
      }
    } catch (e) {
      this.logger.error(
        `Admin bootstrap failed: ${e instanceof Error ? e.message : 'unknown_error'}`,
      );
    }
  }

  async synchronizeFromEnv(env: NodeJS.ProcessEnv = process.env): Promise<AdminBootstrapResult> {
    const creds = readAdminBootstrapEnv(env);
    if (creds.incomplete) {
      return { action: 'skipped', reason: 'incomplete_credentials' };
    }
    if (!creds.ready || !creds.loginId || !creds.password) {
      return { action: 'skipped', reason: 'missing_credentials' };
    }

    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      return { action: 'skipped', reason: 'db_unavailable' };
    }

    const loginId = creds.loginId;
    const password = creds.password;

    const existing = await this.prisma.adminLoginCredential.findUnique({
      where: { loginId },
      include: { user: true },
    });

    if (!existing) {
      const user = await this.prisma.user.create({
        data: {
          status: 'ACTIVE',
          identityStatus: 'VERIFIED',
          profile: {
            create: {
              nickname: `admin_${loginId.replace(/[^a-zA-Z0-9가-힣]/g, '_').slice(0, 24)}`,
              gender: 'MALE',
              ageBand: 'THIRTIES',
              regionLabel: '운영',
            },
          },
        },
      });
      const passwordHash = await hashPassword(password);
      await this.prisma.adminLoginCredential.create({
        data: {
          userId: user.id,
          loginId,
          passwordHash,
        },
      });
      return { action: 'created', userId: user.id };
    }

    const matches = await verifyPassword(password, existing.passwordHash);
    if (!matches) {
      const passwordHash = await hashPassword(password);
      await this.prisma.adminLoginCredential.update({
        where: { id: existing.id },
        data: { passwordHash },
      });
      return { action: 'synchronized', userId: existing.userId, passwordUpdated: true };
    }

    return { action: 'synchronized', userId: existing.userId, passwordUpdated: false };
  }
}
