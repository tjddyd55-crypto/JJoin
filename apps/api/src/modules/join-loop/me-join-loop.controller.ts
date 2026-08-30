import { Controller, Get, UseGuards } from '@nestjs/common';
import { CurrentUserId, MockAuthGuard } from '../../common/mock-auth.guard';
import { PlayedTogetherService } from './played-together.service';
import { JoinInvitationService } from './join-invitation.service';

@Controller('me')
@UseGuards(MockAuthGuard)
export class MeJoinLoopController {
  constructor(
    private readonly playedTogether: PlayedTogetherService,
    private readonly invitations: JoinInvitationService,
  ) {}

  @Get('played-together')
  listPlayedTogether(@CurrentUserId() userId: string) {
    return this.playedTogether.listForUser(userId);
  }

  @Get('invitations')
  listInvitations(@CurrentUserId() userId: string) {
    return this.invitations.listMine(userId);
  }
}
