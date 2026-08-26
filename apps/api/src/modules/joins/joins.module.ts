import { Module } from '@nestjs/common';
import { JoinsController } from './joins.controller';
import { JoinsService } from './joins.service';
import { JoinDiscoveryService } from './join-discovery.service';
import { WalletModule } from '../wallet/wallet.module';
import { SettlementModule } from '../settlement/settlement.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { UsersModule } from '../users/users.module';
import { VenuesModule } from '../venues/venues.module';

@Module({
  imports: [WalletModule, SettlementModule, UsersModule, NotificationsModule, VenuesModule],
  controllers: [JoinsController],
  providers: [JoinsService, JoinDiscoveryService],
  exports: [JoinsService, JoinDiscoveryService],
})
export class JoinsModule {}
