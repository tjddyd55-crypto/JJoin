import { Module } from '@nestjs/common';
import { JoinsController } from './joins.controller';
import { JoinsService } from './joins.service';
import { WalletModule } from '../wallet/wallet.module';
import { SettlementModule } from '../settlement/settlement.module';

import { UsersModule } from '../users/users.module';

@Module({
  imports: [WalletModule, SettlementModule, UsersModule],
  controllers: [JoinsController],
  providers: [JoinsService],
  exports: [JoinsService],
})
export class JoinsModule {}
