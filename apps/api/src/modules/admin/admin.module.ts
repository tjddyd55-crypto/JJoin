import { Module } from '@nestjs/common';
import { AdminDisputeController } from './admin-dispute.controller';
import { AdminDisputeService } from './admin-dispute.service';
import { SettlementModule } from '../settlement/settlement.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { AdminGuard } from '../../common/admin.guard';

@Module({
  imports: [PrismaModule, SettlementModule],
  controllers: [AdminDisputeController],
  providers: [AdminDisputeService, AdminGuard],
})
export class AdminModule {}
