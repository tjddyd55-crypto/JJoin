import { Module } from '@nestjs/common';
import { AdminDisputeController } from './admin-dispute.controller';
import { AdminDisputeService } from './admin-dispute.service';
import { AdminCoinSupplyController } from './admin-coin-supply.controller';
import { AdminCoinSupplyService } from './admin-coin-supply.service';
import { SettlementModule } from '../settlement/settlement.module';
import { WalletModule } from '../wallet/wallet.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { AdminGuard } from '../../common/admin.guard';

@Module({
  imports: [PrismaModule, SettlementModule, WalletModule],
  controllers: [AdminDisputeController, AdminCoinSupplyController],
  providers: [AdminDisputeService, AdminCoinSupplyService, AdminGuard],
})
export class AdminModule {}
