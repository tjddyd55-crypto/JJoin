import { Module } from '@nestjs/common';
import { AdminDisputeController } from './admin-dispute.controller';
import { AdminDisputeService } from './admin-dispute.service';
import { AdminCoinSupplyController } from './admin-coin-supply.controller';
import { AdminCoinSupplyService } from './admin-coin-supply.service';
import { AdminAuthController } from './admin-auth.controller';
import { AdminAuthService } from './admin-auth.service';
import { AdminBootstrapService } from './admin-bootstrap.service';
import { SettlementModule } from '../settlement/settlement.module';
import { WalletModule } from '../wallet/wallet.module';
import { PaymentsModule } from '../payments/payments.module';
import { AdminPaymentsController } from '../payments/admin-payments.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { AdminGuard } from '../../common/admin.guard';

@Module({
  imports: [PrismaModule, SettlementModule, WalletModule, PaymentsModule],
  controllers: [
    AdminDisputeController,
    AdminCoinSupplyController,
    AdminAuthController,
    AdminPaymentsController,
  ],
  providers: [
    AdminDisputeService,
    AdminCoinSupplyService,
    AdminBootstrapService,
    AdminAuthService,
    AdminGuard,
  ],
  exports: [AdminBootstrapService, AdminGuard],
})
export class AdminModule {}
