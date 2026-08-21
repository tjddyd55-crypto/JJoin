import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import {
  MockGoogleAuthAdapter,
  MockKakaoAuthAdapter,
  MockNaverAuthAdapter,
} from '../../providers/mock.adapters';
import { PresenceModule } from '../presence/presence.module';

@Module({
  imports: [PresenceModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    MockKakaoAuthAdapter,
    MockNaverAuthAdapter,
    MockGoogleAuthAdapter,
  ],
  exports: [AuthService],
})
export class AuthModule {}
