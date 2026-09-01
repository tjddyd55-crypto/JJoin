import { randomBytes } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import {
  ClubEventAttendanceFinal,
  ClubEventAttendanceResponse,
  ClubEventStatus,
  ClubEventType,
  ClubMembershipRole,
  ClubMembershipStatus,
  ClubVisibility,
  NotificationType,
  type BulkFinalizeClubEventAttendanceRequest,
  type ClubAccountingListResponse,
  type ClubDetailDto,
  type ClubDiscoverResponse,
  type ClubEventDetailDto,
  type ClubEventListItemDto,
  type ClubEventListResponse,
  type ClubListResponse,
  type ClubMemberAttendanceStatsDto,
  type ClubMembershipDto,
  type ClubMembershipListResponse,
  type ClubNoticeDto,
  type ClubNoticeListResponse,
  type ClubSummaryDto,
  type ClubUrgentRecruitPrefillDto,
  type CreateClubAccountingEntryRequest,
  type CreateClubEventRequest,
  type CreateClubNoticeRequest,
  type CreateClubRequest,
  type UpdateClubAccountingEntryRequest,
  type UpdateClubNoticeRequest,
  type UpdateClubEventAttendanceRequest,
  type UploadClubCoverResponse,
  type ClubMemberAttendanceDetailDto,
} from '@jjoin/types';
import {
  computeClubAttendanceRate,
  computeEventAttendedCount,
  computeEventAttendanceDenominator,
  computeClubEventRemainingCapacity,
  computeEventOccupiedSeats,
  countAttendanceResponses,
  canApproveClubMembership,
  canFinalizeClubEventAttendance,
  canLeaveClub,
  canManageClubAccounting,
  canManageClubEvents,
  canManageClubNotices,
  canRespondToClubEventAttendance,
  canChangeMemberRole,
  canMemberUpdateAttendanceResponse,
  clubAgeGroupLabel,
  isClubStaff,
  kstYearStartUtc,
  rolling30DayStartUtc,
  summarizeMemberAttendanceRows,
} from '@jjoin/domain';
import {
  createClubAccountingEntrySchema,
  createClubEventSchema,
  createClubNoticeSchema,
  createClubSchema,
  updateClubEventAttendanceSchema,
  updateClubAccountingEntrySchema,
  updateClubNoticeSchema,
} from '@jjoin/validation';
import { MockMediaAdapter } from '../../providers/mock.adapters';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationEventService } from '../notifications/notification-event.service';
import { ClubJoinLinkService } from './club-join-link.service';
import { JoinChatService } from '../join-loop/join-chat.service';

type MembershipRow = {
  id: string;
  clubId: string;
  userId: string;
  role: string;
  status: string;
  joinedAt: Date | null;
};

