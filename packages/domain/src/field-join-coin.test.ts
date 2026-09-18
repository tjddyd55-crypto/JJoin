import assert from 'node:assert/strict';
import test from 'node:test';
import { computeJoinCoinRequirement } from './coin-join';
import { validateJoinPlayFormat } from './join-play-format';

test('FIELD individual and 포썸 reuse the same HOLD payout formula as SCREEN', () => {
  const individual = validateJoinPlayFormat({
    playFormat: 'INDIVIDUAL',
    plannedPlayerCount: 4,
  });
  const foursome = validateJoinPlayFormat({
    playFormat: 'TEAM',
    teamSize: 2,
    teamCount: 2,
  });
  assert.equal(individual.ok && foursome.ok, true);
  if (!individual.ok || !foursome.ok) return;

  const coins = [
    computeJoinCoinRequirement({
      plannedPlayerCount: individual.value.plannedPlayerCount,
      rewardPerParticipant: '100',
      roomCreationFee: '10',
    }),
    computeJoinCoinRequirement({
      plannedPlayerCount: foursome.value.plannedPlayerCount,
      rewardPerParticipant: '100',
      roomCreationFee: '10',
    }),
  ];
  assert.equal(coins[0]?.rewardEligibleSlots, 3);
  assert.equal(coins[0]?.rewardHoldTotal, '300');
  assert.equal(coins[1]?.rewardEligibleSlots, 3);
  assert.equal(coins[1]?.totalRequiredCoin, '310');
});
