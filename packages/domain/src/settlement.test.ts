import assert from 'node:assert/strict';
import test from 'node:test';
import {
  canAutoPayReward,
  canHostPayReward,
  computeAutoPayAt,
  formatCountdownMs,
  isSettlementWindowOpen,
  isTerminalRewardStatus,
} from './settlement';

test('autoPayAt is scheduledEndAt + 24h', () => {
  const end = new Date('2026-08-22T10:00:00.000Z');
  const auto = computeAutoPayAt(end, 24);
  assert.equal(auto.toISOString(), '2026-08-23T10:00:00.000Z');
});

test('settlement window opens at scheduledEndAt', () => {
  const end = new Date('2026-08-22T10:00:00.000Z');
  assert.equal(isSettlementWindowOpen(end, new Date('2026-08-22T09:59:59.000Z')), false);
  assert.equal(isSettlementWindowOpen(end, new Date('2026-08-22T10:00:00.000Z')), true);
});

test('host pay only after end and pending confirmation', () => {
  const end = new Date('2026-08-22T10:00:00.000Z');
  assert.equal(
    canHostPayReward({
      now: new Date('2026-08-22T11:00:00.000Z'),
      scheduledEndAt: end,
      rewardStatus: 'PENDING_CONFIRMATION',
      joinStatus: 'SETTLING',
    }),
    true,
  );
  assert.equal(
    canHostPayReward({
      now: new Date('2026-08-22T09:00:00.000Z'),
      scheduledEndAt: end,
      rewardStatus: 'PENDING_CONFIRMATION',
      joinStatus: 'SETTLING',
    }),
    false,
  );
});

test('auto pay due after autoPayAt', () => {
  const auto = new Date('2026-08-23T10:00:00.000Z');
  assert.equal(
    canAutoPayReward({
      now: new Date('2026-08-23T10:00:01.000Z'),
      autoPayAt: auto,
      rewardStatus: 'PENDING_CONFIRMATION',
    }),
    true,
  );
});

test('terminal reward statuses', () => {
  assert.equal(isTerminalRewardStatus('PAID'), true);
  assert.equal(isTerminalRewardStatus('PENDING_CONFIRMATION'), false);
});

test('countdown never negative', () => {
  assert.equal(formatCountdownMs(new Date('2026-08-22T10:00:00.000Z'), new Date('2026-08-22T11:00:00.000Z')), 0);
});
