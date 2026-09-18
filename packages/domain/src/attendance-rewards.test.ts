import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DEFAULT_REWARD_POLICY,
  attendanceGrantIdempotencyKey,
  attendanceKstDateKey,
  isSuccessfulHostedJoin,
  isSuccessfulParticipationStatus,
  milestoneGrantIdempotencyKey,
  shouldGrantDailyAttendance,
  shouldGrantMilestone,
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

test('successful match uses COMPLETED participation lifecycle', () => {
  assert.equal(isSuccessfulParticipationStatus('COMPLETED'), true);
  assert.equal(isSuccessfulParticipationStatus('CONFIRMED'), false);
  assert.equal(isSuccessfulHostedJoin('COMPLETED'), true);
  assert.equal(isSuccessfulHostedJoin('SETTLING'), false);
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
  assert.equal(validateRewardPolicy({ ...DEFAULT_REWARD_POLICY, hostThreshold: 0 }).ok, false);
});
