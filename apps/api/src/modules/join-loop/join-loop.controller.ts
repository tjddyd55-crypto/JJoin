import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
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
import { JoinSessionReviewService } from './join-session-review.service';

type UploadedImageFile = { buffer: Buffer };

@Controller('joins')
export class JoinLoopController {
  constructor(
    private readonly urgent: UrgentVacancyService,
    private readonly attendance: AttendanceIntentService,
    private readonly chat: JoinChatService,
    private readonly invitations: JoinInvitationService,
    private readonly reviews: PlayerReviewService,
    private readonly sessionReviews: JoinSessionReviewService,
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

  @Get(':joinId/session-reviews')
  listSessionReviews(@Param('joinId') joinId: string) {
    return this.sessionReviews.listForJoin(joinId);
  }

  @Get(':joinId/session-reviews/me')
  @UseGuards(MockAuthGuard)
  mySessionReview(@Param('joinId') joinId: string, @CurrentUserId() userId: string) {
    return this.sessionReviews.getMine(joinId, userId);
  }

  @Post(':joinId/session-reviews')
  @UseGuards(MockAuthGuard)
  upsertSessionReview(
    @Param('joinId') joinId: string,
    @CurrentUserId() userId: string,
    @Body() body: unknown,
  ) {
    return this.sessionReviews.upsert(joinId, userId, body);
  }

  @Delete(':joinId/session-reviews/:reviewId')
  @UseGuards(MockAuthGuard)
  deleteSessionReview(
    @Param('joinId') joinId: string,
    @Param('reviewId') reviewId: string,
    @CurrentUserId() userId: string,
  ) {
    return this.sessionReviews.deleteReview(joinId, reviewId, userId);
  }

  @Post(':joinId/session-reviews/me/photos')
  @UseGuards(MockAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  addSessionReviewPhoto(
    @Param('joinId') joinId: string,
    @CurrentUserId() userId: string,
    @UploadedFile() file: UploadedImageFile | undefined,
  ) {
    if (!file?.buffer?.length) throw new BadRequestException('file_required');
    return this.sessionReviews.addPhoto(joinId, userId, file.buffer);
  }

  @Delete(':joinId/session-reviews/me/photos/:photoId')
  @UseGuards(MockAuthGuard)
  deleteSessionReviewPhoto(
    @Param('joinId') joinId: string,
    @Param('photoId') photoId: string,
    @CurrentUserId() userId: string,
  ) {
    return this.sessionReviews.deletePhoto(joinId, photoId, userId);
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
