import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Headers,
  Post,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { SocialAuthService } from '../../auth/social-auth.service';
import type { SocialSignInRequest, SocialExchangeRequest } from '@jjoin/types';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly service: AuthService,
    private readonly socialAuth: SocialAuthService,
  ) {}

  @Get('_meta')
  meta() {
    return this.service.ping();
  }

  /**
   * Mock social sign-in — development/staging only.
   * Real OAuth adapters replace this in a later Auth Integration Phase.
   */
  @Post('social/mock-sign-in')
  mockSignIn(@Body() body: SocialSignInRequest) {
    const mode = (process.env.SOCIAL_AUTH_MODE ?? 'mock').toLowerCase();
    const nodeEnv = (process.env.NODE_ENV ?? 'development').toLowerCase();
    if (nodeEnv === 'production' && mode !== 'mock') {
      throw new ForbiddenException('mock_sign_in_disabled');
    }
    // Allow mock in production only when SOCIAL_AUTH_MODE=mock (explicit staging/demo).
    // Default production should set SOCIAL_AUTH_MODE=disabled when OAuth lands.
    if (mode === 'disabled') {
      throw new ForbiddenException('mock_sign_in_disabled');
    }
    return this.service.mockSignIn(body);
  }

  /** Verify provider credential server-side and issue JJOIN session. */
  @Post('social/exchange')
  socialExchange(@Body() body: SocialExchangeRequest) {
    const mode = (process.env.SOCIAL_AUTH_MODE ?? 'mock').toLowerCase();
    if (mode === 'disabled') {
      throw new ForbiddenException('social_auth_disabled');
    }
    return this.socialAuth.exchange(body);
  }

  @Get('session')
  session(@Headers('authorization') authorization?: string) {
    const token = authorization?.startsWith('Bearer ')
      ? authorization.slice(7)
      : undefined;
    return this.service.getSession(token);
  }

  @Post('logout')
  async logout(@Headers('authorization') authorization?: string) {
    const token = authorization?.startsWith('Bearer ')
      ? authorization.slice(7)
      : undefined;
    return this.service.logout(token);
  }
}
