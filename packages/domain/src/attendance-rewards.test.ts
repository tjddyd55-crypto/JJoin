import assert from 'node:assert/strict';
import test from 'node:test';
import { kstDateParts } from './club-stats-period';
import {
  DEFAULT_REWARD_POLICY,
  achievementRewardNotificationEventKey,
  attendanceGrantIdempotencyKey,
  attendanceKstDateKey,
  attendanceRewardNotificationEventKey,
  attendanceRewardToast,
  computeAttendanceStreakFromDates,
  isSuccessfulHostedJoin,
  isSuccessfulParticipationStatus,
  listGrantableMilestones,
  milestoneGrantIdempotencyKey,
  nextAttendanceStreak,
  parseRewardMilestones,
  resolveRewardMilestones,
  shouldGrantDailyAttendance,
  shouldGrantMilestone,
  shiftKstDateKey,
  validateRewardPolicy,
} from './attendance-rewards';

test('daily attendance is unique per KST day', () => {
  assert.equal(attendanceKstDateKey({ year: 2026, month: 9, day: 8 }), '2026-09-08');
  assert.equal(
    shouldGrantDailyAttendance({ policy: DEFAULT_REWARD_POLICY, alreadyCheckedIn: false }),
    true,
  );
  assert.equal(
    shouldGrantDailyAttendance({ policy: DEFAULT_REWARD_POLICY, alreadyCheckedIn: true }),
    false,
  );
  assert.equal(
    shouldGrantDailyAttendance({
      policy: { ...DEFAULT_REWARD_POLICY, attendanceEnabled: false },
      alreadyCheckedIn: false,
    }),
    false,
  );
  assert.equal(
    attendanceGrantIdempotencyKey('u1', '2026-09-18'),
    'reward:attendance:u1:2026-09-18',
  );
});

test('KST calendar day uses Asia/Seoul midnight, not UTC', () => {
  const beforeMidnight = kstDateParts(new Date('2026-09-19T14:59:59.999Z'));
  const afterMidnight = kstDateParts(new Date('2026-09-19T15:00:00.000Z'));
  assert.equal(attendanceKstDateKey(beforeMidnight), '2026-09-19');
  assert.equal(attendanceKstDateKey(afterMidnight), '2026-09-20');
  assert.notEqual(
    attendanceGrantIdempotencyKey('u1', attendanceKstDateKey(beforeMidnight)),
    attendanceGrantIdempotencyKey('u1', attendanceKstDateKey(afterMidnight)),
  );
});

test('successful host count uses COMPLETED join only', () => {
  assert.equal(isSuccessfulHostedJoin('COMPLETED'), true);
  assert.equal(isSuccessfulHostedJoin('SETTLING'), false);
  assert.equal(isSuccessfulHostedJoin('OPEN'), false);
  assert.equal(isSuccessfulHostedJoin('DRAFT'), false);
  assert.equal(isSuccessfulHostedJoin('CANCELLED'), false);
  assert.equal(isSuccessfulHostedJoin('IN_PROGRESS'), false);
});

test('successful participant count uses COMPLETED participation only', () => {
  assert.equal(isSuccessfulParticipationStatus('COMPLETED'), true);
  assert.equal(isSuccessfulParticipationStatus('CONFIRMED'), false);
  assert.equal(isSuccessfulParticipationStatus('APPROVED'), false);
  assert.equal(isSuccessfulParticipationStatus('APPLIED'), false);
  assert.equal(isSuccessfulParticipationStatus('NO_SHOW'), false);
  assert.equal(isSuccessfulParticipationStatus('CANCELLED'), false);
});

test('milestone grants once at threshold and never duplicates', () => {
  assert.equal(
    shouldGrantMilestone({
      enabled: true,
      threshold: 5,
      currentCount: 5,
      alreadyGranted: false,
    }),
    true,
  );
  assert.equal(
    shouldGrantMilestone({
      enabled: true,
      threshold: 5,
      currentCount: 4,
      alreadyGranted: false,
    }),
    false,
  );
  assert.equal(
    shouldGrantMilestone({
      enabled: true,
      threshold: 5,
      currentCount: 20,
      alreadyGranted: true,
    }),
    false,
  );
  assert.equal(
    milestoneGrantIdempotencyKey('HOST_MILESTONE', 'u1', 5),
    'reward:host_milestone:u1:5',
  );
  assert.equal(
    milestoneGrantIdempotencyKey('PARTICIPATION_MILESTONE', 'u1', 10),
    'reward:participation_milestone:u1:10',
  );
  assert.equal(validateRewardPolicy({ ...DEFAULT_REWARD_POLICY, hostThreshold: 0 }).ok, false);
});

