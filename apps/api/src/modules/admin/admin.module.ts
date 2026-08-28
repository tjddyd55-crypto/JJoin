import { Module } from '@nestjs/common';
import { AdminDisputeController } from './admin-dispute.controller';
import { AdminDisputeService } from './admin-dispute.service';
import { AdminCoinSupplyController } from './admin-coin-supply.controller';
import { AdminCoinSupplyService } from './admin-coin-supply.service';
import { AdminOpsController } from './admin-ops.controller';
import { AdminOpsService } from './admin-ops.service';
import { SettlementModule } from '../settlement/settlement.module';
import { WalletModule } from '../wallet/wallet.module';
import { MembershipModule } from '../membership/membership.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { AdminGuard } from '../../common/admin.guard';

@Module({
  imports: [PrismaModule, SettlementModule, WalletModule, MembershipModule],
  controllers: [AdminDisputeController, AdminCoinSupplyController, AdminOpsController],
  providers: [AdminDisputeService, AdminCoinSupplyService, AdminOpsService, AdminGuard],
})
export class AdminModule {}
