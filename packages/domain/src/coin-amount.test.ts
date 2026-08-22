import assert from 'node:assert/strict';
import test from 'node:test';
import {
  addCoinAmounts,
  compareCoinAmounts,
  formatCoinUnits,
  mulCoinAmountByInt,
  parseCoinUnits,
  subCoinAmounts,
} from './coin-amount';
import {
  canAffordJoinCreate,
  computeJoinCoinRequirement,
  computeRewardEligibleSlots,
} from './coin-join';

test('coin amount rejects float-like binary hazards via string scale', () => {
  assert.equal(addCoinAmounts('0.1', '0.2'), '0.3');
  assert.equal(subCoinAmounts('1.0000', '0.0001'), '0.9999');
  assert.equal(mulCoinAmountByInt('20', 3), '60');
  assert.equal(formatCoinUnits(parseCoinUnits('2')), '2');
  assert.equal(compareCoinAmounts('2', '2.0'), 0);
});

test('reward slots exclude host', () => {
  assert.equal(computeRewardEligibleSlots(4), 3);
  const req = computeJoinCoinRequirement({
    plannedPlayerCount: 4,
    rewardPerParticipant: '20',
    roomCreationFee: '2',
  });
  assert.equal(req.rewardHoldTotal, '60');
  assert.equal(req.totalRequiredCoin, '62');
  assert.equal(canAffordJoinCreate('62', '62'), true);
  assert.equal(canAffordJoinCreate('61.9999', '62'), false);
});
