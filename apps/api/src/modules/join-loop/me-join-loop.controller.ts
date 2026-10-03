import { Controller, Get, UseGuards } from '@nestjs/common';
import { CurrentUserId, MockAuthGuard } from '../../common/mock-auth.guard';
import { PlayedTogetherService } from './played-together.service';
import { JoinInvitationService } from './join-invitation.service';
import { JoinSessionReviewService } from './join-session-review.service';
import type { MyJoinSessionReviewsHubDto } from '@jjoin/types';

@Controller('me')
@UseGuards(MockAuthGuard)
export class MeJoinLoopController {
  constructor(
    private readonly playedTogether: PlayedTogetherService,
    private readonly invitations: JoinInvitationService,
    private readonly sessionReviews: JoinSessionReviewService,
  ) {}

  @Get('played-together')
  listPlayedTogether(@CurrentUserId() userId: string) {
    return this.playedTogether.listForUser(userId);
  }

  @Get('invitations')
  listInvitations(@CurrentUserId() userId: string) {
    return this.invitations.listMine(userId);
  }

  @Get('join-session-reviews')
  myJoinSessionReviewsHub(@CurrentUserId() userId: string): Promise<MyJoinSessionReviewsHubDto> {
    return this.sessionReviews.getHubForUser(userId);
  }
}
