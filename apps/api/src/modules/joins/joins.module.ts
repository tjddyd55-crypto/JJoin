import { Module, forwardRef } from '@nestjs/common';
import { JoinsController } from './joins.controller';
import { StoreJoinsController } from './store-joins.controller';
import { RecurringJoinController } from './recurring-join.controller';
import { AdminJoinCoinPolicyController } from './admin-join-coin-policy.controller';
import { MeJoinCoinPolicyController } from './me-join-coin-policy.controller';
import { JoinWaitlistController } from './join-waitlist.controller';
import { JoinsService } from './joins.service';
import { MatchingJoinsService } from './matching-joins.service';
import { JoinWaitlistService } from './join-waitlist.service';
import { RecurringJoinService } from './recurring-join.service';
import { JoinDiscoveryService } from './join-discovery.service';
import { JoinCreationCoinPolicyService } from './join-creation-coin-policy.service';
import { WalletModule } from '../wallet/wallet.module';
import { SettlementModule } from '../settlement/settlement.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { UsersModule } from '../users/users.module';
import { VenuesModule } from '../venues/venues.module';
import { GolfFacilitiesModule } from '../golf-facilities/golf-facilities.module';
import { EngagementModule } from '../engagement/engagement.module';
import { JoinLoopModule } from '../join-loop/join-loop.module';
import { ClubsModule } from '../clubs/clubs.module';
import { PaymentsModule } from '../payments/payments.module';
import { AdminGuard } from '../../common/admin.guard';

@Module({
  imports: [
    WalletModule,
    SettlementModule,
    UsersModule,
    NotificationsModule,
    VenuesModule,
    GolfFacilitiesModule,
    PaymentsModule,
    forwardRef(() => EngagementModule),
    forwardRef(() => JoinLoopModule),
    forwardRef(() => ClubsModule),
  ],
  controllers: [
    JoinWaitlistController,
    JoinsController,
    StoreJoinsController,
    RecurringJoinController,
    AdminJoinCoinPolicyController,
    MeJoinCoinPolicyController,
  ],
  providers: [
    JoinsService,
    JoinDiscoveryService,
    MatchingJoinsService,
    JoinWaitlistService,
    RecurringJoinService,
    JoinCreationCoinPolicyService,
    AdminGuard,
  ],
  exports: [
    JoinsService,
    JoinDiscoveryService,
    MatchingJoinsService,
    JoinWaitlistService,
    RecurringJoinService,
    JoinCreationCoinPolicyService,
  ],
})
export class JoinsModule {}
