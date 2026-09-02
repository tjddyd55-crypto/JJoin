import { Module } from '@nestjs/common';
import { WalletModule } from '../wallet/wallet.module';
import { PaymentsController } from './payments.controller';
import { PaymentService } from './payment.service';
import { PremiumService } from './premium.service';
import { TossPaymentProvider } from './toss-payment.provider';

@Module({
  imports: [WalletModule],
  controllers: [PaymentsController],
  providers: [PaymentService, PremiumService, TossPaymentProvider],
  exports: [PaymentService, PremiumService],
})
export class PaymentsModule {}
