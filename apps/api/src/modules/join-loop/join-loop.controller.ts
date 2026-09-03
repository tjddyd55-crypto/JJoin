import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import type {
  ActivateUrgentVacancyRequest,
  CreateJoinInvitationsRequest,
  PostJoinChatMessageRequest,
  SetAttendanceIntentRequest,
  UpsertPlayerReviewRequest,
} from '@jjoin/types';
import { CurrentUserId, MockAuthGuard } from '../../common/mock-auth.guard';
import { UrgentVacancyService } from './urgent-vacancy.service';
import { AttendanceIntentService } from './attendance-intent.service';
import { JoinChatService } from './join-chat.service';
import { JoinInvitationService } from './join-invitation.service';
import { PlayerReviewService } from './player-review.service';

@Controller('joins')
export class JoinLoopController {
  constructor(
    private readonly urgent: UrgentVacancyService,
    private readonly attendance: AttendanceIntentService,
    private readonly chat: JoinChatService,
    private readonly invitations: JoinInvitationService,
    private readonly reviews: PlayerReviewService,
  ) {}

  /** Cron: purge chat messages/members after purgeAfter. Must be before :joinId routes. */
  @Post('chat/purge-run')
  purgeChat(
    @Headers('x-settlement-cron-secret') headerSecret?: string,
    @Headers('authorization') authorization?: string,
  ) {
    return this.chat.purgeRun({
      'x-settlement-cron-secret': headerSecret,
      authorization,
    });
  }

  @Post(':joinId/urgent')
  @UseGuards(MockAuthGuard)
  activateUrgent(
    @Param('joinId') joinId: string,
    @CurrentUserId() userId: string,
    @Body() body: ActivateUrgentVacancyRequest,
  ) {
    return this.urgent.activate(joinId, userId, body ?? {});
  }

  @Delete(':joinId/urgent')
  @UseGuards(MockAuthGuard)
  clearUrgent(@Param('joinId') joinId: string, @CurrentUserId() userId: string) {
    return this.urgent.clear(joinId, userId);
  }

  @Post(':joinId/attendance-intent')
  @UseGuards(MockAuthGuard)
  setAttendanceIntent(
    @Param('joinId') joinId: string,
    @CurrentUserId() userId: string,
    @Body() body: SetAttendanceIntentRequest,
  ) {
    return this.attendance.setIntent(joinId, userId, body);
  }

  @Get(':joinId/chat')
  @UseGuards(MockAuthGuard)
  getChat(@Param('joinId') joinId: string, @CurrentUserId() userId: string) {
    return this.chat.getRoom(joinId, userId);
  }

  @Get(':joinId/chat/messages')
  @UseGuards(MockAuthGuard)
  listMessages(
    @Param('joinId') joinId: string,
    @CurrentUserId() userId: string,
    @Query('before') before?: string,
    @Query('limit') limit?: string,
  ) {
    return this.chat.listMessages(joinId, userId, {
      before,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Post(':joinId/chat/messages')
  @UseGuards(MockAuthGuard)
  postMessage(
    @Param('joinId') joinId: string,
    @CurrentUserId() userId: string,
    @Body() body: PostJoinChatMessageRequest,
  ) {
    return this.chat.postMessage(joinId, userId, body);
  }

  @Post(':joinId/invitations')
  @UseGuards(MockAuthGuard)
  createInvitations(
    @Param('joinId') joinId: string,
    @CurrentUserId() userId: string,
    @Body() body: CreateJoinInvitationsRequest,
  ) {
    return this.invitations.createInvitations(joinId, userId, body);
  }

  @Post(':joinId/invitations/:invitationId/accept')
  @UseGuards(MockAuthGuard)
  acceptInvitation(
    @Param('joinId') joinId: string,
    @Param('invitationId') invitationId: string,
    @CurrentUserId() userId: string,
  ) {
    return this.invitations.accept(joinId, invitationId, userId);
  }

  @Post(':joinId/invitations/:invitationId/decline')
  @UseGuards(MockAuthGuard)
  declineInvitation(
    @Param('joinId') joinId: string,
    @Param('invitationId') invitationId: string,
    @CurrentUserId() userId: string,
  ) {
    return this.invitations.decline(joinId, invitationId, userId);
  }

  @Get(':joinId/review-targets')
  @UseGuards(MockAuthGuard)
  reviewTargets(@Param('joinId') joinId: string, @CurrentUserId() userId: string) {
    return this.reviews.listReviewTargets(joinId, userId);
  }

  @Post(':joinId/reviews')
  @UseGuards(MockAuthGuard)
  upsertReview(
    @Param('joinId') joinId: string,
    @CurrentUserId() userId: string,
    @Body() body: UpsertPlayerReviewRequest,
  ) {
    return this.reviews.upsertReview(joinId, userId, body ?? ({} as UpsertPlayerReviewRequest));
  }
}
