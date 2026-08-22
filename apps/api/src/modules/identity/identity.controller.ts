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
  @Get('me/identity/capability')
  capability(@CurrentUserId() userId: string) {
    return this.service.getCapability(userId);
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
  confirm(
    @CurrentUserId() userId: string,
    @Body() body: { sessionId: string; outcome?: 'success' | 'fail' },
  ) {
    return this.service.confirm(userId, body.sessionId, body.outcome ?? 'success');
  }

  @UseGuards(MockAuthGuard)
  @Post('me/identity/cancel')
  cancel(@CurrentUserId() userId: string, @Body() body: { sessionId: string }) {
    return this.service.cancel(userId, body.sessionId);
  }
}
