import { Body, Controller, Post } from '@nestjs/common';
import { AdminAuthService } from './admin-auth.service';

type AdminLoginBody = {
  loginId?: string;
  password?: string;
};

@Controller('auth/admin')
export class AdminAuthController {
  constructor(private readonly auth: AdminAuthService) {}

  @Post('login')
  login(@Body() body: AdminLoginBody) {
    return this.auth.login(body.loginId ?? '', body.password ?? '');
  }
}
