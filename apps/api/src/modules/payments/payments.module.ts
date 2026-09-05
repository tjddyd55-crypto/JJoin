import { Module } from '@nestjs/common';
import { WalletModule } from '../wallet/wallet.module';
import { AdminPremiumPlanController } from './admin-premium-plan.controller';
import { PaymentsController } from './payments.controller';
import { PaymentService } from './payment.service';
import { PremiumService } from './premium.service';
import { PremiumSubscriptionService } from './premium-subscription.service';
import { TossPaymentProvider } from './toss-payment.provider';

@Module({
  imports: [WalletModule],
  controllers: [PaymentsController, AdminPremiumPlanController],
  providers: [
    PaymentService,
    PremiumService,
    PremiumSubscriptionService,
    TossPaymentProvider,
  ],
  exports: [PaymentService, PremiumService, PremiumSubscriptionService],
})
export class PaymentsModule {}
