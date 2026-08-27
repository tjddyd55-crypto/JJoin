import assert from 'node:assert/strict';
import test from 'node:test';
import {
  canApplyMatchingGenderSlot,
  canConfirmMatchingAttendance,
  computeMatchingJoinCoinRequirement,
  evaluateMatchingDeadline,
  formatMatchingRecruitmentLabel,
  isRewardEligibleMatchingGender,
  remainingMatchingHoldRefund,
  resolveMatchingRewardDisposition,
  resolveStoreMatchingDisplayStatus,
  storeMatchingDisplayStatusLabel,
  storeMatchingOwnerListPriority,
  summarizeMatchingSettlement,
} from './store-matching';

test('HOLDs reward slots by female target', () => {
  const req = computeMatchingJoinCoinRequirement({
    targetMaleCount: 2,
    targetFemaleCount: 2,
    matchingRewardTarget: 'FEMALE',
    rewardPerParticipant: '5000',
    roomCreationFee: '0',
  });
  assert.equal(req.plannedPlayerCount, 4);
  assert.equal(req.rewardEligibleSlots, 2);
  assert.equal(req.rewardHoldTotal, '10000');
  assert.equal(req.totalRequiredCoin, '10000');
});

test('blocks excess female applications', () => {
  assert.equal(
    canApplyMatchingGenderSlot({
      applicantGender: 'FEMALE',
      targetMaleCount: 2,
      targetFemaleCount: 2,
      confirmedGenders: ['FEMALE', 'MALE', 'FEMALE'],
    }),
    false,
  );
  assert.equal(
    canApplyMatchingGenderSlot({
      applicantGender: 'MALE',
      targetMaleCount: 2,
      targetFemaleCount: 2,
      confirmedGenders: ['FEMALE', 'MALE', 'FEMALE'],
    }),
    true,
  );
});

test('evaluates deadline minimum vs cancel', () => {
  const closes = new Date('2026-08-26T09:00:00.000Z');
  assert.deepEqual(
    evaluateMatchingDeadline({
      now: new Date('2026-08-26T09:01:00.000Z'),
      recruitClosesAt: closes,
      confirmedPlayerCount: 3,
      minimumPlayers: 3,
      plannedPlayerCount: 4,
      alreadyClosed: false,
    }),
    { action: 'confirm', reason: 'MINIMUM' },
  );

  assert.deepEqual(
    evaluateMatchingDeadline({
      now: new Date('2026-08-26T09:01:00.000Z'),
      recruitClosesAt: closes,
      confirmedPlayerCount: 2,
      minimumPlayers: 3,
      plannedPlayerCount: 4,
      alreadyClosed: false,
    }),
    { action: 'cancel', reason: 'INSUFFICIENT' },
  );
});

test('formats recruitment without inventing participants', () => {
  assert.equal(
    formatMatchingRecruitmentLabel({
      targetMaleCount: 2,
      targetFemaleCount: 2,
      confirmedMale: 0,
      confirmedFemale: 0,
    }),
    '남성 2명 · 여성 2명 모집',
  );

  assert.equal(
    formatMatchingRecruitmentLabel({
      targetMaleCount: 2,
      targetFemaleCount: 2,
      confirmedMale: 2,
      confirmedFemale: 1,
    }),
    '여성 1명 모집 중',
  );
});

test('reward eligibility respects target', () => {
  assert.equal(isRewardEligibleMatchingGender('FEMALE', 'FEMALE'), true);
  assert.equal(isRewardEligibleMatchingGender('MALE', 'FEMALE'), false);
  assert.equal(isRewardEligibleMatchingGender('MALE', 'ALL'), true);
});

test('leave NOT_ELIGIBLE does not shrink remaining JOIN hold refund', () => {
  // HOLD 10_000; one left participant marked NOT_ELIGIBLE (no ledger move).
  assert.equal(
    remainingMatchingHoldRefund({
      holdTotal: '10000',
      settlements: [
        { amount: '5000', rewardStatus: 'NOT_ELIGIBLE' },
        { amount: '5000', rewardStatus: 'HELD' },
      ],
    }),
    '10000',
  );
});

test('insufficient cancel refunds full hold when leave used NOT_ELIGIBLE', () => {
  assert.equal(
    remainingMatchingHoldRefund({
      holdTotal: '10000',
      settlements: [{ amount: '5000', rewardStatus: 'NOT_ELIGIBLE' }],
    }),
    '10000',
  );
});

test('REFUNDED after ledger move reduces remaining hold (no double refund)', () => {
  assert.equal(
    remainingMatchingHoldRefund({
      holdTotal: '10000',
      settlements: [
        { amount: '5000', rewardStatus: 'PAID' },
        { amount: '5000', rewardStatus: 'REFUNDED' },
      ],
    }),
    '0',
  );
});

