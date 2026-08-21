import { Module } from '@nestjs/common';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { IdentityModule } from './modules/identity/identity.module';
import { UsersModule } from './modules/users/users.module';
import { SportsModule } from './modules/sports/sports.module';
import { VenuesModule } from './modules/venues/venues.module';
import { JoinsModule } from './modules/joins/joins.module';
import { ParticipationModule } from './modules/participation/participation.module';
import { WalletModule } from './modules/wallet/wallet.module';
import { SettlementModule } from './modules/settlement/settlement.module';
import { ReportsModule } from './modules/reports/reports.module';
import { MediaModule } from './modules/media/media.module';
import { PresenceModule } from './modules/presence/presence.module';
import { ExploreModule } from './modules/explore/explore.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    HealthModule,
    AuthModule,
    IdentityModule,
    UsersModule,
    SportsModule,
    VenuesModule,
    JoinsModule,
    ParticipationModule,
    WalletModule,
    SettlementModule,
    ReportsModule,
    MediaModule,
    PresenceModule,
    ExploreModule,
  ],
})
export class AppModule {}
