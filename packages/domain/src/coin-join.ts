/**
 * Join create coin requirement helpers.
 * Fee vs reward hold stay separate — never merge into one accounting event.
 */

import {
  addCoinAmounts,
  compareCoinAmounts,
  mulCoinAmountByInt,
  zeroCoinAmount,
} from './coin-amount';

export type JoinCoinRequirement = {
  plannedPlayerCount: number;
  /** Host is never a reward recipient. */
  rewardEligibleSlots: number;
  rewardPerParticipant: string;
  rewardHoldTotal: string;
  roomCreationFee: string;
  totalRequiredCoin: string;
};

/**
 * Planned roster includes Host (1). Reward slots = P - 1.
 */
export function computeRewardEligibleSlots(plannedPlayerCount: number): number {
  if (!Number.isInteger(plannedPlayerCount) || plannedPlayerCount < 2) {
    throw new Error('plannedPlayerCount must be an integer >= 2');
  }
  return plannedPlayerCount - 1;
}

export function computeJoinCoinRequirement(params: {
  plannedPlayerCount: number;
  rewardPerParticipant: string;
  roomCreationFee: string;
}): JoinCoinRequirement {
  const rewardEligibleSlots = computeRewardEligibleSlots(params.plannedPlayerCount);
  const rewardHoldTotal =
    rewardEligibleSlots === 0
      ? zeroCoinAmount()
      : mulCoinAmountByInt(params.rewardPerParticipant, rewardEligibleSlots);
  const totalRequiredCoin = addCoinAmounts(params.roomCreationFee, rewardHoldTotal);
  return {
    plannedPlayerCount: params.plannedPlayerCount,
    rewardEligibleSlots,
    rewardPerParticipant: params.rewardPerParticipant,
    rewardHoldTotal,
    roomCreationFee: params.roomCreationFee,
    totalRequiredCoin,
  };
}

export function canAffordJoinCreate(availableBalance: string, totalRequiredCoin: string): boolean {
  return compareCoinAmounts(availableBalance, totalRequiredCoin) >= 0;
}
