import { Module, forwardRef } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { JoinsModule } from '../joins/joins.module';
import { SettlementModule } from '../settlement/settlement.module';
import { AdminGuard } from '../../common/admin.guard';
import { JoinLoopController } from './join-loop.controller';
import { JoinSessionReviewAdminController } from './join-session-review-admin.controller';
import { MeJoinLoopController } from './me-join-loop.controller';
import { UserReputationController } from './user-reputation.controller';
import { UrgentVacancyService } from './urgent-vacancy.service';
import { AttendanceIntentService } from './attendance-intent.service';
import { JoinChatService } from './join-chat.service';
import { PlayedTogetherService } from './played-together.service';
import { JoinInvitationService } from './join-invitation.service';
import { PlayerReviewService } from './player-review.service';
import { ParticipationTrustService } from './participation-trust.service';
import { JoinSessionReviewService } from './join-session-review.service';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [
    NotificationsModule,
    AnalyticsModule,
    SettlementModule,
    StorageModule,
    forwardRef(() => JoinsModule),
  ],
  controllers: [
    JoinLoopController,
    MeJoinLoopController,
    UserReputationController,
    JoinSessionReviewAdminController,
  ],
  providers: [
    UrgentVacancyService,
    AttendanceIntentService,
    JoinChatService,
    PlayedTogetherService,
    JoinInvitationService,
    PlayerReviewService,
    JoinSessionReviewService,
    ParticipationTrustService,
    AdminGuard,
  ],
  exports: [
    UrgentVacancyService,
    AttendanceIntentService,
    JoinChatService,
    PlayedTogetherService,
    JoinInvitationService,
    PlayerReviewService,
    JoinSessionReviewService,
    ParticipationTrustService,
  ],
})
export class JoinLoopModule {}
