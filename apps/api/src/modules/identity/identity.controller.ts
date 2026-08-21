import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { IdentityService } from './identity.service';
import { CurrentUserId, MockAuthGuard } from '../../common/mock-auth.guard';

@Controller()
export class IdentityController {
  constructor(private readonly service: IdentityService) {}

  @Get('identity/_meta')
  meta() {
    return this.service.ping();
  }

  @UseGuards(MockAuthGuard)
  @Get('me/identity-status')
  status(@CurrentUserId() userId: string) {
    return this.service.getStatus(userId);
  }

  @UseGuards(MockAuthGuard)
  @Post('me/identity/start')
  start(@CurrentUserId() userId: string) {
    return this.service.start(userId);
  }

  @UseGuards(MockAuthGuard)
  @Post('me/identity/confirm')
  confirm(@Body() body: { sessionId: string; outcome?: 'success' | 'fail' }) {
    return this.service.confirm(body.sessionId, body.outcome ?? 'success');
  }

  @UseGuards(MockAuthGuard)
  @Post('me/identity/cancel')
  cancel(@Body() body: { sessionId: string }) {
    return this.service.cancel(body.sessionId);
  }
}