test('configurable milestone ladder grants each threshold once', () => {
  const grantable = listGrantableMilestones({
    enabled: true,
    milestones: DEFAULT_REWARD_POLICY.hostMilestones,
    currentCount: 10,
    grantedThresholds: new Set([1]),
  });
  assert.deepEqual(
    grantable.map((row) => row.threshold),
    [5, 10],
  );
  assert.equal(
    listGrantableMilestones({
      enabled: true,
      milestones: DEFAULT_REWARD_POLICY.hostMilestones,
      currentCount: 10,
      grantedThresholds: new Set([1, 5, 10]),
    }).length,
    0,
  );
});

test('empty stored milestones fall back to legacy threshold/amount', () => {
  const resolved = resolveRewardMilestones({
    ...DEFAULT_REWARD_POLICY,
    hostThreshold: 7,
    hostAmount: '12',
    hostMilestones: [],
    participationMilestones: [],
  });
  assert.deepEqual(resolved.host, [{ threshold: 7, amount: '12' }]);
  assert.deepEqual(parseRewardMilestones([{ threshold: 1, amount: '3' }, { threshold: 1, amount: '9' }]), [
    { threshold: 1, amount: '9' },
  ]);
});

test('streak increments across consecutive KST days and resets after a gap', () => {
  const first = nextAttendanceStreak({
    lastCheckInKstDate: null,
    previousCurrentStreak: 0,
    previousBestStreak: 0,
    previousTotalDays: 0,
    todayKst: '2026-09-18',
  });
  assert.deepEqual(first, { currentStreak: 1, bestStreak: 1, totalDays: 1 });

  const second = nextAttendanceStreak({
    lastCheckInKstDate: '2026-09-18',
    previousCurrentStreak: 1,
    previousBestStreak: 1,
    previousTotalDays: 1,
    todayKst: '2026-09-19',
  });
  assert.deepEqual(second, { currentStreak: 2, bestStreak: 2, totalDays: 2 });

  const gap = nextAttendanceStreak({
    lastCheckInKstDate: '2026-09-19',
    previousCurrentStreak: 2,
    previousBestStreak: 2,
    previousTotalDays: 2,
    todayKst: '2026-09-21',
  });
  assert.deepEqual(gap, { currentStreak: 1, bestStreak: 2, totalDays: 3 });

  const sameDay = nextAttendanceStreak({
    lastCheckInKstDate: '2026-09-21',
    previousCurrentStreak: 1,
    previousBestStreak: 2,
    previousTotalDays: 3,
    todayKst: '2026-09-21',
  });
  assert.deepEqual(sameDay, { currentStreak: 1, bestStreak: 2, totalDays: 3 });
});

test('durable check-in dates recompute current and best streak', () => {
  assert.deepEqual(
    computeAttendanceStreakFromDates(
      ['2026-09-16', '2026-09-17', '2026-09-18', '2026-09-20'],
      '2026-09-20',
    ),
    { currentStreak: 1, bestStreak: 3, totalDays: 4 },
  );
  assert.deepEqual(
    computeAttendanceStreakFromDates(['2026-09-18', '2026-09-19'], '2026-09-20'),
    { currentStreak: 2, bestStreak: 2, totalDays: 2 },
  );
  assert.equal(shiftKstDateKey('2026-09-01', -1), '2026-08-31');
});

test('reward keys and toast stay stable for ledger + notification idempotency', () => {
  assert.equal(
    attendanceRewardNotificationEventKey('u1', '2026-09-20'),
    'ATTENDANCE_REWARD:u1:2026-09-20',
  );
  assert.equal(
    achievementRewardNotificationEventKey('HOST_MILESTONE', 'u1', 5),
    'ACHIEVEMENT_REWARD:HOST_MILESTONE:u1:5',
  );
  assert.deepEqual(attendanceRewardToast({ granted: true, amount: '1', currentStreak: 3 }), {
    title: '오늘 출석 완료',
    body: '1코인 지급 · 연속 3일',
  });
  assert.equal(attendanceRewardToast({ granted: false, amount: '1', currentStreak: 3 }), null);
});
