import { Module } from '@nestjs/common';
import { SettlementController } from './settlement.controller';
import { SettlementService } from './settlement.service';
import { WalletModule } from '../wallet/wallet.module';
import { DisputeModule } from '../dispute/dispute.module';

@Module({
  imports: [WalletModule, DisputeModule],
  controllers: [SettlementController],
  providers: [SettlementService],
  exports: [SettlementService],
})
export class SettlementModule {}
