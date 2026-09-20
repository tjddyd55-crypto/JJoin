import { PrismaClient } from '@prisma/client';
import type { PrismaService } from '../../prisma/prisma.service';
import { CoinLedgerService } from '../wallet/coin-ledger.service';
import { DisputeService } from '../dispute/dispute.service';
import { NotificationEventService } from '../notifications/notification-event.service';
import type { NotificationDeliveryService } from '../notifications/notification-delivery.service';
import { FeatureFlagsService } from '../expansion/feature-flags.service';
import { RewardsService } from '../expansion/rewards.service';
import { SettlementService } from './settlement.service';

/**
 * Composition root for Railway cron / standalone scripts.
 * Must stay in sync with SettlementModule Nest DI:
 *   prisma, ledger, disputes, notifications, rewards
 *
 * Delivery kick is a no-op here — cron must never depend on push success.
 * Notification rows may still be enqueued (enqueueSafe); push is eventual via API.
 */
export function createStandaloneSettlementService(
  prisma: PrismaClient | PrismaService,
): SettlementService {
  const prismaService = prisma as PrismaService;
  const ledger = new CoinLedgerService(prismaService);
  const disputes = new DisputeService(prismaService);
  // Avoid constructing NotificationDeliveryService (Nest @Inject) under tsx cron.
  const delivery = {
    kick(): void {
      // no-op: settlement cron is accounting-first; push is side-effect elsewhere
    },
  } as Pick<NotificationDeliveryService, 'kick'> as NotificationDeliveryService;
  const notifications = new NotificationEventService(prismaService, delivery);
  const flags = new FeatureFlagsService(prismaService);
  const rewards = new RewardsService(prismaService, ledger, flags, notifications);
  return new SettlementService(prismaService, ledger, disputes, notifications, rewards);
}