@Injectable()
export class ClubsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationEventService,
    private readonly media: MockMediaAdapter,
    private readonly clubJoinLink: ClubJoinLinkService,
    @Inject(forwardRef(() => JoinChatService))
    private readonly joinChat: JoinChatService,
  ) {}

  async uploadCoverImage(userId: string, body: { localUri: string }): Promise<UploadClubCoverResponse> {
    const localUri = body.localUri?.trim();
    if (!localUri) throw new BadRequestException('invalid_cover_image');

    await this.media.createUploadUrl({ userId, contentType: 'image/jpeg' });
    const coverImageUrl = localUri.startsWith('http')
      ? localUri
      : `https://picsum.photos/seed/${encodeURIComponent(localUri.slice(-24))}/800/400`;

    await this.prisma.mediaAsset.create({
      data: {
        ownerUserId: userId,
        kind: 'OTHER',
        storageKey: localUri,
        mimeType: 'image/jpeg',
      },
    });

    return { coverImageUrl };
  }

  async createClub(userId: string, raw: CreateClubRequest): Promise<ClubSummaryDto> {
    const parsed = createClubSchema.safeParse(raw);
    if (!parsed.success) throw new BadRequestException('invalid_club_request');

    const inviteCode =
      parsed.data.visibility === ClubVisibility.PRIVATE ? this.generateInviteCode() : null;

    const club = await this.prisma.$transaction(async (tx) => {
      const created = await tx.club.create({
        data: {
          name: parsed.data.name,
          coverImageUrl: parsed.data.coverImageUrl ?? null,
          intro: parsed.data.intro ?? null,
          region: parsed.data.region,
          activityType: parsed.data.activityType,
          primaryVenueId: parsed.data.primaryVenueId ?? null,
          primaryVenueName: parsed.data.primaryVenueName ?? null,
          joinMode: parsed.data.joinMode,
          visibility: parsed.data.visibility,
          primaryAgeGroup: parsed.data.primaryAgeGroup ?? null,
          inviteCode,
          ownerUserId: userId,
        },
      });
      await tx.clubMembership.create({
        data: {
          clubId: created.id,
          userId,
          role: ClubMembershipRole.OWNER,
          status: ClubMembershipStatus.ACTIVE,
          joinedAt: new Date(),
        },
      });
      return created;
    });

    return this.toSummaryDto(club, {
      memberCount: 1,
      myRole: ClubMembershipRole.OWNER,
      myStatus: ClubMembershipStatus.ACTIVE,
    });
  }

  async listMine(userId: string): Promise<ClubListResponse> {
    const memberships = await this.prisma.clubMembership.findMany({
      where: { userId, status: { in: ['ACTIVE', 'PENDING'] } },
      include: { club: true },
      orderBy: { updatedAt: 'desc' },
    });
    const clubIds = memberships.map((m) => m.clubId);
    const memberCounts = await this.countMembersByClub(clubIds);
    return {
      items: memberships.map((m) =>
        this.toSummaryDto(m.club, {
          memberCount: memberCounts.get(m.clubId) ?? 0,
          myRole: m.role as ClubMembershipRole,
          myStatus: m.status as ClubMembershipStatus,
        }),
      ),
    };
  }

  async discover(userId: string): Promise<ClubDiscoverResponse> {
    const clubs = await this.prisma.club.findMany({
      where: { visibility: ClubVisibility.PUBLIC },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    if (!clubs.length) return { items: [] };

    const clubIds = clubs.map((c) => c.id);
    const [memberCounts, dashboards, myMemberships] = await Promise.all([
      this.countMembersByClub(clubIds),
      this.buildDashboardBatch(clubIds),
      this.prisma.clubMembership.findMany({
        where: { userId, clubId: { in: clubIds } },
      }),
    ]);
    const myByClub = new Map(myMemberships.map((m) => [m.clubId, m]));

    return {
      items: clubs
        .map((club) => {
          const dash = dashboards.get(club.id)!;
          const mine = myByClub.get(club.id);
          return {
            ...this.toSummaryDto(club, {
              memberCount: memberCounts.get(club.id) ?? 0,
              myRole: (mine?.role as ClubMembershipRole) ?? null,
              myStatus: (mine?.status as ClubMembershipStatus) ?? null,
            }),
            eventsThisYear: dash.eventsThisYear,
            totalAttended: dash.totalAttended,
            averageAttendanceRate: dash.averageAttendanceRate,
            recent30DayEvents: dash.recent30DayEvents,
            recent30DayAttendanceRate: dash.recent30DayAttendanceRate,
          };
        })
        .sort((a, b) => {
          if (b.recent30DayEvents !== a.recent30DayEvents) {
            return b.recent30DayEvents - a.recent30DayEvents;
          }
          return b.memberCount - a.memberCount;
        }),
    };
  }

  async getClubDetail(userId: string, clubId: string): Promise<ClubDetailDto> {
    const club = await this.requireClub(clubId);
    const membership = await this.getMembership(clubId, userId);
    if (club.visibility === ClubVisibility.PRIVATE && !membership) {
      throw new ForbiddenException('club_private');
    }

    const [memberCount, dashboard, activeEvents] = await Promise.all([
      this.countMembers(clubId),
      this.buildDashboard(clubId),
      this.listActiveEvents(clubId, userId),
    ]);

    return {
      ...this.toSummaryDto(club, {
        memberCount,
        myRole: (membership?.role as ClubMembershipRole) ?? null,
        myStatus: (membership?.status as ClubMembershipStatus) ?? null,
      }),
      dashboard,
      activeEvents,
    };
  }

  async joinClub(userId: string, clubId: string, inviteCode?: string | null): Promise<ClubMembershipDto> {
    const club = await this.requireClub(clubId);
    if (club.visibility === ClubVisibility.PRIVATE) {
      if (!inviteCode || inviteCode !== club.inviteCode) {
        throw new ForbiddenException('invalid_invite_code');
      }
    }

    const existing = await this.getMembership(clubId, userId);
    if (existing?.status === ClubMembershipStatus.ACTIVE) {
      throw new ConflictException('already_member');
    }
    if (existing?.status === ClubMembershipStatus.PENDING) {
      throw new ConflictException('join_pending');
    }

    const status =
      club.joinMode === 'INSTANT' ? ClubMembershipStatus.ACTIVE : ClubMembershipStatus.PENDING;

    const row = await this.prisma.clubMembership.create({
      data: {
        clubId,
        userId,
        role: ClubMembershipRole.MEMBER,
        status,
        joinedAt: status === ClubMembershipStatus.ACTIVE ? new Date() : null,
      },
      include: { user: { include: { profile: true } } },
    });

    if (status === ClubMembershipStatus.ACTIVE) {
      await this.notifyUser(userId, NotificationType.CLUB_JOIN_APPROVED, {
        title: '동호회 가입 완료',
        body: `${club.name}에 가입되었습니다.`,
        clubId,
      });
    }

    return this.toMembershipDto(row, null);
  }

  async approveMembership(
    actorUserId: string,
    clubId: string,
    membershipId: string,
  ): Promise<ClubMembershipDto> {
    const actor = await this.requireActiveMembership(clubId, actorUserId);
    if (!canApproveClubMembership(actor)) throw new ForbiddenException('club_forbidden');

    const row = await this.prisma.clubMembership.findFirst({
      where: { id: membershipId, clubId, status: ClubMembershipStatus.PENDING },
      include: { user: { include: { profile: true } } },
    });
    if (!row) throw new NotFoundException('membership_not_found');

    const updated = await this.prisma.clubMembership.update({
      where: { id: row.id },
      data: { status: ClubMembershipStatus.ACTIVE, joinedAt: new Date() },
      include: { user: { include: { profile: true } } },
    });

    const club = await this.requireClub(clubId);
    await this.notifyUser(updated.userId, NotificationType.CLUB_JOIN_APPROVED, {
      title: '동호회 가입 승인',
      body: `${club.name} 가입이 승인되었습니다.`,
      clubId,
    });

    return this.toMembershipDto(updated, null);
  }

  async rejectMembership(
    actorUserId: string,
    clubId: string,
    membershipId: string,
  ): Promise<{ ok: true }> {
    const actor = await this.requireActiveMembership(clubId, actorUserId);
    if (!canApproveClubMembership(actor)) throw new ForbiddenException('club_forbidden');

    const row = await this.prisma.clubMembership.findFirst({
      where: { id: membershipId, clubId, status: ClubMembershipStatus.PENDING },
    });
    if (!row) throw new NotFoundException('membership_not_found');

    await this.prisma.clubMembership.update({
      where: { id: row.id },
      data: { status: ClubMembershipStatus.REJECTED },
    });
    return { ok: true };
  }

  async updateMemberRole(
    actorUserId: string,
    clubId: string,
    membershipId: string,
    role: ClubMembershipRole.MANAGER | ClubMembershipRole.MEMBER,
  ): Promise<ClubMembershipDto> {
    const actor = await this.requireActiveMembership(clubId, actorUserId);
    const row = await this.prisma.clubMembership.findFirst({
      where: { id: membershipId, clubId, status: ClubMembershipStatus.ACTIVE },
      include: { user: { include: { profile: true } } },
    });
    if (!row) throw new NotFoundException('membership_not_found');
    if (!canChangeMemberRole(actor, row)) throw new ForbiddenException('club_forbidden');

    const updated = await this.prisma.clubMembership.update({
      where: { id: row.id },
      data: { role },
      include: { user: { include: { profile: true } } },
    });
    const stats = await this.buildMemberYearStats(clubId, [updated.userId]);
    return this.toMembershipDto(updated, stats.get(updated.userId) ?? null);
  }

  async listMembers(actorUserId: string, clubId: string): Promise<ClubMembershipListResponse> {
    await this.requireActiveMembership(clubId, actorUserId);
    const rows = await this.prisma.clubMembership.findMany({
      where: { clubId, status: { in: ['ACTIVE', 'PENDING'] } },
      include: { user: { include: { profile: true } } },
      orderBy: [{ status: 'asc' }, { role: 'asc' }, { joinedAt: 'asc' }],
    });
    const stats = await this.buildMemberYearStats(clubId, rows.map((r) => r.userId));
    return {
      items: rows.map((r) => this.toMembershipDto(r, stats.get(r.userId) ?? null)),
    };
  }

  async leaveClub(userId: string, clubId: string): Promise<{ ok: true }> {
    const membership = await this.requireActiveMembership(clubId, userId);
    if (!canLeaveClub(membership)) throw new ForbiddenException('owner_cannot_leave');
    await this.prisma.clubMembership.update({
      where: { id: membership.id },
      data: { status: ClubMembershipStatus.LEFT },
    });
    return { ok: true };
  }

  async createEvent(
    actorUserId: string,
    clubId: string,
    raw: CreateClubEventRequest,
  ): Promise<ClubEventDetailDto> {
    const actor = await this.requireActiveMembership(clubId, actorUserId);
    if (!canManageClubEvents(actor)) throw new ForbiddenException('club_forbidden');

    const parsed = createClubEventSchema.safeParse(raw);
    if (!parsed.success) throw new BadRequestException('invalid_event_request');

    if (parsed.data.eventType === ClubEventType.SCREEN && !parsed.data.venueId) {
      throw new BadRequestException('screen_event_requires_facility');
    }

    let venueName = parsed.data.venueName;
    let venueAddress = parsed.data.venueAddress ?? null;
    let venueId = parsed.data.venueId ?? null;
    let golfFacilityId = parsed.data.golfFacilityId ?? null;

    if (venueId) {
      const venue = await this.prisma.venue.findUnique({
        where: { id: venueId },
        select: { name: true, address: true, golfFacilityId: true },
      });
      if (!venue) throw new BadRequestException('venue_not_found');
      venueName = venue.name;
      venueAddress = venue.address ?? venueAddress;
      golfFacilityId = venue.golfFacilityId ?? golfFacilityId;
    }

    const activeMemberIds = await this.activeMemberUserIds(clubId);
    const event = await this.prisma.$transaction(async (tx) => {
      const created = await tx.clubEvent.create({
        data: {
          clubId,
          title: parsed.data.title,
          eventType: parsed.data.eventType,
          startsAt: new Date(parsed.data.startsAt),
          endsAt: parsed.data.endsAt ? new Date(parsed.data.endsAt) : null,
          venueName,
          venueAddress,
          venueId,
          golfFacilityId,
          capacity: parsed.data.capacity ?? null,
          responseDeadline: new Date(parsed.data.responseDeadline),
          memo: parsed.data.memo ?? null,
          status: ClubEventStatus.OPEN,
          createdByUserId: actorUserId,
        },
      });
      if (activeMemberIds.length) {
        await tx.clubEventAttendance.createMany({
          data: activeMemberIds.map((uid) => ({
            clubEventId: created.id,
            userId: uid,
            response: ClubEventAttendanceResponse.NO_RESPONSE,
          })),
          skipDuplicates: true,
        });
      }
      return created;
    });

    await this.notifyClubMembers(clubId, NotificationType.CLUB_EVENT_CREATED, {
      title: '새 모임 일정',
      body: event.title,
      clubId,
      clubEventId: event.id,
    });

    return this.getEventDetail(actorUserId, clubId, event.id);
  }

  async listEvents(actorUserId: string, clubId: string): Promise<ClubEventListResponse> {
    await this.requireActiveMembership(clubId, actorUserId);
    const events = await this.prisma.clubEvent.findMany({
      where: { clubId },
      orderBy: { startsAt: 'desc' },
      take: 100,
      include: {
        attendances: { select: { response: true, finalStatus: true, userId: true } },
        linkedJoin: { select: { id: true } },
      },
    });
    return {
      items: await Promise.all(events.map((e) => this.toEventListItem(e, actorUserId))),
    };
  }

  async getEventDetail(
    actorUserId: string,
    clubId: string,
    eventId: string,
  ): Promise<ClubEventDetailDto> {
    const actor = await this.requireActiveMembership(clubId, actorUserId);
    const event = await this.prisma.clubEvent.findFirst({
      where: { id: eventId, clubId },
      include: {
        attendances: {
          include: { user: { include: { profile: true } } },
          orderBy: { createdAt: 'asc' },
        },
        linkedJoin: { select: { id: true } },
      },
    });
    if (!event) throw new NotFoundException('event_not_found');

    const counts = countAttendanceResponses(event.attendances);
    const capacityFields = await this.resolveEventCapacityFields(
      eventId,
      event.capacity,
      event.attendances,
    );
    const finalizedAttendedCount = event.attendances.filter((a) => a.finalStatus === 'ATTENDED').length;
    const finalizedNoShowCount = event.attendances.filter((a) => a.finalStatus === 'NO_SHOW').length;
    const base = await this.toEventListItem(event, actorUserId);

    let eventAccounting: ClubEventDetailDto['eventAccounting'] = null;
    if (canManageClubAccounting(actor)) {
      const entries = await this.prisma.clubAccountingEntry.findMany({
        where: { clubId, clubEventId: eventId },
        select: { entryType: true, amount: true },
      });
      let income = 0;
      let expense = 0;
      for (const row of entries) {
        const amt = Number(row.amount);
        if (row.entryType === 'INCOME') income += amt;
        else expense += amt;
      }
      eventAccounting = {
        income: income.toFixed(0),
        expense: expense.toFixed(0),
        balance: (income - expense).toFixed(0),
      };
    }

    return {
      ...base,
      venueAddress: event.venueAddress,
      venueId: event.venueId,
      golfFacilityId: event.golfFacilityId,
      responseDeadline: event.responseDeadline.toISOString(),
      memo: event.memo,
      attendanceFinalized: Boolean(event.attendanceFinalizedAt),
      finalizedAttendedCount,
      finalizedNoShowCount,
      maybeCount: counts.maybe,
      memberAttendingCount: capacityFields.memberAttendingCount,
      externalParticipantCount: capacityFields.externalParticipantCount,
      totalOccupiedCount: capacityFields.totalOccupiedCount,
      remainingCapacity: capacityFields.remainingCapacity,
      eventAccounting,
      attendances: event.attendances.map((a) => ({
        userId: a.userId,
        nickname: a.user.profile?.nickname ?? '회원',
        response: a.response as ClubEventAttendanceResponse,
        finalStatus: (a.finalStatus as ClubEventAttendanceFinal) ?? null,
        respondedAt: a.respondedAt?.toISOString() ?? null,
      })),
    };
  }

  async updateMyAttendance(
    userId: string,
    clubId: string,
    eventId: string,
    raw: UpdateClubEventAttendanceRequest,
  ): Promise<ClubEventDetailDto> {
    const membership = await this.requireActiveMembership(clubId, userId);
    if (!canRespondToClubEventAttendance(membership)) throw new ForbiddenException('club_forbidden');

    const parsed = updateClubEventAttendanceSchema.safeParse(raw);
    if (!parsed.success) throw new BadRequestException('invalid_attendance_request');
    if (parsed.data.finalStatus != null) {
      throw new ForbiddenException('member_cannot_finalize');
    }
    if (!parsed.data.response) throw new BadRequestException('invalid_attendance_request');

    const event = await this.prisma.clubEvent.findFirst({ where: { id: eventId, clubId } });
    if (!event || event.status === ClubEventStatus.CANCELLED) {
      throw new NotFoundException('event_not_found');
    }
    if (event.attendanceFinalizedAt) {
      throw new BadRequestException('attendance_finalized');
    }
    if (!canMemberUpdateAttendanceResponse(membership, event.responseDeadline)) {
      throw new ForbiddenException('attendance_deadline_passed');
    }

    if (parsed.data.response === ClubEventAttendanceResponse.ATTENDING && event.capacity) {
      const rows = await this.prisma.clubEventAttendance.findMany({
        where: { clubEventId: eventId },
        select: { userId: true, response: true, finalStatus: true },
      });
      const projected = rows.map((row) =>
        row.userId === userId ? { ...row, response: ClubEventAttendanceResponse.ATTENDING } : row,
      );
      const { remainingCapacity } = await this.resolveEventCapacityFields(
        eventId,
        event.capacity,
        projected,
      );
      if ((remainingCapacity ?? 0) <= 0) throw new BadRequestException('event_full');
    }

    await this.prisma.clubEventAttendance.upsert({
      where: { clubEventId_userId: { clubEventId: eventId, userId } },
      create: {
        clubEventId: eventId,
        userId,
        response: parsed.data.response,
        respondedAt: new Date(),
      },
      update: {
        response: parsed.data.response,
        respondedAt: new Date(),
      },
    });

    void this.joinChat.syncClubLinkedJoinChat(eventId);

    return this.getEventDetail(userId, clubId, eventId);
  }

  async finalizeAttendance(
    actorUserId: string,
    clubId: string,
    eventId: string,
    raw: BulkFinalizeClubEventAttendanceRequest,
  ): Promise<ClubEventDetailDto> {
    const actor = await this.requireActiveMembership(clubId, actorUserId);
    if (!canFinalizeClubEventAttendance(actor)) throw new ForbiddenException('club_forbidden');

    const event = await this.prisma.clubEvent.findFirst({ where: { id: eventId, clubId } });
    if (!event) throw new NotFoundException('event_not_found');
    if (event.attendanceFinalizedAt) {
      return this.getEventDetail(actorUserId, clubId, eventId);
    }

    await this.prisma.$transaction(async (tx) => {
      for (const item of raw.items) {
        await tx.clubEventAttendance.updateMany({
          where: { clubEventId: eventId, userId: item.userId },
          data: { finalStatus: item.finalStatus },
        });
      }
      await tx.clubEvent.update({
        where: { id: eventId },
        data: {
          attendanceFinalizedAt: new Date(),
          status: ClubEventStatus.COMPLETED,
        },
      });
    });

    void this.joinChat.syncClubLinkedJoinChat(eventId);

    return this.getEventDetail(actorUserId, clubId, eventId);
  }

  async getMemberAttendanceStats(
    actorUserId: string,
    clubId: string,
    targetUserId: string,
    period: 'RECENT_30D' | 'THIS_YEAR' | 'ALL',
  ): Promise<ClubMemberAttendanceStatsDto> {
    const actor = await this.requireActiveMembership(clubId, actorUserId);
    if (actorUserId !== targetUserId && !isClubStaff(actor)) {
      throw new ForbiddenException('club_forbidden');
    }
    const profile = await this.prisma.userProfile.findUnique({ where: { userId: targetUserId } });
    const since = this.periodSince(period);

    const events = await this.prisma.clubEvent.findMany({
      where: {
        clubId,
        ...(since ? { startsAt: { gte: since } } : {}),
        status: { in: ['COMPLETED', 'SCHEDULED', 'IN_PROGRESS', 'OPEN'] },
      },
      include: {
        attendances: { where: { userId: targetUserId } },
      },
    });

    const rows = events.flatMap((event) => event.attendances);
    const summary = summarizeMemberAttendanceRows(rows);

    return {
      userId: targetUserId,
      nickname: profile?.nickname ?? '회원',
      period,
      targetEvents: summary.targetEvents,
      attended: summary.attended,
      declined: summary.declined,
      noResponse: summary.noResponse,
      noShow: summary.noShow,
      averageAttendanceRate: summary.averageAttendanceRate,
    };
  }

  async getMemberAttendanceDetail(
    actorUserId: string,
    clubId: string,
    targetUserId: string,
    period: 'RECENT_30D' | 'THIS_YEAR' | 'ALL',
  ): Promise<ClubMemberAttendanceDetailDto> {
    const stats = await this.getMemberAttendanceStats(actorUserId, clubId, targetUserId, period);
    const since = this.periodSince(period);

    const events = await this.prisma.clubEvent.findMany({
      where: {
        clubId,
        ...(since ? { startsAt: { gte: since } } : {}),
        status: { in: ['COMPLETED', 'SCHEDULED', 'IN_PROGRESS', 'OPEN', 'CANCELLED'] },
        attendances: { some: { userId: targetUserId } },
      },
      include: {
        attendances: { where: { userId: targetUserId } },
      },
      orderBy: { startsAt: 'desc' },
      take: 50,
    });

    return {
      ...stats,
      history: events.map((event) => {
        const row = event.attendances[0]!;
        return {
          eventId: event.id,
          title: event.title,
          startsAt: event.startsAt.toISOString(),
          response: row.response as ClubEventAttendanceResponse,
          finalStatus: (row.finalStatus as ClubEventAttendanceFinal) ?? null,
        };
      }),
    };
  }

  async listAccounting(
    actorUserId: string,
    clubId: string,
    period: 'THIS_MONTH' | 'THIS_YEAR' | 'ALL' = 'THIS_YEAR',
  ): Promise<ClubAccountingListResponse> {
    const actor = await this.requireActiveMembership(clubId, actorUserId);
    if (!canManageClubAccounting(actor)) throw new ForbiddenException('club_forbidden');

    const since = this.accountingPeriodSince(period);
    const entries = await this.prisma.clubAccountingEntry.findMany({
      where: { clubId, ...(since ? { entryDate: { gte: since } } : {}) },
      orderBy: [{ entryDate: 'desc' }, { createdAt: 'desc' }],
      take: 200,
    });

    const all = await this.prisma.clubAccountingEntry.findMany({
      where: { clubId },
      select: { entryType: true, amount: true, entryDate: true },
    });

    let income = 0;
    let expense = 0;
    let incomeYear = 0;
    let expenseYear = 0;
    const yearStart = this.yearStart();
    for (const row of all) {
      const amt = Number(row.amount);
      if (row.entryType === 'INCOME') {
        income += amt;
        if (row.entryDate >= yearStart) incomeYear += amt;
      } else {
        expense += amt;
        if (row.entryDate >= yearStart) expenseYear += amt;
      }
    }

    return {
      summary: {
        balance: (income - expense).toFixed(0),
        incomeThisYear: incomeYear.toFixed(0),
        expenseThisYear: expenseYear.toFixed(0),
      },
      items: entries.map((e) => ({
        id: e.id,
        entryType: e.entryType as ClubAccountingListResponse['items'][number]['entryType'],
        category: e.category as ClubAccountingListResponse['items'][number]['category'],
        amount: String(e.amount),
        entryDate: e.entryDate.toISOString().slice(0, 10),
        memo: e.memo,
        clubEventId: e.clubEventId,
        createdAt: e.createdAt.toISOString(),
      })),
    };
  }

  async createAccountingEntry(
    actorUserId: string,
    clubId: string,
    raw: CreateClubAccountingEntryRequest,
  ) {
    const actor = await this.requireActiveMembership(clubId, actorUserId);
    if (!canManageClubAccounting(actor)) throw new ForbiddenException('club_forbidden');

    const parsed = createClubAccountingEntrySchema.safeParse(raw);
    if (!parsed.success) throw new BadRequestException('invalid_accounting_entry');

    const row = await this.prisma.clubAccountingEntry.create({
      data: {
        clubId,
        entryType: parsed.data.entryType,
        category: parsed.data.category,
        amount: parsed.data.amount,
        entryDate: new Date(`${parsed.data.entryDate}T00:00:00.000Z`),
        memo: parsed.data.memo ?? null,
        clubEventId: parsed.data.clubEventId ?? null,
        createdByUserId: actorUserId,
      },
    });

    return {
      id: row.id,
      entryType: row.entryType,
      category: row.category,
      amount: String(row.amount),
      entryDate: row.entryDate.toISOString().slice(0, 10),
      memo: row.memo,
      clubEventId: row.clubEventId,
      createdAt: row.createdAt.toISOString(),
    };
  }

  async updateAccountingEntry(
    actorUserId: string,
    clubId: string,
    entryId: string,
    raw: UpdateClubAccountingEntryRequest,
  ) {
    const actor = await this.requireActiveMembership(clubId, actorUserId);
    if (!canManageClubAccounting(actor)) throw new ForbiddenException('club_forbidden');

    const parsed = updateClubAccountingEntrySchema.safeParse(raw);
    if (!parsed.success) throw new BadRequestException('invalid_accounting_entry');

    const existing = await this.prisma.clubAccountingEntry.findFirst({
      where: { id: entryId, clubId },
    });
    if (!existing) throw new NotFoundException('accounting_entry_not_found');

    const row = await this.prisma.clubAccountingEntry.update({
      where: { id: entryId },
      data: {
        ...(parsed.data.entryType != null ? { entryType: parsed.data.entryType } : {}),
        ...(parsed.data.category != null ? { category: parsed.data.category } : {}),
        ...(parsed.data.amount != null ? { amount: parsed.data.amount } : {}),
        ...(parsed.data.entryDate != null
          ? { entryDate: new Date(`${parsed.data.entryDate}T00:00:00.000Z`) }
          : {}),
        ...(parsed.data.memo !== undefined ? { memo: parsed.data.memo ?? null } : {}),
        ...(parsed.data.clubEventId !== undefined
          ? { clubEventId: parsed.data.clubEventId ?? null }
          : {}),
      },
    });

    return {
      id: row.id,
      entryType: row.entryType,
      category: row.category,
      amount: String(row.amount),
      entryDate: row.entryDate.toISOString().slice(0, 10),
      memo: row.memo,
      clubEventId: row.clubEventId,
      createdAt: row.createdAt.toISOString(),
    };
  }

  async deleteAccountingEntry(actorUserId: string, clubId: string, entryId: string) {
    const actor = await this.requireActiveMembership(clubId, actorUserId);
    if (!canManageClubAccounting(actor)) throw new ForbiddenException('club_forbidden');

    const existing = await this.prisma.clubAccountingEntry.findFirst({
      where: { id: entryId, clubId },
    });
    if (!existing) throw new NotFoundException('accounting_entry_not_found');

    await this.prisma.clubAccountingEntry.delete({ where: { id: entryId } });
    return { ok: true as const };
  }

  async listNotices(actorUserId: string, clubId: string): Promise<ClubNoticeListResponse> {
    await this.requireActiveMembership(clubId, actorUserId);
    const rows = await this.prisma.clubNotice.findMany({
      where: { clubId },
      orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
      take: 50,
    });
    return {
      items: rows.map((n) => ({
        id: n.id,
        title: n.title,
        body: n.body,
        pinned: n.pinned,
        createdAt: n.createdAt.toISOString(),
      })),
    };
  }

  async createNotice(
    actorUserId: string,
    clubId: string,
    raw: CreateClubNoticeRequest,
  ): Promise<ClubNoticeDto> {
    const actor = await this.requireActiveMembership(clubId, actorUserId);
    if (!canManageClubNotices(actor)) throw new ForbiddenException('club_forbidden');

    const parsed = createClubNoticeSchema.safeParse(raw);
    if (!parsed.success) throw new BadRequestException('invalid_notice');

    const row = await this.prisma.clubNotice.create({
      data: {
        clubId,
        title: parsed.data.title,
        body: parsed.data.body,
        pinned: parsed.data.pinned ?? false,
        sendPush: parsed.data.sendPush ?? false,
        createdByUserId: actorUserId,
      },
    });

    if (parsed.data.sendPush) {
      await this.notifyClubMembers(clubId, NotificationType.CLUB_NOTICE, {
        title: row.title,
        body: row.body.slice(0, 120),
        clubId,
        noticeId: row.id,
      });
    }

    return {
      id: row.id,
      title: row.title,
      body: row.body,
      pinned: row.pinned,
      createdAt: row.createdAt.toISOString(),
    };
  }

  async updateNotice(
    actorUserId: string,
    clubId: string,
    noticeId: string,
    raw: UpdateClubNoticeRequest,
  ): Promise<ClubNoticeDto> {
    const actor = await this.requireActiveMembership(clubId, actorUserId);
    if (!canManageClubNotices(actor)) throw new ForbiddenException('club_forbidden');

    const parsed = updateClubNoticeSchema.safeParse(raw);
    if (!parsed.success) throw new BadRequestException('invalid_notice');

    const existing = await this.prisma.clubNotice.findFirst({ where: { id: noticeId, clubId } });
    if (!existing) throw new NotFoundException('notice_not_found');

    const row = await this.prisma.clubNotice.update({
      where: { id: noticeId },
      data: {
        ...(parsed.data.title != null ? { title: parsed.data.title } : {}),
        ...(parsed.data.body != null ? { body: parsed.data.body } : {}),
        ...(parsed.data.pinned != null ? { pinned: parsed.data.pinned } : {}),
      },
    });

    return {
      id: row.id,
      title: row.title,
      body: row.body,
      pinned: row.pinned,
      createdAt: row.createdAt.toISOString(),
    };
  }

  async deleteNotice(actorUserId: string, clubId: string, noticeId: string) {
    const actor = await this.requireActiveMembership(clubId, actorUserId);
    if (!canManageClubNotices(actor)) throw new ForbiddenException('club_forbidden');

    const existing = await this.prisma.clubNotice.findFirst({ where: { id: noticeId, clubId } });
    if (!existing) throw new NotFoundException('notice_not_found');

    await this.prisma.clubNotice.delete({ where: { id: noticeId } });
    return { ok: true as const };
  }

  async urgentRecruitPrefill(
    actorUserId: string,
    clubId: string,
    eventId: string,
  ): Promise<ClubUrgentRecruitPrefillDto> {
    const actor = await this.requireActiveMembership(clubId, actorUserId);
    if (!canManageClubEvents(actor)) throw new ForbiddenException('club_forbidden');

    const event = await this.prisma.clubEvent.findFirst({
      where: { id: eventId, clubId },
      include: { attendances: { select: { response: true } } },
    });
    if (!event) throw new NotFoundException('event_not_found');

    const counts = countAttendanceResponses(event.attendances);
    const external = await this.clubJoinLink.countExternalParticipants(eventId);
    const remainingSeats =
      computeClubEventRemainingCapacity(event.capacity, counts.attending, external) ?? 0;
    if (remainingSeats <= 0) throw new BadRequestException('no_remaining_seats');

    return {
      clubId,
      clubEventId: event.id,
      title: event.title,
      venueName: event.venueName,
      venueAddress: event.venueAddress,
      venueId: event.venueId,
      golfFacilityId: event.golfFacilityId,
      startsAt: event.startsAt.toISOString(),
      remainingSeats,
    };
  }

  private async listActiveEvents(clubId: string, userId: string): Promise<ClubEventListItemDto[]> {
    const events = await this.prisma.clubEvent.findMany({
      where: {
        clubId,
        status: { in: ['OPEN', 'SCHEDULED', 'IN_PROGRESS'] },
      },
      orderBy: { startsAt: 'asc' },
      take: 20,
      include: {
        attendances: { select: { response: true, finalStatus: true, userId: true } },
        linkedJoin: { select: { id: true } },
      },
    });
    return Promise.all(events.map((e) => this.toEventListItem(e, userId)));
  }

  private async resolveEventCapacityFields(
    eventId: string,
    capacity: number | null,
    attendances: Array<{ response: string; finalStatus?: string | null }>,
  ) {
    const counts = countAttendanceResponses(attendances);
    const externalParticipantCount = await this.clubJoinLink.countExternalParticipants(eventId);
    const memberAttendingCount = counts.attending;
    const totalOccupiedCount = computeEventOccupiedSeats({
      memberAttendingCount,
      externalParticipantCount,
    });
    const remainingCapacity = computeClubEventRemainingCapacity(
      capacity,
      memberAttendingCount,
      externalParticipantCount,
    );
    return {
      memberAttendingCount,
      externalParticipantCount,
      totalOccupiedCount,
      remainingCapacity,
    };
  }

  private async toEventListItem(
    event: {
      id: string;
      title: string;
      eventType: string;
      startsAt: Date;
      venueName: string;
      status: string;
      capacity: number | null;
      attendances: Array<{ response: string; finalStatus: string | null; userId: string }>;
      linkedJoin?: { id: string } | null;
    },
    userId: string,
  ): Promise<ClubEventListItemDto> {
    const counts = countAttendanceResponses(event.attendances);
    const capacityFields = await this.resolveEventCapacityFields(
      event.id,
      event.capacity,
      event.attendances,
    );
    const mine = event.attendances.find((a) => a.userId === userId);
    return {
      id: event.id,
      title: event.title,
      eventType: event.eventType as ClubEventListItemDto['eventType'],
      startsAt: event.startsAt.toISOString(),
      venueName: event.venueName,
      status: event.status as ClubEventListItemDto['status'],
      capacity: event.capacity,
      attendingCount: counts.attending,
      declinedCount: counts.declined,
      noResponseCount: counts.noResponse,
      remainingCapacity: capacityFields.remainingCapacity,
      myResponse: (mine?.response as ClubEventAttendanceResponse) ?? null,
      linkedJoinId: event.linkedJoin?.id ?? null,
    };
  }

  private async buildDashboard(clubId: string) {
    const map = await this.buildDashboardBatch([clubId]);
    const dash = map.get(clubId)!;
    const memberCount = await this.countMembers(clubId);
    return { ...dash, memberCount };
  }

  private async buildDashboardBatch(clubIds: string[]) {
    if (!clubIds.length) return new Map();

    const yearStart = kstYearStartUtc();
    const recentSince = rolling30DayStartUtc();

    const completedEvents = await this.prisma.clubEvent.findMany({
      where: {
        clubId: { in: clubIds },
        status: ClubEventStatus.COMPLETED,
        attendanceFinalizedAt: { not: null },
      },
      include: { attendances: { select: { response: true, finalStatus: true } } },
    });

    const yearEvents = completedEvents.filter((e) => e.startsAt >= yearStart);
    const recentEvents = completedEvents.filter((e) => e.startsAt >= recentSince);

    const result = new Map<
      string,
      {
        eventsThisYear: number;
        totalAttended: number;
        averageAttendanceRate: number | null;
        recent30DayEvents: number;
        recent30DayAttendanceRate: number | null;
      }
    >();

    for (const clubId of clubIds) {
      const clubYear = yearEvents.filter((e) => e.clubId === clubId);
      const clubRecent = recentEvents.filter((e) => e.clubId === clubId);

      let totalAttended = 0;
      const yearRates: number[] = [];
      for (const event of clubYear) {
        totalAttended += computeEventAttendedCount(event.attendances);
        const denom = computeEventAttendanceDenominator(event.attendances);
        const rate = computeClubAttendanceRate({
          attendedCount: computeEventAttendedCount(event.attendances),
          denominatorCount: denom,
        });
        if (rate != null) yearRates.push(rate);
      }

      const recentRates: number[] = [];
      for (const event of clubRecent) {
        const denom = computeEventAttendanceDenominator(event.attendances);
        const rate = computeClubAttendanceRate({
          attendedCount: computeEventAttendedCount(event.attendances),
          denominatorCount: denom,
        });
        if (rate != null) recentRates.push(rate);
      }

      const avg = (values: number[]) =>
        values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : null;

      result.set(clubId, {
        eventsThisYear: clubYear.length,
        totalAttended,
        averageAttendanceRate: avg(yearRates),
        recent30DayEvents: clubRecent.length,
        recent30DayAttendanceRate: avg(recentRates),
      });
    }

    return result;
  }

  private async buildMemberYearStats(clubId: string, userIds: string[]) {
    const yearStart = this.yearStart();
    const events = await this.prisma.clubEvent.findMany({
      where: {
        clubId,
        startsAt: { gte: yearStart },
        status: ClubEventStatus.COMPLETED,
        attendanceFinalizedAt: { not: null },
      },
      include: {
        attendances: {
          where: { userId: { in: userIds } },
          select: { userId: true, response: true, finalStatus: true },
        },
      },
    });

    const stats = new Map<string, number | null>();
    for (const userId of userIds) {
      let attended = 0;
      let denom = 0;
      for (const event of events) {
        const row = event.attendances.find((a) => a.userId === userId);
        if (!row) continue;
        if (row.finalStatus === 'ATTENDED' || row.finalStatus === 'NO_SHOW') {
          denom += 1;
          if (row.finalStatus === 'ATTENDED') attended += 1;
        } else if (row.response === 'ATTENDING' || row.response === 'MAYBE') {
          denom += 1;
        }
      }
      stats.set(userId, computeClubAttendanceRate({ attendedCount: attended, denominatorCount: denom }));
    }
    return stats;
  }

  private async countMembers(clubId: string) {
    return this.prisma.clubMembership.count({
      where: { clubId, status: ClubMembershipStatus.ACTIVE },
    });
  }

  private async countMembersByClub(clubIds: string[]) {
    const rows = await this.prisma.clubMembership.groupBy({
      by: ['clubId'],
      where: { clubId: { in: clubIds }, status: ClubMembershipStatus.ACTIVE },
      _count: { _all: true },
    });
    return new Map(rows.map((r) => [r.clubId, r._count._all]));
  }

  private async activeMemberUserIds(clubId: string) {
    const rows = await this.prisma.clubMembership.findMany({
      where: { clubId, status: ClubMembershipStatus.ACTIVE },
      select: { userId: true },
    });
    return rows.map((r) => r.userId);
  }

  private async requireClub(clubId: string) {
    const club = await this.prisma.club.findUnique({ where: { id: clubId } });
    if (!club) throw new NotFoundException('club_not_found');
    return club;
  }

  private async getMembership(clubId: string, userId: string): Promise<MembershipRow | null> {
    return this.prisma.clubMembership.findUnique({
      where: { clubId_userId: { clubId, userId } },
    });
  }

  private async requireActiveMembership(clubId: string, userId: string): Promise<MembershipRow> {
    const row = await this.getMembership(clubId, userId);
    if (!row || row.status !== ClubMembershipStatus.ACTIVE) {
      throw new ForbiddenException('club_membership_required');
    }
    return row;
  }

  private toSummaryDto(
    club: {
      id: string;
      name: string;
      coverImageUrl: string | null;
      intro: string | null;
      region: string;
      activityType: string;
      primaryVenueName: string | null;
      joinMode: string;
      visibility: string;
      primaryAgeGroup: string | null;
    },
    extra: {
      memberCount: number;
      myRole: ClubMembershipRole | null;
      myStatus: ClubMembershipStatus | null;
    },
  ): ClubSummaryDto {
    return {
      id: club.id,
      name: club.name,
      coverImageUrl: club.coverImageUrl,
      intro: club.intro,
      region: club.region,
      activityType: club.activityType as ClubSummaryDto['activityType'],
      primaryVenueName: club.primaryVenueName,
      joinMode: club.joinMode as ClubSummaryDto['joinMode'],
      visibility: club.visibility as ClubSummaryDto['visibility'],
      primaryAgeGroup: (club.primaryAgeGroup as ClubSummaryDto['primaryAgeGroup']) ?? null,
      memberCount: extra.memberCount,
      myRole: extra.myRole,
      myStatus: extra.myStatus,
    };
  }

  private toMembershipDto(
    row: {
      id: string;
      userId: string;
      role: string;
      status: string;
      joinedAt: Date | null;
      createdAt: Date;
      user: { profile: { nickname: string; ageBand: string | null } | null };
    },
    attendanceRateThisYear: number | null,
  ): ClubMembershipDto {
    return {
      id: row.id,
      userId: row.userId,
      nickname: row.user.profile?.nickname ?? '회원',
      role: row.role as ClubMembershipDto['role'],
      status: row.status as ClubMembershipDto['status'],
      joinedAt: row.joinedAt?.toISOString() ?? null,
      requestedAt: row.createdAt.toISOString(),
      attendanceRateThisYear,
      ageGroupLabel: clubAgeGroupLabel(row.user.profile?.ageBand ?? null),
    };
  }

  private generateInviteCode() {
    return randomBytes(4).toString('hex').toUpperCase();
  }

  private yearStart() {
    return kstYearStartUtc();
  }

  private periodSince(period: 'RECENT_30D' | 'THIS_YEAR' | 'ALL') {
    if (period === 'ALL') return null;
    if (period === 'THIS_YEAR') return kstYearStartUtc();
    return rolling30DayStartUtc();
  }

  private accountingPeriodSince(period: 'THIS_MONTH' | 'THIS_YEAR' | 'ALL') {
    if (period === 'ALL') return null;
    if (period === 'THIS_YEAR') return this.yearStart();
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  }

  private async notifyUser(
    userId: string,
    type: NotificationType,
    payload: { title: string; body: string; clubId?: string; clubEventId?: string; noticeId?: string },
  ) {
    const suffix = payload.noticeId ?? payload.clubEventId ?? payload.clubId ?? userId;
    await this.notifications.enqueueSafe({
      userId,
      type: type as never,
      title: payload.title,
      body: payload.body,
      data: {
        type,
        clubId: payload.clubId,
        clubEventId: payload.clubEventId,
        noticeId: payload.noticeId,
      },
      eventKey: `club:${type}:${suffix}:${userId}`,
    });
  }

  private async notifyClubMembers(
    clubId: string,
    type: NotificationType,
    payload: { title: string; body: string; clubId?: string; clubEventId?: string; noticeId?: string },
  ) {
    const members = await this.activeMemberUserIds(clubId);
    await Promise.all(members.map((userId) => this.notifyUser(userId, type, payload)));
  }
}
