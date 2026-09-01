import { Module, forwardRef } from '@nestjs/common';
import { ClubsController } from './clubs.controller';
import { ClubsService } from './clubs.service';
import { ClubJoinLinkService } from './club-join-link.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { MockMediaAdapter } from '../../providers/mock.adapters';
import { JoinLoopModule } from '../join-loop/join-loop.module';

@Module({
  imports: [NotificationsModule, forwardRef(() => JoinLoopModule)],
  controllers: [ClubsController],
  providers: [ClubsService, ClubJoinLinkService, MockMediaAdapter],
  exports: [ClubsService, ClubJoinLinkService],
})
export class ClubsModule {}
