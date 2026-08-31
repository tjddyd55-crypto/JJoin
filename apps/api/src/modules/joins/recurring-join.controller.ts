import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type {
  CreateRecurringJoinScheduleRequest,
  SkipRecurringJoinOccurrenceRequest,
  UpdateRecurringJoinScheduleRequest,
} from '@jjoin/types';
import { CurrentUserId, MockAuthGuard } from '../../common/mock-auth.guard';
import { extractCronSecret, matchesCronSecret } from '../../common/cron-secret';
import { RecurringJoinService } from './recurring-join.service';

@Controller()
export class RecurringJoinController {
  constructor(private readonly service: RecurringJoinService) {}

  @Get('my/recurring-joins')
  @UseGuards(MockAuthGuard)
  list(@CurrentUserId() userId: string) {
    return this.service.listMine(userId);
  }

  @Post('my/recurring-joins')
  @UseGuards(MockAuthGuard)
  create(
    @CurrentUserId() userId: string,
    @Body() body: CreateRecurringJoinScheduleRequest,
  ) {
    return this.service.create(userId, body);
  }

  @Patch('my/recurring-joins/:scheduleId')
  @UseGuards(MockAuthGuard)
  update(
    @CurrentUserId() userId: string,
    @Param('scheduleId') scheduleId: string,
    @Body() body: UpdateRecurringJoinScheduleRequest,
  ) {
    return this.service.update(userId, scheduleId, body);
  }

  @Post('my/recurring-joins/:scheduleId/pause')
  @UseGuards(MockAuthGuard)
  pause(
    @CurrentUserId() userId: string,
    @Param('scheduleId') scheduleId: string,
  ) {
    return this.service.pause(userId, scheduleId);
  }

  @Post('my/recurring-joins/:scheduleId/resume')
  @UseGuards(MockAuthGuard)
  resume(
    @CurrentUserId() userId: string,
    @Param('scheduleId') scheduleId: string,
  ) {
    return this.service.resume(userId, scheduleId);
  }

  @Delete('my/recurring-joins/:scheduleId')
  @UseGuards(MockAuthGuard)
  remove(
    @CurrentUserId() userId: string,
    @Param('scheduleId') scheduleId: string,
  ) {
    return this.service.softDelete(userId, scheduleId);
  }

  @Post('my/recurring-joins/:scheduleId/skip')
  @UseGuards(MockAuthGuard)
  skip(
    @CurrentUserId() userId: string,
    @Param('scheduleId') scheduleId: string,
    @Body() body: SkipRecurringJoinOccurrenceRequest,
  ) {
    return this.service.skipOccurrence(userId, scheduleId, body);
  }

  /** Railway cron / ops — materialize due recurring store-matching joins. */
  @Post('joins/recurring/run')
  async runDue(
    @Headers('x-settlement-cron-secret') headerSecret?: string,
    @Headers('authorization') authorization?: string,
  ) {
    const expected = process.env.SETTLEMENT_CRON_SECRET?.trim();
    if (!expected) {
      throw new UnauthorizedException('cron_secret_not_configured');
    }
    const provided = extractCronSecret({
      'x-settlement-cron-secret': headerSecret,
      authorization,
    });
    if (!matchesCronSecret(provided, expected)) {
      throw new UnauthorizedException('invalid_cron_secret');
    }
    return this.service.runDueSchedules();
  }
}
