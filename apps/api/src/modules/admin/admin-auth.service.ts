import { Injectable, UnauthorizedException } from '@nestjs/common';
import type { MeDto, SocialSignInResponse } from '@jjoin/types';
import { MockAuthScenario } from '@jjoin/types';
import { PrismaService } from '../../prisma/prisma.service';
import { verifyPassword } from '../../auth/password';
import { issueSessionToken } from '../../auth/session-token';
import { loadMeFromDb } from '../../auth/dev-persona';
import { resolveOnboardingStep } from '@jjoin/domain';
import { AdminBootstrapService } from './admin-bootstrap.service';

@Injectable()
export class AdminAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bootstrap: AdminBootstrapService,
  ) {}

  /**
   * Env → DB sync first (password change on Railway redeploy), then verify against hashed credential.
   * Never compares plaintext env password as the sole login gate without DB hash.
   */
  async login(loginIdRaw: string, password: string): Promise<SocialSignInResponse> {
    const loginId = loginIdRaw.trim();
    if (!loginId || !password) {
      throw new UnauthorizedException('invalid_admin_credentials');
    }

    // Keep DB hash aligned with Railway env before verifying.
    await this.bootstrap.synchronizeFromEnv();

    const credential = await this.prisma.adminLoginCredential.findUnique({
      where: { loginId },
    });
    if (!credential) {
      throw new UnauthorizedException('invalid_admin_credentials');
    }

    const ok = await verifyPassword(password, credential.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('invalid_admin_credentials');
    }

    await this.prisma.user.update({
      where: { id: credential.userId },
      data: { lastLoginAt: new Date() },
    });

    const accessToken = issueSessionToken(credential.userId);
    const me = (await loadMeFromDb(this.prisma, credential.userId)) as MeDto;

    return {
      session: {
        accessToken,
        userId: credential.userId,
        scenario: MockAuthScenario.RETURNING_USER,
      },
      me,
      nextStep: resolveOnboardingStep(me),
    };
  }
}
