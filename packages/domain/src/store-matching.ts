/**
 * Store-matching (모집형) join domain helpers.
 * Keep STANDARD coin-join math separate — host is not a player slot here.
 */

import {
  addCoinAmounts,
  mulCoinAmountByInt,
  zeroCoinAmount,
} from './coin-amount';
import { canAffordJoinCreate } from './coin-join';

export type MatchingRewardTarget = 'FEMALE' | 'MALE' | 'ALL';

export type MatchingGender = 'MALE' | 'FEMALE' | 'UNSPECIFIED' | 'OTHER' | string | null | undefined;

export type MatchingRosterCounts = {
  male: number;
  female: number;
  other: number;
  total: number;
};

export type MatchingTargetComposition = {
  targetMaleCount: number;
  targetFemaleCount: number;
};

export type MatchingJoinCoinRequirement = {
  plannedPlayerCount: number;
  rewardEligibleSlots: number;
  rewardPerParticipant: string;
  rewardHoldTotal: string;
  roomCreationFee: string;
  totalRequiredCoin: string;
};

export type MatchingDeadlineOutcome =
  | { action: 'noop' }
  | { action: 'confirm'; reason: 'FULL' | 'MINIMUM' }
  | { action: 'cancel'; reason: 'INSUFFICIENT' };

/** Target roster size for screen matching MVP (max 4). */
export function computeMatchingPlannedPlayerCount(composition: MatchingTargetComposition): number {
  const male = composition.targetMaleCount;
  const female = composition.targetFemaleCount;
  if (!Number.isInteger(male) || !Number.isInteger(female) || male < 0 || female < 0) {
    throw new Error('invalid_target_composition');
  }
  const total = male + female;
  if (total < 1 || total > 4) {
    throw new Error('planned_player_count_out_of_range');
  }
  return total;
}

/**
 * HOLD slots = max reward recipients under the chosen target.
 * FEMALE → targetFemaleCount, MALE → targetMaleCount, ALL → planned total.
 */
export function computeMatchingRewardEligibleSlots(params: {
  targetMaleCount: number;
  targetFemaleCount: number;
  matchingRewardTarget: MatchingRewardTarget;
}): number {
  const planned = computeMatchingPlannedPlayerCount(params);
  switch (params.matchingRewardTarget) {
    case 'FEMALE':
      return params.targetFemaleCount;
    case 'MALE':
      return params.targetMaleCount;
    case 'ALL':
      return planned;
    default:
      throw new Error('invalid_matching_reward_target');
  }
}

export function computeMatchingJoinCoinRequirement(params: {
  targetMaleCount: number;
  targetFemaleCount: number;
  matchingRewardTarget: MatchingRewardTarget;
  rewardPerParticipant: string;
  /** Matching MVP: room fee usually 0; keep injectable for future policy. */
  roomCreationFee?: string;
}): MatchingJoinCoinRequirement {
  const plannedPlayerCount = computeMatchingPlannedPlayerCount(params);
  const rewardEligibleSlots = computeMatchingRewardEligibleSlots(params);
  const roomCreationFee = params.roomCreationFee ?? zeroCoinAmount();
  const rewardHoldTotal =
    rewardEligibleSlots === 0
      ? zeroCoinAmount()
      : mulCoinAmountByInt(params.rewardPerParticipant, rewardEligibleSlots);
  const totalRequiredCoin = addCoinAmounts(roomCreationFee, rewardHoldTotal);

  return {
    plannedPlayerCount,
    rewardEligibleSlots,
    rewardPerParticipant: params.rewardPerParticipant,
    rewardHoldTotal,
    roomCreationFee,
    totalRequiredCoin,
  };
}

export function canAffordMatchingJoinCreate(
  availableBalance: string,
  totalRequiredCoin: string,
): boolean {
  return canAffordJoinCreate(availableBalance, totalRequiredCoin);
}

export function countMatchingRosterByGender(
  genders: MatchingGender[],
): MatchingRosterCounts {
  let male = 0;
  let female = 0;
  let other = 0;
  for (const g of genders) {
    if (g === 'MALE') male += 1;
    else if (g === 'FEMALE') female += 1;
    else other += 1;
  }
  return { male, female, other, total: male + female + other };
}

export function canApplyMatchingGenderSlot(params: {
  applicantGender: MatchingGender;
  targetMaleCount: number;
  targetFemaleCount: number;
  confirmedGenders: MatchingGender[];
}): boolean {
  const current = countMatchingRosterByGender(params.confirmedGenders);
  const planned = computeMatchingPlannedPlayerCount(params);
  if (current.total >= planned) return false;

  if (params.applicantGender === 'MALE') {
    return current.male < params.targetMaleCount;
  }
  if (params.applicantGender === 'FEMALE') {
    return current.female < params.targetFemaleCount;
  }
  // Unspecified/other only allowed when remaining slots have no gender quota left
  // (both quotas already fillable only by M/F) — MVP: reject unspecified.
  return false;
}

