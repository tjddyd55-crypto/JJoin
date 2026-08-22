import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import type { DisputeStatementRequest } from '@jjoin/types';
import { DisputeService } from './dispute.service';
import { CurrentUserId, MockAuthGuard } from '../../common/mock-auth.guard';

@Controller()
export class DisputeController {
  constructor(private readonly service: DisputeService) {}

  @UseGuards(MockAuthGuard)
  @Get('me/disputes/:disputeId')
  getMine(@Param('disputeId') disputeId: string, @CurrentUserId() userId: string) {
    return this.service.getDisputeForUser(disputeId, userId);
  }

  @UseGuards(MockAuthGuard)
  @Post('me/disputes/:disputeId/statement')
  async submitStatement(
    @Param('disputeId') disputeId: string,
    @CurrentUserId() userId: string,
    @Body() body: DisputeStatementRequest,
  ) {
    await this.service.submitParticipantStatement(disputeId, userId, body.statement);
    return this.service.getDisputeForUser(disputeId, userId);
  }
}
