import {
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Post,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { JoinWaitlistService } from './join-waitlist.service';
import { CurrentUserId, MockAuthGuard } from '../../common/mock-auth.guard';
import { extractCronSecret, matchesCronSecret } from '../../common/cron-secret';

@Controller('joins')
export class JoinWaitlistController {
  constructor(private readonly waitlist: JoinWaitlistService) {}

  @Post(':joinId/waitlist')
  @UseGuards(MockAuthGuard)
  join(@Param('joinId') joinId: string, @CurrentUserId() userId: string) {
    return this.waitlist.joinWaitlist(joinId, userId);
  }

  @Delete(':joinId/waitlist')
  @UseGuards(MockAuthGuard)
  cancel(@Param('joinId') joinId: string, @CurrentUserId() userId: string) {
    return this.waitlist.cancelWaitlist(joinId, userId);
  }

  @Post(':joinId/waitlist/accept')
  @UseGuards(MockAuthGuard)
  accept(@Param('joinId') joinId: string, @CurrentUserId() userId: string) {
    return this.waitlist.acceptWaitlistOffer(joinId, userId);
  }

  @Get(':joinId/waitlist')
  @UseGuards(MockAuthGuard)
  list(@Param('joinId') joinId: string, @CurrentUserId() userId: string) {
    return this.waitlist.listForHost(joinId, userId);
  }

  /** Railway cron — expire stale waitlist offers and promote next in FIFO. */
  @Post('waitlist/offers/process-expired')
  async processExpired(
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
    const limit = Number(process.env.WAITLIST_EXPIRE_BATCH_SIZE ?? 50);
    return this.waitlist.processExpiredOffers(limit);
  }
}
