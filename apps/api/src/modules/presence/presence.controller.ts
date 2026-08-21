import { Body, Controller, Delete, Get, Put, UseGuards } from '@nestjs/common';
import type { UpsertPresenceRequest } from '@jjoin/types';
import { CurrentUserId, MockAuthGuard } from '../../common/mock-auth.guard';
import { PresenceService } from './presence.service';

@Controller('me/presence')
@UseGuards(MockAuthGuard)
export class PresenceController {
  constructor(private readonly presence: PresenceService) {}

  @Get()
  getMine(@CurrentUserId() userId: string) {
    return this.presence.getMine(userId);
  }

  @Put()
  upsert(@CurrentUserId() userId: string, @Body() body: UpsertPresenceRequest) {
    return this.presence.upsert(userId, body);
  }

  @Delete()
  hide(@CurrentUserId() userId: string) {
    return this.presence.hide(userId);
  }
}
