/**
 * Contract tests for store dashboard / recurring / recommendations API shapes.
 * No Nest DI / Prisma — types + validation + domain helpers only.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  RECOMMEND_REASON_LABEL_KO,
  buildOwnerDashboardKpi,
  defaultRecruitClosesAt,
  listUpcomingWeeklyStarts,
  occurrenceDateKeyFromStart,
  rankRecommendations,
} from '@jjoin/domain';
import type {
  CreateRecurringJoinScheduleRequest,
  CreateStoreMatchingJoinRequest,
  OwnerStoreDashboardDto,
  RecommendedJoinsResponse,
  RecurringJoinScheduleDto,
} from '@jjoin/types';
import { JoinStatus, MatchingRewardTarget, StoreOwnershipStatus } from '@jjoin/types';
import {
  createRecurringJoinScheduleSchema,
  createStoreMatchingJoinSchema,
  skipRecurringJoinOccurrenceSchema,
} from '@jjoin/validation';

test('OwnerStoreDashboardDto kpi carries re-participant + urgent extras', () => {
  const kpi = buildOwnerDashboardKpi({
    joins: [
      {
        id: 'j1',
        status: 'COMPLETED',
        startAt: new Date('2026-08-15T01:00:00.000Z'),
        plannedPlayerCount: 4,
        confirmedPlayerCount: 4,
        isUrgent: true,
      },
      {
        id: 'j2',
        status: 'COMPLETED',
        startAt: new Date('2026-08-20T01:00:00.000Z'),
        plannedPlayerCount: 4,
        confirmedPlayerCount: 3,
        isUrgent: false,
      },
    ],
    attendedRows: [
      { joinId: 'j1', userId: 'u1', participationStatus: 'COMPLETED' },
      { joinId: 'j2', userId: 'u1', participationStatus: 'COMPLETED' },
    ],
    followerCount: 7,
    period: 'all',
  });

  const dto: OwnerStoreDashboardDto = {
    ownershipId: 'own-1',
    facilityName: '테스트매장',
    ownershipStatus: StoreOwnershipStatus.ACTIVE,
    todayDateKey: '2026-09-06',
    period: 'all',
    kpi: {
      ...kpi,
    },
    todaySummary: {
      scheduledCount: 0,
      recruitingCount: 0,
      settlementPendingCount: 0,
      completedCount: 0,
    },
    participantSummary: {
      totalExpected: 0,
      confirmedCount: 0,
      pendingCount: 0,
      noShowCount: 0,
    },
    settlementSummary: {
      pendingCount: 0,
      payoutDueCoin: '0',
      holdCoin: '0',
      paidTodayCoin: '0',
    },
    coinSummary: {
      availableCoin: '0',
      heldCoin: '0',
      todayRewardPaidCoin: '0',
      joinCreationFeeCoin: 0,
      joinCreationBenefitLabel: '업주 혜택 · 조인방 생성 무료',
    },
    joinPricing: {
      canCreate: true,
      base: { mode: 'PAID', feeCoinAmount: 30 },
      owner: { eligible: true, mode: 'FREE', feeCoinAmount: 0 },
      premium: { eligible: false, mode: null, feeCoinAmount: null },
      effectiveFeeCoinAmount: 0,
      effectiveFeeKrw: 0,
      reason: 'OWNER_BENEFIT',
    },
    todayJoins: [],
    periodStats: {
      last7Days: {
        createdJoinCount: 0,
        completedJoinCount: 0,
        participantCount: 0,
        attendedCount: 0,
        noShowCount: 0,
        fillRatePercent: null,
      },
      last30Days: {
        createdJoinCount: 0,
        completedJoinCount: 0,
        participantCount: 0,
        attendedCount: 0,
        noShowCount: 0,
        fillRatePercent: null,
      },
    },
    recentNotifications: [],
    recentJoins: [
      {
        joinId: 'j2',
        startAt: '2026-08-20T01:00:00.000Z',
        status: JoinStatus.COMPLETED,
        plannedPlayerCount: 4,
        confirmedPlayerCount: 3,
        isUrgent: false,
        succeeded: true,
      },
    ],
  };

  assert.equal(dto.kpi.reParticipantCount, 1);
  assert.equal(dto.kpi.followerCount, 7);
  assert.equal(dto.kpi.urgentAttemptCount, 1);
  assert.equal(dto.kpi.urgentSucceededCount, 1);
  assert.equal(dto.recentJoins.length, 1);
});

test('CreateStoreMatchingJoinRequest accepts optional recurring fields', () => {
  const body: CreateStoreMatchingJoinRequest = {
    storeOwnershipId: '11111111-1111-4111-8111-111111111111',
    startAt: '2026-09-07T10:00:00.000Z',
    recruitClosesAt: '2026-09-07T07:00:00.000Z',
    targetMaleCount: 2,
    targetFemaleCount: 2,
    minimumPlayers: 3,
    matchingRewardTarget: MatchingRewardTarget.ALL,
    rewardPerParticipant: '1000',
    idempotencyKey: 'recurring:sched:2026-09-07',
    recurringScheduleId: '22222222-2222-4222-8222-222222222222',
    recurringOccurrenceDate: '2026-09-07',
  };
  const parsed = createStoreMatchingJoinSchema.safeParse(body);
  assert.equal(parsed.success, true);
  if (parsed.success) {
    assert.equal(parsed.data.recurringOccurrenceDate, '2026-09-07');
  }
});

test('createRecurringJoinScheduleSchema rejects invalid day/time', () => {
  const ok: CreateRecurringJoinScheduleRequest = {
    storeOwnershipId: '11111111-1111-4111-8111-111111111111',
    dayOfWeek: 1,
    startTimeLocal: '19:30',
    targetMaleCount: 2,
    targetFemaleCount: 2,
    minimumPlayers: 3,
    matchingRewardTarget: MatchingRewardTarget.ALL,
    rewardPerParticipant: '500',
  };
  assert.equal(createRecurringJoinScheduleSchema.safeParse(ok).success, true);
  assert.equal(
    createRecurringJoinScheduleSchema.safeParse({ ...ok, dayOfWeek: 0 }).success,
    false,
  );
  assert.equal(
    createRecurringJoinScheduleSchema.safeParse({ ...ok, startTimeLocal: '25:00' })
      .success,
    false,
  );
});

test('skip occurrence date must be YYYY-MM-DD', () => {
  assert.equal(
    skipRecurringJoinOccurrenceSchema.safeParse({ occurrenceDate: '2026-09-07' })
      .success,
    true,
  );
  assert.equal(
    skipRecurringJoinOccurrenceSchema.safeParse({ occurrenceDate: '09/07' }).success,
    false,
  );
});

test('recurring helper builds recruit close + date key for upcoming starts', () => {
  const starts = listUpcomingWeeklyStarts({
    dayOfWeek: 1,
    startTimeLocal: '10:00',
    from: new Date('2026-08-31T00:00:00+09:00'),
    aheadWeeks: 2,
  });
  assert.ok(starts.length >= 1);
  const key = occurrenceDateKeyFromStart(starts[0]!);
  assert.match(key, /^\d{4}-\d{2}-\d{2}$/);
  const closes = defaultRecruitClosesAt(starts[0]!, 3);
  assert.ok(closes.getTime() < starts[0]!.getTime());
});

test('RecommendedJoinsResponse items carry reasonLabel from SSOT', () => {
  const ranked = rankRecommendations(
    [
      {
        joinId: 'j1',
        status: 'OPEN',
        startAt: new Date('2099-01-01T10:00:00+09:00'),
        plannedPlayerCount: 4,
        confirmedPlayerCount: 1,
        isUrgent: false,
        hostUserId: 'host',
        venueId: 'v1',
        golfFacilityId: 'f1',
        sido: '서울특별시',
        sigungu: '강남구',
        startHourKst: 10,
        participantUserIds: [],
      },
    ],
    {
      userId: 'me',
      followedFacilityIds: new Set(['f1']),
      pastAttendedVenueIds: new Set(),
      preferredHours: new Set(),
      regionPrefs: [],
      playedTogetherUserIds: new Set(),
    },
    { limit: 5 },
  );
  assert.equal(ranked.length, 1);
  const response: RecommendedJoinsResponse = {
    items: [
      {
        joinId: ranked[0]!.joinId,
        venueName: '팔로우매장',
        startAt: '2099-01-01T01:00:00.000Z',
        seatsLeft: 3,
        isUrgent: false,
        reasonCode: ranked[0]!.reason,
        reasonLabel: RECOMMEND_REASON_LABEL_KO[ranked[0]!.reason],
      },
    ],
  };
  assert.ok(ranked[0]!.signals.includes('FOLLOWED_STORE'));
  assert.equal(response.items[0]!.joinId, 'j1');
  assert.ok(response.items[0]!.reasonLabel.length > 0);
});

test('RecurringJoinScheduleDto status union is closed', () => {
  const statuses: RecurringJoinScheduleDto['status'][] = [
    'ACTIVE',
    'PAUSED',
    'DELETED',
  ];
  assert.deepEqual(statuses, ['ACTIVE', 'PAUSED', 'DELETED']);
});
