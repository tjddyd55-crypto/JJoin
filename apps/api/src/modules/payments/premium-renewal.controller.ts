import { Controller, Headers, Post } from '@nestjs/common';
import { assertCronAuthorized } from '../../common/cron-secret';
import { PremiumSubscriptionService } from './premium-subscription.service';

/**
 * Ops / cron — process due Premium subscription renewals.
 * Reuses SETTLEMENT_CRON_SECRET (same pattern as settlement + notification delivery).
 */
@Controller()
export class PremiumRenewalController {
  constructor(private readonly premiumSubscription: PremiumSubscriptionService) {}

  @Post('premium/renewals/process')
  processRenewals(@Headers('x-settlement-cron-secret') secret?: string) {
    assertCronAuthorized(secret, [
      process.env.PREMIUM_RENEWAL_CRON_SECRET,
      process.env.SETTLEMENT_CRON_SECRET,
    ]);
    const limit = Number(process.env.PREMIUM_RENEWAL_BATCH_SIZE ?? 20);
    return this.premiumSubscription.processDueRenewals(limit);
  }
}
