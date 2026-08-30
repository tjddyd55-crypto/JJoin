import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import type {
  CreateJoinAlertSubscriptionRequest,
  UpdateJoinAlertSubscriptionRequest,
} from '@jjoin/types';
import { CurrentUserId, MockAuthGuard } from '../../common/mock-auth.guard';
import { JoinAlertsService } from './join-alerts.service';

@Controller()
@UseGuards(MockAuthGuard)
export class JoinAlertsController {
  constructor(private readonly service: JoinAlertsService) {}

  @Get('me/join-alerts')
  list(@CurrentUserId() userId: string) {
    return this.service.list(userId);
  }

  @Post('me/join-alerts')
  create(
    @CurrentUserId() userId: string,
    @Body() body: CreateJoinAlertSubscriptionRequest,
  ) {
    return this.service.create(userId, body);
  }

  @Patch('me/join-alerts/:id')
  update(
    @CurrentUserId() userId: string,
    @Param('id') id: string,
    @Body() body: UpdateJoinAlertSubscriptionRequest,
  ) {
    return this.service.update(userId, id, body);
  }

  @Delete('me/join-alerts/:id')
  remove(@CurrentUserId() userId: string, @Param('id') id: string) {
    return this.service.remove(userId, id);
  }
}
