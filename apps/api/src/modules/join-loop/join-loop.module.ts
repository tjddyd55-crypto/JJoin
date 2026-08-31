import { Module, forwardRef } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { JoinsModule } from '../joins/joins.module';
import { SettlementModule } from '../settlement/settlement.module';
import { JoinLoopController } from './join-loop.controller';
import { MeJoinLoopController } from './me-join-loop.controller';
import { UrgentVacancyService } from './urgent-vacancy.service';
import { AttendanceIntentService } from './attendance-intent.service';
import { JoinChatService } from './join-chat.service';
import { PlayedTogetherService } from './played-together.service';
import { JoinInvitationService } from './join-invitation.service';

@Module({
  imports: [
    NotificationsModule,
    AnalyticsModule,
    SettlementModule,
    forwardRef(() => JoinsModule),
  ],
  controllers: [JoinLoopController, MeJoinLoopController],
  providers: [
    UrgentVacancyService,
    AttendanceIntentService,
    JoinChatService,
    PlayedTogetherService,
    JoinInvitationService,
  ],
  exports: [
    UrgentVacancyService,
    AttendanceIntentService,
    JoinChatService,
    PlayedTogetherService,
    JoinInvitationService,
  ],
})
export class JoinLoopModule {}
