import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
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

  @Post(':joinId/cancel')
  @UseGuards(MockAuthGuard)
  cancel(@Param('joinId') joinId: string, @CurrentUserId() userId: string) {
    return this.service.cancel(joinId, userId);
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