export function isRewardEligibleMatchingGender(
  gender: MatchingGender,
  target: MatchingRewardTarget,
): boolean {
  if (target === 'ALL') return gender === 'MALE' || gender === 'FEMALE';
  if (target === 'FEMALE') return gender === 'FEMALE';
  if (target === 'MALE') return gender === 'MALE';
  return false;
}

export function evaluateMatchingDeadline(params: {
  now: Date;
  recruitClosesAt: Date;
  confirmedPlayerCount: number;
  minimumPlayers: number;
  plannedPlayerCount: number;
  alreadyClosed: boolean;
}): MatchingDeadlineOutcome {
  if (params.alreadyClosed) return { action: 'noop' };
  if (params.now.getTime() < params.recruitClosesAt.getTime()) {
    // Early full roster may still wait until deadline OR auto-confirm when full.
    if (params.confirmedPlayerCount >= params.plannedPlayerCount) {
      return { action: 'confirm', reason: 'FULL' };
    }
    return { action: 'noop' };
  }
  if (params.confirmedPlayerCount >= params.plannedPlayerCount) {
    return { action: 'confirm', reason: 'FULL' };
  }
  if (params.confirmedPlayerCount >= params.minimumPlayers) {
    return { action: 'confirm', reason: 'MINIMUM' };
  }
  return { action: 'cancel', reason: 'INSUFFICIENT' };
}

export function formatMatchingRecruitmentLabel(params: {
  targetMaleCount: number;
  targetFemaleCount: number;
  confirmedMale: number;
  confirmedFemale: number;
}): string {
  const maleNeed = Math.max(0, params.targetMaleCount - params.confirmedMale);
  const femaleNeed = Math.max(0, params.targetFemaleCount - params.confirmedFemale);
  if (params.confirmedMale === 0 && params.confirmedFemale === 0) {
    const parts: string[] = [];
    if (params.targetMaleCount > 0) parts.push(`남성 ${params.targetMaleCount}명`);
    if (params.targetFemaleCount > 0) parts.push(`여성 ${params.targetFemaleCount}명`);
    return `${parts.join(' · ')} 모집`;
  }
  if (femaleNeed > 0 && maleNeed === 0) return `여성 ${femaleNeed}명 모집 중`;
  if (maleNeed > 0 && femaleNeed === 0) return `남성 ${maleNeed}명 모집 중`;
  if (maleNeed > 0 && femaleNeed > 0) {
    return `남성 ${maleNeed}명 · 여성 ${femaleNeed}명 모집 중`;
  }
  return '모집 완료';
}

export function assertRecruitClosesBeforeStart(recruitClosesAt: Date, startAt: Date): void {
  if (!(recruitClosesAt.getTime() < startAt.getTime())) {
    throw new Error('recruit_closes_must_be_before_start');
  }
}

export function assertValidMinimumPlayers(
  minimumPlayers: number,
  plannedPlayerCount: number,
): void {
  if (
    !Number.isInteger(minimumPlayers) ||
    minimumPlayers < 2 ||
    minimumPlayers > plannedPlayerCount
  ) {
    throw new Error('invalid_minimum_players');
  }
}

/**
 * Matching settlement disposition for one participant after attendance marking.
 * PAY only when attended AND gender matches reward target.
 */
export function resolveMatchingRewardDisposition(params: {
  attended: boolean;
  gender: MatchingGender;
  matchingRewardTarget: MatchingRewardTarget;
}): 'PAY' | 'REFUND' {
  if (
    params.attended &&
    isRewardEligibleMatchingGender(params.gender, params.matchingRewardTarget)
  ) {
    return 'PAY';
  }
  return 'REFUND';
}

/** Aggregate payout vs unused hold after attendance marking (for tests / UI preview). */
export function summarizeMatchingSettlement(params: {
  rewardPerParticipant: string;
  heldTotal: string;
  participants: Array<{
    attended: boolean;
    gender: MatchingGender;
  }>;
  matchingRewardTarget: MatchingRewardTarget;
}): { payoutTotal: string; refundToHost: string; paidCount: number } {
  let paidCount = 0;
  let payout = zeroCoinAmount();
  for (const p of params.participants) {
    if (
      resolveMatchingRewardDisposition({
        attended: p.attended,
        gender: p.gender,
        matchingRewardTarget: params.matchingRewardTarget,
      }) === 'PAY'
    ) {
      paidCount += 1;
      payout = addCoinAmounts(payout, params.rewardPerParticipant);
    }
  }
  // Remaining hold returns to host (heldTotal - payout). If payout exceeds hold, clamp to 0.
  const held = params.heldTotal;
  const heldNum = Number(held);
  const payNum = Number(payout);
  const refund =
    Number.isFinite(heldNum) && Number.isFinite(payNum) && heldNum >= payNum
      ? String(heldNum - payNum)
      : zeroCoinAmount();
  return { payoutTotal: payout, refundToHost: refund, paidCount };
}

