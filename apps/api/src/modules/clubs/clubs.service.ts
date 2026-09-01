import { randomBytes } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ClubEventAttendanceFinal,
  ClubEventAttendanceResponse,
  ClubEventStatus,
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
  type UpdateClubEventAttendanceRequest,
} from '@jjoin/types';
import {
  computeClubAttendanceRate,
  computeEventAttendedCount,
  computeEventAttendanceDenominator,
  computeRemainingEventCapacity,
  countAttendanceResponses,
  canApproveClubMembership,
  canFinalizeClubEventAttendance,
  canLeaveClub,
  canManageClubAccounting,
  canManageClubEvents,
  canManageClubNotices,
  canRespondToClubEventAttendance,
} from '@jjoin/domain';
import {
  createClubAccountingEntrySchema,
  createClubEventSchema,
  createClubNoticeSchema,
  createClubSchema,
  updateClubEventAttendanceSchema,
} from '@jjoin/validation';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationEventService } from '../notifications/notification-event.service';

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
  ) {}

  async createClub(userId: string, raw: CreateClubRequest): Promise<ClubSummaryDto> {
    const parsed = createClubSchema.safeParse(raw);
    if (!parsed.success) throw new BadRequestException('invalid_club_request');

    const inviteCode =
      parsed.data.visibility === ClubVisibility.PRIVATE ? this.generateInviteCode() : null;

    const club = await this.prisma.$transaction(async (tx) => {
      const created = await tx.club.create({
        data: {
          name: parsed.data.name,
          coverImageUrl: parsed.data.coverImageUrl,
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
      items: clubs.map((club) => {
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

    const activeMemberIds = await this.activeMemberUserIds(clubId);
    const event = await this.prisma.$transaction(async (tx) => {
      const created = await tx.clubEvent.create({
        data: {
          clubId,
          title: parsed.data.title,
          eventType: parsed.data.eventType,
          startsAt: new Date(parsed.data.startsAt),
          endsAt: parsed.data.endsAt ? new Date(parsed.data.endsAt) : null,
          venueName: parsed.data.venueName,
          venueAddress: parsed.data.venueAddress ?? null,
          venueId: parsed.data.venueId ?? null,
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
      items: events.map((e) => this.toEventListItem(e, actorUserId)),
    };
  }

  async getEventDetail(
    actorUserId: string,
    clubId: string,
    eventId: string,
  ): Promise<ClubEventDetailDto> {
    await this.requireActiveMembership(clubId, actorUserId);
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

    const base = this.toEventListItem(event, actorUserId);
    return {
      ...base,
      venueAddress: event.venueAddress,
      responseDeadline: event.responseDeadline.toISOString(),
      memo: event.memo,
      attendanceFinalized: Boolean(event.attendanceFinalizedAt),
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
          status:
            event.startsAt.getTime() <= Date.now()
              ? ClubEventStatus.COMPLETED
              : ClubEventStatus.SCHEDULED,
        },
      });
    });

    return this.getEventDetail(actorUserId, clubId, eventId);
  }

  async getMemberAttendanceStats(
    actorUserId: string,
    clubId: string,
    targetUserId: string,
    period: 'RECENT_30D' | 'THIS_YEAR' | 'ALL',
  ): Promise<ClubMemberAttendanceStatsDto> {
    await this.requireActiveMembership(clubId, actorUserId);
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

    let attended = 0;
    let declined = 0;
    let noResponse = 0;
    let noShow = 0;
    let targetEvents = 0;

    for (const event of events) {
      const row = event.attendances[0];
      if (!row) continue;
      targetEvents += 1;
      if (row.finalStatus === 'ATTENDED') attended += 1;
      else if (row.finalStatus === 'NO_SHOW') noShow += 1;
      else if (row.response === 'DECLINED') declined += 1;
      else if (row.response === 'NO_RESPONSE') noResponse += 1;
      else if (row.response === 'ATTENDING' || row.response === 'MAYBE') {
        if (!row.finalStatus) noResponse += 1;
      }
    }

    const denominator = attended + noShow + Math.max(targetEvents - declined - noResponse, 0);
    return {
      userId: targetUserId,
      nickname: profile?.nickname ?? '회원',
      period,
      targetEvents,
      attended,
      declined,
      noResponse,
      noShow,
      averageAttendanceRate: computeClubAttendanceRate({
        attendedCount: attended,
        denominatorCount: denominator,
      }),
    };
  }

  async listAccounting(
    actorUserId: string,
    clubId: string,
    period: 'THIS_MONTH' | 'THIS_YEAR' | 'ALL' = 'THIS_YEAR',
  ): Promise<ClubAccountingListResponse> {
    const actor = await this.requireActiveMembership(clubId, actorUserId);
    if (!canManageClubAccounting(actor) && actor.role !== ClubMembershipRole.MEMBER) {
      throw new ForbiddenException('club_forbidden');
    }

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
    const remainingSeats = computeRemainingEventCapacity(event.capacity, counts.attending) ?? 0;
    if (remainingSeats <= 0) throw new BadRequestException('no_remaining_seats');

    return {
      clubId,
      clubEventId: event.id,
      title: event.title,
      venueName: event.venueName,
      venueAddress: event.venueAddress,
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
    return events.map((e) => this.toEventListItem(e, userId));
  }

  private toEventListItem(
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
  ): ClubEventListItemDto {
    const counts = countAttendanceResponses(event.attendances);
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
      remainingCapacity: computeRemainingEventCapacity(event.capacity, counts.attending),
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

    const yearStart = this.yearStart();
    const recentSince = new Date(Date.now() - 30 * 24 * 60 * 60_000);

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
      user: { profile: { nickname: string } | null };
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
      attendanceRateThisYear,
    };
  }

  private generateInviteCode() {
    return randomBytes(4).toString('hex').toUpperCase();
  }

  private yearStart() {
    const year = new Date().getFullYear();
    return new Date(Date.UTC(year, 0, 1));
  }

  private periodSince(period: 'RECENT_30D' | 'THIS_YEAR' | 'ALL') {
    if (period === 'ALL') return null;
    if (period === 'THIS_YEAR') return this.yearStart();
    return new Date(Date.now() - 30 * 24 * 60 * 60_000);
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
