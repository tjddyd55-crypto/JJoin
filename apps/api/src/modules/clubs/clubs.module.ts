import { Module } from '@nestjs/common';
import { ClubsController } from './clubs.controller';
import { ClubsService } from './clubs.service';
import { ClubJoinLinkService } from './club-join-link.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { MockMediaAdapter } from '../../providers/mock.adapters';

@Module({
  imports: [NotificationsModule],
  controllers: [ClubsController],
  providers: [ClubsService, ClubJoinLinkService, MockMediaAdapter],
  exports: [ClubsService, ClubJoinLinkService],
})
export class ClubsModule {}
