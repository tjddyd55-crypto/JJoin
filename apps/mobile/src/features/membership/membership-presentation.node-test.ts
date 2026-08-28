import assert from 'node:assert/strict';
import test from 'node:test';
import {
  formatMembershipPeriodEnd,
  mapUserMembershipDto,
  presentMembership,
} from './membership-presentation';

test('FREE presentation — no purchase copy, no VIP', () => {
  const m = mapUserMembershipDto({
    planCode: 'FREE',
    status: null,
    currentPeriodStart: null,
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
    entitlements: [],
    subscriptionId: null,
  });
  const p = presentMembership(m);
  assert.equal(m.effectivePlan, 'FREE');
  assert.equal(m.hasRoomCreationFeeWaiver, false);
  assert.equal(p.planBadgeVariant, 'neutral');
  assert.equal(p.summaryTitle, '일반 회원');
  assert.equal(p.cancelNotice, null);
  assert.ok(!p.summaryTitle.includes('VIP'));
});

test('PREMIUM presentation — waiver benefit + period', () => {
  const m = mapUserMembershipDto({
    planCode: 'PREMIUM',
    status: 'ACTIVE',
    currentPeriodStart: '2026-08-01T00:00:00.000Z',
    currentPeriodEnd: '2026-09-24T10:00:00.000Z',
    cancelAtPeriodEnd: false,
    entitlements: ['ROOM_CREATION_FEE_WAIVER'],
    subscriptionId: 'sub-1',
  });
  const p = presentMembership(m);
  assert.equal(m.hasRoomCreationFeeWaiver, true);
  assert.equal(p.planBadgeVariant, 'gold');
  assert.equal(p.summaryTitle, '프리미엄 회원');
  assert.deepEqual(p.benefitLines, ['조인 생성 이용료 면제']);
  assert.ok(p.periodLine?.includes('2026.09.24') || p.periodLine?.includes('2026.09'));
});

test('cancelled-active keeps PREMIUM + cancel notice', () => {
  const m = mapUserMembershipDto({
    planCode: 'PREMIUM',
    status: 'CANCELLED',
    currentPeriodStart: '2026-08-01T00:00:00.000Z',
    currentPeriodEnd: '2026-09-30T00:00:00.000Z',
    cancelAtPeriodEnd: true,
    entitlements: ['ROOM_CREATION_FEE_WAIVER'],
    subscriptionId: 'sub-2',
  });
  const p = presentMembership(m);
  assert.equal(m.effectivePlan, 'PREMIUM');
  assert.ok(p.cancelNotice?.includes('일반 회원으로 전환'));
  assert.ok(!p.cancelNotice?.includes('CANCELLED'));
});

test('expired FREE has no cancel notice', () => {
  const m = mapUserMembershipDto({
    planCode: 'FREE',
    status: 'EXPIRED',
    currentPeriodStart: '2026-07-01T00:00:00.000Z',
    currentPeriodEnd: '2026-08-01T00:00:00.000Z',
    cancelAtPeriodEnd: true,
    entitlements: [],
    subscriptionId: 'sub-3',
  });
  const p = presentMembership(m);
  assert.equal(p.summaryTitle, '일반 회원');
  assert.equal(p.cancelNotice, null);
});

test('formatMembershipPeriodEnd', () => {
  assert.equal(formatMembershipPeriodEnd(null), null);
  assert.ok(formatMembershipPeriodEnd('2026-09-24T10:15:53.589Z')?.startsWith('2026.'));
});
