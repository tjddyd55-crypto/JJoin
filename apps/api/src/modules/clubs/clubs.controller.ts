import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import type {
  BulkFinalizeClubEventAttendanceRequest,
  ClubJoinRequest,
  CreateClubAccountingEntryRequest,
  CreateClubEventRequest,
  CreateClubNoticeRequest,
  CreateClubRequest,
  UpdateClubEventAttendanceRequest,
} from '@jjoin/types';
import { CurrentUserId, MockAuthGuard } from '../../common/mock-auth.guard';
import { ClubsService } from './clubs.service';

@Controller('clubs')
export class ClubsController {
  constructor(private readonly service: ClubsService) {}

  @Post()
  @UseGuards(MockAuthGuard)
  create(@CurrentUserId() userId: string, @Body() body: CreateClubRequest) {
    return this.service.createClub(userId, body);
  }

  @Get('mine')
  @UseGuards(MockAuthGuard)
  mine(@CurrentUserId() userId: string) {
    return this.service.listMine(userId);
  }

  @Get('discover')
  @UseGuards(MockAuthGuard)
  discover(@CurrentUserId() userId: string) {
    return this.service.discover(userId);
  }

  @Get(':clubId')
  @UseGuards(MockAuthGuard)
  detail(@CurrentUserId() userId: string, @Param('clubId') clubId: string) {
    return this.service.getClubDetail(userId, clubId);
  }

  @Post(':clubId/join')
  @UseGuards(MockAuthGuard)
  join(
    @CurrentUserId() userId: string,
    @Param('clubId') clubId: string,
    @Body() body: ClubJoinRequest,
  ) {
    return this.service.joinClub(userId, clubId, body.inviteCode);
  }

  @Post(':clubId/leave')
  @UseGuards(MockAuthGuard)
  leave(@CurrentUserId() userId: string, @Param('clubId') clubId: string) {
    return this.service.leaveClub(userId, clubId);
  }

  @Get(':clubId/members')
  @UseGuards(MockAuthGuard)
  members(@CurrentUserId() userId: string, @Param('clubId') clubId: string) {
    return this.service.listMembers(userId, clubId);
  }

  @Post(':clubId/members/:membershipId/approve')
  @UseGuards(MockAuthGuard)
  approveMember(
    @CurrentUserId() userId: string,
    @Param('clubId') clubId: string,
    @Param('membershipId') membershipId: string,
  ) {
    return this.service.approveMembership(userId, clubId, membershipId);
  }

  @Get(':clubId/dashboard')
  @UseGuards(MockAuthGuard)
  async dashboard(@CurrentUserId() userId: string, @Param('clubId') clubId: string) {
    const detail = await this.service.getClubDetail(userId, clubId);
    return detail.dashboard;
  }

  @Post(':clubId/events')
  @UseGuards(MockAuthGuard)
  createEvent(
    @CurrentUserId() userId: string,
    @Param('clubId') clubId: string,
    @Body() body: CreateClubEventRequest,
  ) {
    return this.service.createEvent(userId, clubId, body);
  }

  @Get(':clubId/events')
  @UseGuards(MockAuthGuard)
  listEvents(@CurrentUserId() userId: string, @Param('clubId') clubId: string) {
    return this.service.listEvents(userId, clubId);
  }

  @Get(':clubId/events/:eventId')
  @UseGuards(MockAuthGuard)
  eventDetail(
    @CurrentUserId() userId: string,
    @Param('clubId') clubId: string,
    @Param('eventId') eventId: string,
  ) {
    return this.service.getEventDetail(userId, clubId, eventId);
  }

  @Patch(':clubId/events/:eventId/attendance/me')
  @UseGuards(MockAuthGuard)
  updateMyAttendance(
    @CurrentUserId() userId: string,
    @Param('clubId') clubId: string,
    @Param('eventId') eventId: string,
    @Body() body: UpdateClubEventAttendanceRequest,
  ) {
    return this.service.updateMyAttendance(userId, clubId, eventId, body);
  }

  @Post(':clubId/events/:eventId/attendance/finalize')
  @UseGuards(MockAuthGuard)
  finalizeAttendance(
    @CurrentUserId() userId: string,
    @Param('clubId') clubId: string,
    @Param('eventId') eventId: string,
    @Body() body: BulkFinalizeClubEventAttendanceRequest,
  ) {
    return this.service.finalizeAttendance(userId, clubId, eventId, body);
  }

  @Get(':clubId/members/:targetUserId/attendance-stats')
  @UseGuards(MockAuthGuard)
  memberAttendanceStats(
    @CurrentUserId() userId: string,
    @Param('clubId') clubId: string,
    @Param('targetUserId') targetUserId: string,
    @Query('period') period?: 'RECENT_30D' | 'THIS_YEAR' | 'ALL',
  ) {
    return this.service.getMemberAttendanceStats(
      userId,
      clubId,
      targetUserId,
      period ?? 'THIS_YEAR',
    );
  }

  @Get(':clubId/accounting')
  @UseGuards(MockAuthGuard)
  accounting(
    @CurrentUserId() userId: string,
    @Param('clubId') clubId: string,
    @Query('period') period?: 'THIS_MONTH' | 'THIS_YEAR' | 'ALL',
  ) {
    return this.service.listAccounting(userId, clubId, period ?? 'THIS_YEAR');
  }

  @Post(':clubId/accounting')
  @UseGuards(MockAuthGuard)
  createAccountingEntry(
    @CurrentUserId() userId: string,
    @Param('clubId') clubId: string,
    @Body() body: CreateClubAccountingEntryRequest,
  ) {
    return this.service.createAccountingEntry(userId, clubId, body);
  }

  @Get(':clubId/notices')
  @UseGuards(MockAuthGuard)
  notices(@CurrentUserId() userId: string, @Param('clubId') clubId: string) {
    return this.service.listNotices(userId, clubId);
  }

  @Post(':clubId/notices')
  @UseGuards(MockAuthGuard)
  createNotice(
    @CurrentUserId() userId: string,
    @Param('clubId') clubId: string,
    @Body() body: CreateClubNoticeRequest,
  ) {
    return this.service.createNotice(userId, clubId, body);
  }

  @Get(':clubId/events/:eventId/urgent-recruit-prefill')
  @UseGuards(MockAuthGuard)
  urgentRecruitPrefill(
    @CurrentUserId() userId: string,
    @Param('clubId') clubId: string,
    @Param('eventId') eventId: string,
  ) {
    return this.service.urgentRecruitPrefill(userId, clubId, eventId);
  }
}
