import { Body, Controller, Get, Headers, Param, Post, UseGuards } from '@nestjs/common';
import type { SettlementIssueRequest, HostFinalizeAttendanceRequest } from '@jjoin/types';
import { SettlementService } from './settlement.service';
import { CurrentUserId, MockAuthGuard } from '../../common/mock-auth.guard';

@Controller()
export class SettlementController {
  constructor(private readonly service: SettlementService) {}

  @Get('settlement/_meta')
  meta() {
    return this.service.ping();
  }

  /** Railway cron / ops — batch auto pay. Requires SETTLEMENT_CRON_SECRET when configured. */
  @Post('settlement/autopay/run')
  runAutoPay(@Headers('x-settlement-cron-secret') secret?: string) {
    return this.service.runAutoPayCron(secret);
  }

  @UseGuards(MockAuthGuard)
  @Get('joins/:joinId/settlements')
  list(@Param('joinId') joinId: string, @CurrentUserId() userId: string) {
    return this.service.getJoinSettlements(joinId, userId);
  }

  @UseGuards(MockAuthGuard)
  @Post('joins/:joinId/settlements/:participantId/pay')
  pay(
    @Param('joinId') joinId: string,
    @Param('participantId') participantId: string,
    @CurrentUserId() hostUserId: string,
  ) {
    return this.service.payParticipant(joinId, participantId, hostUserId, 'MANUAL');
  }

  @UseGuards(MockAuthGuard)
  @Post('joins/:joinId/settlements/pay-all')
  payAll(@Param('joinId') joinId: string, @CurrentUserId() hostUserId: string) {
    return this.service.payAllEligible(joinId, hostUserId);
  }

  @UseGuards(MockAuthGuard)
  @Post('joins/:joinId/settlements/finalize')
  finalize(
    @Param('joinId') joinId: string,
    @CurrentUserId() hostUserId: string,
    @Body() body: HostFinalizeAttendanceRequest,
  ) {
    return this.service.finalizeHostAttendance(joinId, hostUserId, body);
  }

  @UseGuards(MockAuthGuard)
  @Post('joins/:joinId/settlements/:participantId/issue')
  issue(
    @Param('joinId') joinId: string,
    @Param('participantId') participantId: string,
    @CurrentUserId() hostUserId: string,
    @Body() body: SettlementIssueRequest,
  ) {
    return this.service.reportIssue(joinId, participantId, hostUserId, body);
  }

  /** DEV/mock QA only — advance settlement clock for Android E2E. */
  @UseGuards(MockAuthGuard)
  @Post('joins/:joinId/settlements/_qa/advance-clock')
  qaAdvance(
    @Param('joinId') joinId: string,
    @CurrentUserId() hostUserId: string,
    @Body() body: { mode?: 'open' | 'autopay' },
  ) {
    return this.service.qaAdvanceSettlementClock(joinId, hostUserId, body.mode ?? 'open');
  }
}