test('settlement pays only attended eligible genders', () => {
  assert.equal(
    resolveMatchingRewardDisposition({
      attended: true,
      gender: 'FEMALE',
      matchingRewardTarget: 'FEMALE',
    }),
    'PAY',
  );
  assert.equal(
    resolveMatchingRewardDisposition({
      attended: false,
      gender: 'FEMALE',
      matchingRewardTarget: 'FEMALE',
    }),
    'REFUND',
  );
  assert.equal(
    resolveMatchingRewardDisposition({
      attended: true,
      gender: 'MALE',
      matchingRewardTarget: 'FEMALE',
    }),
    'REFUND',
  );

  const summary = summarizeMatchingSettlement({
    rewardPerParticipant: '5000',
    heldTotal: '10000',
    matchingRewardTarget: 'FEMALE',
    participants: [
      { attended: true, gender: 'MALE' },
      { attended: true, gender: 'MALE' },
      { attended: true, gender: 'FEMALE' },
      { attended: false, gender: 'FEMALE' },
    ],
  });
  assert.equal(summary.paidCount, 1);
  assert.equal(summary.payoutTotal, '5000');
  assert.equal(summary.refundToHost, '5000');
});

test('deadline confirms full roster before close', () => {
  const closes = new Date('2026-08-26T09:00:00.000Z');
  assert.deepEqual(
    evaluateMatchingDeadline({
      now: new Date('2026-08-26T08:00:00.000Z'),
      recruitClosesAt: closes,
      confirmedPlayerCount: 4,
      minimumPlayers: 3,
      plannedPlayerCount: 4,
      alreadyClosed: false,
    }),
    { action: 'confirm', reason: 'FULL' },
  );
});

test('display status covers recruiting through completed', () => {
  const closes = new Date('2026-08-26T09:00:00.000Z');
  const start = new Date('2026-08-26T11:00:00.000Z');
  const end = new Date('2026-08-26T14:00:00.000Z');

  assert.equal(
    resolveStoreMatchingDisplayStatus({
      now: new Date('2026-08-26T08:00:00.000Z'),
      status: 'OPEN',
      recruitClosesAt: closes,
      startAt: start,
      scheduledEndAt: end,
      confirmedPlayerCount: 1,
      minimumPlayers: 3,
    }),
    'RECRUITING',
  );

  assert.equal(
    resolveStoreMatchingDisplayStatus({
      now: new Date('2026-08-26T08:00:00.000Z'),
      status: 'OPEN',
      recruitClosesAt: closes,
      startAt: start,
      scheduledEndAt: end,
      confirmedPlayerCount: 3,
      minimumPlayers: 3,
    }),
    'MINIMUM_SECURED',
  );

  assert.equal(
    resolveStoreMatchingDisplayStatus({
      now: new Date('2026-08-26T10:00:00.000Z'),
      status: 'CONFIRMED',
      recruitClosesAt: closes,
      startAt: start,
      scheduledEndAt: end,
      confirmedPlayerCount: 3,
      minimumPlayers: 3,
    }),
    'CONFIRMED',
  );

  assert.equal(
    resolveStoreMatchingDisplayStatus({
      now: new Date('2026-08-26T12:00:00.000Z'),
      status: 'CONFIRMED',
      recruitClosesAt: closes,
      startAt: start,
      scheduledEndAt: end,
      confirmedPlayerCount: 3,
      minimumPlayers: 3,
    }),
    'IN_PROGRESS',
  );

  assert.equal(
    resolveStoreMatchingDisplayStatus({
      now: new Date('2026-08-26T15:00:00.000Z'),
      status: 'CONFIRMED',
      recruitClosesAt: closes,
      startAt: start,
      scheduledEndAt: end,
      confirmedPlayerCount: 3,
      minimumPlayers: 3,
    }),
    'ATTENDANCE_PENDING',
  );

  assert.equal(
    resolveStoreMatchingDisplayStatus({
      now: new Date('2026-08-26T15:00:00.000Z'),
      status: 'CANCELLED',
      recruitClosesAt: closes,
      startAt: start,
      scheduledEndAt: end,
      confirmedPlayerCount: 2,
      minimumPlayers: 3,
      cancelledAt: new Date('2026-08-26T09:01:00.000Z'),
      confirmedAt: null,
    }),
    'CANCELLED_INSUFFICIENT',
  );

  assert.equal(
    resolveStoreMatchingDisplayStatus({
      now: new Date('2026-08-26T15:00:00.000Z'),
      status: 'COMPLETED',
      recruitClosesAt: closes,
      startAt: start,
      scheduledEndAt: end,
      confirmedPlayerCount: 3,
      minimumPlayers: 3,
    }),
    'COMPLETED',
  );

  assert.equal(storeMatchingDisplayStatusLabel('ATTENDANCE_PENDING', { audience: 'host' }), '참석 확인 대기');
  assert.equal(
    storeMatchingDisplayStatusLabel('ATTENDANCE_PENDING', { audience: 'participant' }),
    '점주 참석 확인 대기',
  );
  assert.ok(
    storeMatchingOwnerListPriority('ATTENDANCE_PENDING') <
      storeMatchingOwnerListPriority('RECRUITING'),
  );
  assert.equal(
    canConfirmMatchingAttendance({
      now: new Date('2026-08-26T15:00:00.000Z'),
      status: 'CONFIRMED',
      scheduledEndAt: end,
    }),
    true,
  );
  assert.equal(
    canConfirmMatchingAttendance({
      now: new Date('2026-08-26T12:00:00.000Z'),
      status: 'CONFIRMED',
      scheduledEndAt: end,
    }),
    false,
  );
});
