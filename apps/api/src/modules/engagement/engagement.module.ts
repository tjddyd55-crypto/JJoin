import { Module, forwardRef } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { JoinsModule } from '../joins/joins.module';
import { JoinAlertsController } from './join-alerts.controller';
import { JoinAlertsService } from './join-alerts.service';
import { JoinBookmarksController } from './join-bookmarks.controller';
import { JoinBookmarksService } from './join-bookmarks.service';
import { FacilityFollowsController } from './facility-follows.controller';
import { FacilityFollowsService } from './facility-follows.service';
import { PublicJoinsController } from './public-joins.controller';
import { PublicJoinsService } from './public-joins.service';
import { FacilityWeeklyJoinsController } from './facility-weekly-joins.controller';
import { FacilityWeeklyJoinsService } from './facility-weekly-joins.service';
import { JoinEngagementNotifyService } from './join-engagement-notify.service';
import { JoinRecommendationsController } from './join-recommendations.controller';
import { JoinRecommendationsService } from './join-recommendations.service';
import { GolfFriendsController } from './golf-friends.controller';
import { GolfFriendsService } from './golf-friends.service';
import { PresenceModule } from '../presence/presence.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    NotificationsModule,
    AnalyticsModule,
    forwardRef(() => JoinsModule),
    PresenceModule,
    UsersModule,
  ],
  controllers: [
    JoinAlertsController,
    JoinBookmarksController,
    FacilityFollowsController,
    PublicJoinsController,
    FacilityWeeklyJoinsController,
    JoinRecommendationsController,
    GolfFriendsController,
  ],
  providers: [
    JoinAlertsService,
    JoinBookmarksService,
    FacilityFollowsService,
    PublicJoinsService,
    FacilityWeeklyJoinsService,
    JoinEngagementNotifyService,
    JoinRecommendationsService,
    GolfFriendsService,
  ],
  exports: [JoinEngagementNotifyService, JoinRecommendationsService],
})
export class EngagementModule {}
