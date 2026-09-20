/**
 * Phase B reward contracts: KST uniqueness, completed-join counting, ledger keys.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  attendanceGrantIdempotencyKey,
  attendanceKstDateKey,
  computeAttendanceStreakFromDates,
  isSuccessfulHostedJoin,
  isSuccessfulParticipationStatus,
  kstDateParts,
  listGrantableMilestones,
  milestoneGrantIdempotencyKey,
  nextAttendanceStreak,
  shouldGrantDailyAttendance,
  DEFAULT_REWARD_POLICY,
} from '@jjoin/domain';
import { CoinIssuanceType } from '@jjoin/types';
import { updateRewardPolicySchema } from '@jjoin/validation';

test('attendance is once per user per KST date and shares the ledger key', () => {
  const userId = 'user-1';
  const kstDate = attendanceKstDateKey(kstDateParts(new Date('2026-09-19T15:00:00.000Z')));
  assert.equal(kstDate, '2026-09-20');
  const key = attendanceGrantIdempotencyKey(userId, kstDate);
  assert.equal(key, 'reward:attendance:user-1:2026-09-20');
  assert.equal(key, attendanceGrantIdempotencyKey(userId, kstDate));
  assert.equal(
    shouldGrantDailyAttendance({
      policy: DEFAULT_REWARD_POLICY,
      alreadyCheckedIn: true,
    }),
    false,
  );
});

test('host completed counting ignores draft/create/settling', () => {
  const hosted = ['DRAFT', 'OPEN', 'SETTLING', 'CANCELLED', 'COMPLETED', 'COMPLETED'];
  const count = hosted.filter((status) => isSuccessfulHostedJoin(status)).length;
  assert.equal(count, 2);
});

test('participant completed counting ignores apply/approve and host rows', () => {
  const rows = [
    { role: 'HOST', status: 'COMPLETED' },
    { role: 'PARTICIPANT', status: 'APPLIED' },
    { role: 'PARTICIPANT', status: 'APPROVED' },
    { role: 'PARTICIPANT', status: 'CONFIRMED' },
    { role: 'PARTICIPANT', status: 'NO_SHOW' },
    { role: 'PARTICIPANT', status: 'COMPLETED' },
    { role: 'PARTICIPANT', status: 'COMPLETED' },
  ];
  const count = rows.filter(
    (row) => row.role === 'PARTICIPANT' && isSuccessfulParticipationStatus(row.status),
  ).length;
  assert.equal(count, 2);
});

test('milestone progression is idempotent and credits via EVENT_REWARD issuance', () => {
  const first = listGrantableMilestones({
    enabled: true,
    milestones: DEFAULT_REWARD_POLICY.hostMilestones,
    currentCount: 5,
    grantedThresholds: new Set(),
  });
  assert.deepEqual(
    first.map((row) => row.threshold),
    [1, 5],
  );
  const retry = listGrantableMilestones({
    enabled: true,
    milestones: DEFAULT_REWARD_POLICY.hostMilestones,
    currentCount: 5,
    grantedThresholds: new Set(first.map((row) => row.threshold)),
  });
  assert.equal(retry.length, 0);
  assert.equal(
    milestoneGrantIdempotencyKey('HOST_MILESTONE', 'user-1', 5),
    'reward:host_milestone:user-1:5',
  );
  assert.equal(CoinIssuanceType.EVENT_REWARD, 'EVENT_REWARD');
});

test('streak projection stays durable across consecutive KST days', () => {
  const afterGap = nextAttendanceStreak({
    lastCheckInKstDate: '2026-09-18',
    previousCurrentStreak: 4,
    previousBestStreak: 6,
    previousTotalDays: 10,
    todayKst: '2026-09-20',
  });
  assert.deepEqual(afterGap, { currentStreak: 1, bestStreak: 6, totalDays: 11 });
  assert.deepEqual(
    computeAttendanceStreakFromDates(['2026-09-18', '2026-09-19', '2026-09-20'], '2026-09-20'),
    { currentStreak: 3, bestStreak: 3, totalDays: 3 },
  );
});

test('admin can persist a milestone ladder', () => {
  assert.equal(
    updateRewardPolicySchema.safeParse({
      participationMilestones: [{ threshold: 1, amount: '2' }],
    }).success,
    true,
  );
});
