import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import type { CreateJoinRequest, JoinCoinPreviewRequest } from '@jjoin/types';
import { JoinsService } from './joins.service';
import { CurrentUserId, MockAuthGuard } from '../../common/mock-auth.guard';

@Controller('joins')
export class JoinsController {
  constructor(private readonly service: JoinsService) {}

  @Get('_meta')
  meta() {
    return this.service.ping();
  }

  @Post('coin-preview')
  @UseGuards(MockAuthGuard)
  coinPreview(@CurrentUserId() userId: string, @Body() body: JoinCoinPreviewRequest) {
    return this.service.previewCoin(userId, body);
  }

  @Post()
  @UseGuards(MockAuthGuard)
  create(@CurrentUserId() userId: string, @Body() body: CreateJoinRequest) {
    return this.service.create(userId, body);
  }

  @Get('mine')
  @UseGuards(MockAuthGuard)
  mine(@CurrentUserId() userId: string) {
    return this.service.myJoins(userId);
  }

  @Get(':joinId')
  @UseGuards(MockAuthGuard)
  detail(@Param('joinId') joinId: string, @CurrentUserId() userId: string) {
    return this.service.getDetail(joinId, userId);
  }

  @Post(':joinId/apply')
  @UseGuards(MockAuthGuard)
  apply(@Param('joinId') joinId: string, @CurrentUserId() userId: string) {
    return this.service.apply(joinId, userId);
  }

  @Post(':joinId/participants/:participantId/approve')
  @UseGuards(MockAuthGuard)
  approve(
    @Param('joinId') joinId: string,
    @Param('participantId') participantId: string,
    @CurrentUserId() userId: string,
  ) {
    return this.service.approve(joinId, participantId, userId);
  }
}
