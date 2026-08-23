import { Module } from '@nestjs/common';
import { SettlementController } from './settlement.controller';
import { SettlementService } from './settlement.service';
import { WalletModule } from '../wallet/wallet.module';
import { DisputeModule } from '../dispute/dispute.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [WalletModule, DisputeModule, NotificationsModule],
  controllers: [SettlementController],
  providers: [SettlementService],
  exports: [SettlementService],
})
export class SettlementModule {}
