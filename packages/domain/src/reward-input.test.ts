import assert from 'node:assert/strict';
import test from 'node:test';
import {
  addRewardQuickIncrement,
  computeCoinShortfall,
  computeWalletAfterCreation,
  normalizeRewardPerParticipantInput,
} from './reward-input';
import { computeJoinCoinRequirement } from './coin-join';

test('normalize reward input strips non-digits and leading zeros', () => {
  assert.equal(normalizeRewardPerParticipantInput(''), '0');
  assert.equal(normalizeRewardPerParticipantInput('0010'), '10');
  assert.equal(normalizeRewardPerParticipantInput('35abc'), '35');
  assert.equal(normalizeRewardPerParticipantInput('110'), '110');
});

test('quick add is additive on single rewardPerParticipant state', () => {
  assert.equal(addRewardQuickIncrement('0', 100), '100');
  assert.equal(addRewardQuickIncrement('100', 10), '110');
  assert.equal(addRewardQuickIncrement('35', 5), '40');
  assert.equal(addRewardQuickIncrement('110', 100), '210');
});

test('manual edit after quick add replaces value', () => {
  assert.equal(normalizeRewardPerParticipantInput('25'), '25');
});

test('reset via normalize yields zero', () => {
  assert.equal(normalizeRewardPerParticipantInput('0'), '0');
});

test('3 slots × 110 reward = 330 hold', () => {
  const req = computeJoinCoinRequirement({
    plannedPlayerCount: 4,
    rewardPerParticipant: '110',
    roomCreationFee: '2',
  });
  assert.equal(req.rewardEligibleSlots, 3);
  assert.equal(req.rewardHoldTotal, '330');
  assert.equal(req.totalRequiredCoin, '332');
});

test('2 slots × 110 reward = 220 hold when player count changes', () => {
  const req = computeJoinCoinRequirement({
    plannedPlayerCount: 3,
    rewardPerParticipant: '110',
    roomCreationFee: '2',
  });
  assert.equal(req.rewardHoldTotal, '220');
});

test('zero reward allowed — hold 0, fee only', () => {
  const req = computeJoinCoinRequirement({
    plannedPlayerCount: 4,
    rewardPerParticipant: '0',
    roomCreationFee: '2',
  });
  assert.equal(req.rewardHoldTotal, '0');
  assert.equal(req.totalRequiredCoin, '2');
});

test('coin shortfall and wallet after creation', () => {
  assert.equal(computeCoinShortfall('50', '62'), '12');
  assert.equal(computeCoinShortfall('62', '62'), null);
  assert.equal(computeWalletAfterCreation('120', '62'), '58');
  assert.equal(computeWalletAfterCreation('50', '62'), '0');
});
