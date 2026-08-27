import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { CreateStoreMatchingJoinRequest, StoreMatchingCompleteRequest } from '@jjoin/types';
import { MatchingJoinsService } from './matching-joins.service';
import { CurrentUserId, MockAuthGuard } from '../../common/mock-auth.guard';

@Controller('store-joins')
export class StoreJoinsController {
  constructor(private readonly service: MatchingJoinsService) {}

  @Post()
  @UseGuards(MockAuthGuard)
  create(@CurrentUserId() userId: string, @Body() body: CreateStoreMatchingJoinRequest) {
    return this.service.create(userId, body);
  }

  @Get('mine')
  @UseGuards(MockAuthGuard)
  mine(@CurrentUserId() userId: string) {
    return this.service.mine(userId);
  }

  /** Railway cron / ops — reconcile due STORE_MATCHING recruitment deadlines. */
  @Post('matching/deadline/run')
  async runDeadline(@Headers('x-settlement-cron-secret') secret?: string) {
    const expected = process.env.SETTLEMENT_CRON_SECRET?.trim();
    if (expected && secret !== expected) {
      throw new UnauthorizedException('invalid_cron_secret');
    }
    const limit = Number(process.env.MATCHING_DEADLINE_BATCH_SIZE ?? 50);
    return this.service.reconcileDueMatchingDeadlines(limit);
  }

  @Post(':joinId/cancel')
  @UseGuards(MockAuthGuard)
  cancel(@Param('joinId') joinId: string, @CurrentUserId() userId: string) {
    return this.service.cancel(joinId, userId);
  }

  @Post(':joinId/leave')
  @UseGuards(MockAuthGuard)
  leave(@Param('joinId') joinId: string, @CurrentUserId() userId: string) {
    return this.service.leaveAsParticipant(joinId, userId);
  }

  @Post(':joinId/complete')
  @UseGuards(MockAuthGuard)
  complete(
    @Param('joinId') joinId: string,
    @CurrentUserId() userId: string,
    @Body() body: StoreMatchingCompleteRequest,
  ) {
    return this.service.complete(joinId, userId, body);
  }
}
