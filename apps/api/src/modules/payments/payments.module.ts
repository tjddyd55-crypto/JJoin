import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { WalletModule } from '../wallet/wallet.module';
import { AdminPremiumPlanController } from './admin-premium-plan.controller';
import { BillingNotificationService } from './billing-notification.service';
import { PaymentsController } from './payments.controller';
import { PaymentService } from './payment.service';
import { PremiumRenewalController } from './premium-renewal.controller';
import { PremiumService } from './premium.service';
import { PremiumSubscriptionService } from './premium-subscription.service';
import { TossPaymentProvider } from './toss-payment.provider';

@Module({
  imports: [WalletModule, NotificationsModule],
  controllers: [PaymentsController, AdminPremiumPlanController, PremiumRenewalController],
  providers: [
    PaymentService,
    PremiumService,
    PremiumSubscriptionService,
    BillingNotificationService,
    TossPaymentProvider,
  ],
  exports: [PaymentService, PremiumService, PremiumSubscriptionService, BillingNotificationService],
})
export class PaymentsModule {}
