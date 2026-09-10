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
import { resolveSocialAuthMode } from '../../auth/social-auth-mode';
import { isMockSignInEnabled } from './auth-mock-signin';
import type { SocialSignInRequest, SocialExchangeRequest, NaverOAuthExchangeRequest } from '@jjoin/types';

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
    if (!isMockSignInEnabled()) {
      throw new ForbiddenException('mock_sign_in_disabled');
    }
    if (!body.persona && !body.scenario) {
      throw new ForbiddenException('mock_sign_in_invalid');
    }
    return this.service.mockSignIn(body);
  }

  /** Verify provider credential server-side and issue JJOIN session. */
  @Post('social/exchange')
  socialExchange(@Body() body: SocialExchangeRequest) {
    const mode = resolveSocialAuthMode();
    if (mode === 'disabled') {
      throw new ForbiddenException('social_auth_disabled');
    }
    return this.socialAuth.exchange(body);
  }

  /**
   * Naver OAuth authorization-code exchange — client secret stays on API only.
   * Mobile completes browser/native redirect and sends code + redirectUri here.
   */
  @Post('social/naver/exchange-code')
  naverExchangeCode(@Body() body: NaverOAuthExchangeRequest) {
    const mode = resolveSocialAuthMode();
    if (mode === 'disabled') {
      throw new ForbiddenException('social_auth_disabled');
    }
    return this.socialAuth.exchangeNaverAuthorizationCode(body);
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
