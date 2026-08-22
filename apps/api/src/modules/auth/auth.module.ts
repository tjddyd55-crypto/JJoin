import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SocialAuthService } from '../../auth/social-auth.service';
import {
  MockGoogleAuthAdapter,
  MockKakaoAuthAdapter,
  MockNaverAuthAdapter,
} from '../../providers/mock.adapters';
import { KakaoSocialAuthProvider } from '../../providers/social/kakao-social.provider';
import { NaverSocialAuthProvider } from '../../providers/social/naver-social.provider';
import { GoogleSocialAuthProvider } from '../../providers/social/google-social.provider';
import { PresenceModule } from '../presence/presence.module';
import { UsersModule } from '../users/users.module';
import { WalletModule } from '../wallet/wallet.module';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PresenceModule, UsersModule, WalletModule, PrismaModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    SocialAuthService,
    MockKakaoAuthAdapter,
    MockNaverAuthAdapter,
    MockGoogleAuthAdapter,
    KakaoSocialAuthProvider,
    NaverSocialAuthProvider,
    GoogleSocialAuthProvider,
  ],
  exports: [AuthService, SocialAuthService],
})
export class AuthModule {}
