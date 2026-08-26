import { Module } from '@nestjs/common';
import { JoinsController } from './joins.controller';
import { StoreJoinsController } from './store-joins.controller';
import { JoinsService } from './joins.service';
import { MatchingJoinsService } from './matching-joins.service';
import { WalletModule } from '../wallet/wallet.module';
import { SettlementModule } from '../settlement/settlement.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { UsersModule } from '../users/users.module';
import { VenuesModule } from '../venues/venues.module';
import { GolfFacilitiesModule } from '../golf-facilities/golf-facilities.module';

@Module({
  imports: [
    WalletModule,
    SettlementModule,
    UsersModule,
    NotificationsModule,
    VenuesModule,
    GolfFacilitiesModule,
  ],
  controllers: [JoinsController, StoreJoinsController],
  providers: [
    JoinsService,
    MatchingJoinsService,
  ],
  exports: [JoinsService, MatchingJoinsService],
})
export class JoinsModule {}
