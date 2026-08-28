import { Module } from '@nestjs/common';
import { JoinsController } from './joins.controller';
import { JoinsService } from './joins.service';
import { WalletModule } from '../wallet/wallet.module';
import { SettlementModule } from '../settlement/settlement.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { UsersModule } from '../users/users.module';
import { MembershipModule } from '../membership/membership.module';

@Module({
  imports: [WalletModule, SettlementModule, UsersModule, NotificationsModule, MembershipModule],
  controllers: [JoinsController],
  providers: [JoinsService],
  exports: [JoinsService],
})
export class JoinsModule {}
