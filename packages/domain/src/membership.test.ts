import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ENTITLEMENT_ROOM_CREATION_FEE_WAIVER,
  MEMBERSHIP_PLAN_FREE,
  MEMBERSHIP_PLAN_PREMIUM,
  buildJoinMembershipSnapshot,
  hasEntitlement,
  pickSubscriptionForResolution,
  resolveEffectiveRoomCreationFee,
  resolveMembershipFromSubscription,
  type SubscriptionResolutionInput,
} from './membership';
import { computeJoinCoinRequirement } from './coin-join';

function premiumSub(
  overrides: Partial<SubscriptionResolutionInput> & Pick<SubscriptionResolutionInput, 'status'>,
): SubscriptionResolutionInput {
  const start = new Date('2026-08-01T00:00:00.000Z');
  const end = new Date('2026-09-01T00:00:00.000Z');
  return {
    id: 'sub-1',
    planCode: MEMBERSHIP_PLAN_PREMIUM,
    currentPeriodStart: start,
    currentPeriodEnd: end,
    cancelAtPeriodEnd: false,
    planEntitlements: [ENTITLEMENT_ROOM_CREATION_FEE_WAIVER],
    ...overrides,
  };
}

const midPeriod = new Date('2026-08-15T12:00:00.000Z');
const afterPeriod = new Date('2026-09-01T00:00:00.000Z');

test('CASE 1: no subscription → FREE', () => {
  const m = resolveMembershipFromSubscription(null, midPeriod);
  assert.equal(m.effectivePlanCode, MEMBERSHIP_PLAN_FREE);
  assert.equal(m.hasRoomCreationFeeWaiver, false);
});

test('CASE 2: PREMIUM ACTIVE → fee waiver', () => {
  const m = resolveMembershipFromSubscription(premiumSub({ status: 'ACTIVE' }), midPeriod);
  assert.equal(m.effectivePlanCode, MEMBERSHIP_PLAN_PREMIUM);
  assert.equal(m.hasRoomCreationFeeWaiver, true);
  assert.ok(hasEntitlement(m, ENTITLEMENT_ROOM_CREATION_FEE_WAIVER));
});

test('CASE 3: CANCELLED + period future → waiver retained', () => {
  const m = resolveMembershipFromSubscription(
    premiumSub({ status: 'CANCELLED', cancelAtPeriodEnd: true }),
    midPeriod,
  );
  assert.equal(m.effectivePlanCode, MEMBERSHIP_PLAN_PREMIUM);
  assert.equal(m.hasRoomCreationFeeWaiver, true);
});

test('CASE 4: period expired → FREE', () => {
  const m = resolveMembershipFromSubscription(premiumSub({ status: 'ACTIVE' }), afterPeriod);
  assert.equal(m.effectivePlanCode, MEMBERSHIP_PLAN_FREE);
  assert.equal(m.hasRoomCreationFeeWaiver, false);
});

test('CASE 5: PAST_DUE + period future → waiver retained (default)', () => {
  const m = resolveMembershipFromSubscription(premiumSub({ status: 'PAST_DUE' }), midPeriod);
  assert.equal(m.effectivePlanCode, MEMBERSHIP_PLAN_PREMIUM);
  assert.equal(m.hasRoomCreationFeeWaiver, true);
});

test('CASE 6/7/8: join coin FREE vs PREMIUM — reward hold unchanged', () => {
  const freeFee = resolveEffectiveRoomCreationFee({
    policyRoomCreationFee: '2',
    membership: resolveMembershipFromSubscription(null, midPeriod),
  });
  const premiumFee = resolveEffectiveRoomCreationFee({
    policyRoomCreationFee: '2',
    membership: resolveMembershipFromSubscription(premiumSub({ status: 'ACTIVE' }), midPeriod),
  });

  const freeReq = computeJoinCoinRequirement({
    plannedPlayerCount: 4,
    rewardPerParticipant: '20',
    roomCreationFee: freeFee,
  });
  const premiumReq = computeJoinCoinRequirement({
    plannedPlayerCount: 4,
    rewardPerParticipant: '20',
    roomCreationFee: premiumFee,
  });

  assert.equal(freeReq.rewardHoldTotal, '60');
  assert.equal(premiumReq.rewardHoldTotal, '60');
  assert.equal(freeReq.roomCreationFee, '2');
  assert.equal(premiumReq.roomCreationFee, '0');
  assert.equal(freeReq.totalRequiredCoin, '62');
  assert.equal(premiumReq.totalRequiredCoin, '60');
});

test('PENDING never grants premium', () => {
  const m = resolveMembershipFromSubscription(premiumSub({ status: 'PENDING' }), midPeriod);
  assert.equal(m.effectivePlanCode, MEMBERSHIP_PLAN_FREE);
  assert.equal(m.hasRoomCreationFeeWaiver, false);
});

test('pickSubscriptionForResolution prefers active premium', () => {
  const expired = premiumSub({
    id: 'old',
    status: 'EXPIRED',
    currentPeriodEnd: new Date('2026-07-01T00:00:00.000Z'),
  });
  const active = premiumSub({ id: 'new', status: 'ACTIVE' });
  const picked = pickSubscriptionForResolution([expired, active], midPeriod);
  assert.equal(picked?.id, 'new');
});

test('join membership snapshot is immutable record shape', () => {
  const m = resolveMembershipFromSubscription(premiumSub({ status: 'ACTIVE' }), midPeriod);
  const snap = buildJoinMembershipSnapshot(m, midPeriod);
  assert.equal(snap.effectivePlanCode, MEMBERSHIP_PLAN_PREMIUM);
  assert.equal(snap.roomCreationFeeWaived, true);
  assert.deepEqual(snap.entitlementCodes, [ENTITLEMENT_ROOM_CREATION_FEE_WAIVER]);
});
