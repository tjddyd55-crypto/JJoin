import { Module, forwardRef } from '@nestjs/common';
import { JoinsController } from './joins.controller';
import { StoreJoinsController } from './store-joins.controller';
import { RecurringJoinController } from './recurring-join.controller';
import { JoinsService } from './joins.service';
import { MatchingJoinsService } from './matching-joins.service';
import { RecurringJoinService } from './recurring-join.service';
import { JoinDiscoveryService } from './join-discovery.service';
import { WalletModule } from '../wallet/wallet.module';
import { SettlementModule } from '../settlement/settlement.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { UsersModule } from '../users/users.module';
import { VenuesModule } from '../venues/venues.module';
import { GolfFacilitiesModule } from '../golf-facilities/golf-facilities.module';
import { EngagementModule } from '../engagement/engagement.module';
import { JoinLoopModule } from '../join-loop/join-loop.module';

@Module({
  imports: [
    WalletModule,
    SettlementModule,
    UsersModule,
    NotificationsModule,
    VenuesModule,
    GolfFacilitiesModule,
    forwardRef(() => EngagementModule),
    forwardRef(() => JoinLoopModule),
  ],
  controllers: [JoinsController, StoreJoinsController, RecurringJoinController],
  providers: [
    JoinsService,
    JoinDiscoveryService,
    MatchingJoinsService,
    RecurringJoinService,
  ],
  exports: [JoinsService, JoinDiscoveryService, MatchingJoinsService, RecurringJoinService],
})
export class JoinsModule {}
