/**
 * Store-matching (모집형) join domain helpers.
 * Keep STANDARD coin-join math separate — host is not a player slot here.
 */

import {
  addCoinAmounts,
  compareCoinAmounts,
  mulCoinAmountByInt,
  subCoinAmounts,
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

/**
 * Participant statuses that still count toward matching gender composition.
 * Includes post-settlement COMPLETED / NO_SHOW so COMPLETED detail keeps 남x/여x.
 * Excludes leave/cancel (CANCELLED), applied-only, and disputed rows.
 */
export const STORE_MATCHING_ROSTER_PARTICIPANT_STATUSES = [
  'APPROVED',
  'CONFIRMED',
  'COMPLETED',
  'NO_SHOW',
] as const;

export type StoreMatchingRosterParticipantStatus =
  (typeof STORE_MATCHING_ROSTER_PARTICIPANT_STATUSES)[number];

export function isStoreMatchingRosterParticipantStatus(
  status: string,
): status is StoreMatchingRosterParticipantStatus {
  return (STORE_MATCHING_ROSTER_PARTICIPANT_STATUSES as readonly string[]).includes(status);
}

/** Gender composition for display / recruitment labels across join lifecycle. */
export function countMatchingGenderComposition(
  participants: Array<{
    role: string;
    participationStatus: string;
    gender?: MatchingGender;
  }>,
): MatchingRosterCounts {
  const genders = participants
    .filter(
      (p) => p.role !== 'HOST' && isStoreMatchingRosterParticipantStatus(p.participationStatus),
    )
    .map((p) => p.gender ?? null);
  return countMatchingRosterByGender(genders);
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

/**
 * Remaining JOIN-level reward HOLD that can still refund to host.
 * Only ledger-moved terminals (PAID / AUTO_PAID / REFUNDED) reduce remaining.
 * Leave marks NOT_ELIGIBLE and must NOT shrink remaining — hold stays pooled.
 */
export function remainingMatchingHoldRefund(params: {
  holdTotal: string;
  settlements: Array<{ amount: string; rewardStatus: string }>;
}): string {
  let accounted = zeroCoinAmount();
  for (const s of params.settlements) {
    if (['PAID', 'AUTO_PAID', 'REFUNDED'].includes(s.rewardStatus)) {
      accounted = addCoinAmounts(accounted, s.amount);
    }
  }
  if (compareCoinAmounts(params.holdTotal, accounted) <= 0) {
    return zeroCoinAmount();
  }
  return subCoinAmounts(params.holdTotal, accounted);
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

/**
 * Derived UI status for STORE_MATCHING only.
 * Not a DB enum — computed from join status + schedule clocks.
 */
export type StoreMatchingDisplayStatus =
  | 'RECRUITING'
  | 'MINIMUM_SECURED'
  | 'CONFIRMED'
  | 'IN_PROGRESS'
  | 'ATTENDANCE_PENDING'
  | 'CANCELLED_INSUFFICIENT'
  | 'CANCELLED'
  | 'COMPLETED';

export type StoreMatchingDisplayAudience = 'host' | 'participant';

export function resolveStoreMatchingDisplayStatus(params: {
  now: Date;
  status: string;
  recruitClosesAt: Date | null | undefined;
  startAt: Date;
  scheduledEndAt: Date;
  confirmedPlayerCount: number;
  minimumPlayers: number | null | undefined;
  confirmedAt?: Date | null;
  cancelledAt?: Date | null;
}): StoreMatchingDisplayStatus {
  const { now, status } = params;
  if (status === 'COMPLETED') return 'COMPLETED';

  if (status === 'CANCELLED') {
    const closes = params.recruitClosesAt?.getTime();
    const cancelledAt = params.cancelledAt?.getTime();
    const neverConfirmed = !params.confirmedAt;
    if (
      neverConfirmed &&
      closes != null &&
      cancelledAt != null &&
      cancelledAt >= closes
    ) {
      return 'CANCELLED_INSUFFICIENT';
    }
    return 'CANCELLED';
  }

  if (status === 'OPEN' || status === 'FULL' || status === 'DRAFT') {
    const closes = params.recruitClosesAt;
    const stillRecruiting = !closes || now.getTime() < closes.getTime();
    if (stillRecruiting) {
      const minimum = params.minimumPlayers;
      if (minimum != null && minimum > 0 && params.confirmedPlayerCount >= minimum) {
        return 'MINIMUM_SECURED';
      }
      return 'RECRUITING';
    }
    // Past close but still OPEN/FULL — lazy reconcile pending; treat as recruiting edge.
    return 'RECRUITING';
  }

  if (status === 'CONFIRMED' || status === 'IN_PROGRESS' || status === 'SETTLING') {
    if (now.getTime() >= params.scheduledEndAt.getTime()) {
      return 'ATTENDANCE_PENDING';
    }
    if (now.getTime() >= params.startAt.getTime()) {
      return 'IN_PROGRESS';
    }
    return 'CONFIRMED';
  }

  return 'RECRUITING';
}

export function storeMatchingDisplayStatusLabel(
  displayStatus: StoreMatchingDisplayStatus,
  opts?: {
    audience?: StoreMatchingDisplayAudience;
    confirmedPlayerCount?: number;
  },
): string {
  const audience = opts?.audience ?? 'host';
  const count = opts?.confirmedPlayerCount;
  switch (displayStatus) {
    case 'RECRUITING':
      return audience === 'participant' ? '참가 확정' : '모집중';
    case 'MINIMUM_SECURED':
      return '진행 가능';
    case 'CONFIRMED':
      if (typeof count === 'number' && count > 0) return `${count}인 진행 확정`;
      return audience === 'participant' ? '진행 확정' : '진행 확정';
    case 'IN_PROGRESS':
      return '게임 진행중';
    case 'ATTENDANCE_PENDING':
      return audience === 'participant' ? '점주 참석 확인 대기' : '참석 확인 대기';
    case 'CANCELLED_INSUFFICIENT':
      return '인원미달 취소';
    case 'CANCELLED':
      return '모집 취소';
    case 'COMPLETED':
      return '게임 완료';
    default:
      return '모집중';
  }
}

/** Lower number = higher list priority for store-owner screens. */
export function storeMatchingOwnerListPriority(
  displayStatus: StoreMatchingDisplayStatus,
): number {
  switch (displayStatus) {
    case 'ATTENDANCE_PENDING':
      return 1;
    case 'IN_PROGRESS':
      return 2;
    case 'CONFIRMED':
      return 3;
    case 'MINIMUM_SECURED':
      return 4;
    case 'RECRUITING':
      return 5;
    case 'COMPLETED':
      return 6;
    case 'CANCELLED_INSUFFICIENT':
    case 'CANCELLED':
      return 7;
    default:
      return 99;
  }
}

export function canConfirmMatchingAttendance(params: {
  now: Date;
  status: string;
  scheduledEndAt: Date;
}): boolean {
  if (params.status === 'CANCELLED' || params.status === 'COMPLETED') return false;
  if (params.status !== 'CONFIRMED' && params.status !== 'IN_PROGRESS' && params.status !== 'SETTLING') {
    return false;
  }
  return params.now.getTime() >= params.scheduledEndAt.getTime();
}

export function computeMatchingRemainingSlots(
  plannedPlayerCount: number,
  confirmedPlayerCount: number,
): number {
  return Math.max(0, plannedPlayerCount - confirmedPlayerCount);
}

/** Relative / absolute KST-ish deadline hint without live timers. */
export function formatMatchingDeadlineHint(
  recruitClosesAt: Date,
  now: Date,
): string {
  const ms = recruitClosesAt.getTime() - now.getTime();
  if (ms <= 0) return '마감됨';
  const hours = Math.floor(ms / (60 * 60_000));
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    return `${days}일 후 마감`;
  }
  if (hours >= 1) return `${hours}시간 후 마감`;
  const minutes = Math.max(1, Math.floor(ms / 60_000));
  return `${minutes}분 후 마감`;
}

export function buildStoreMatchingSecondaryLabel(params: {
  displayStatus: StoreMatchingDisplayStatus;
  recruitmentLabel?: string | null;
  remainingSlots?: number;
  confirmedPlayerCount?: number;
  recruitClosesAt?: Date | null;
  now?: Date;
  rewardLabel?: string | null;
}): string | null {
  const { displayStatus } = params;
  if (displayStatus === 'RECRUITING' || displayStatus === 'MINIMUM_SECURED') {
    const parts: string[] = [];
    if (displayStatus === 'MINIMUM_SECURED') parts.push('진행 가능');
    if (params.recruitmentLabel) parts.push(params.recruitmentLabel);
    if (
      typeof params.remainingSlots === 'number' &&
      params.remainingSlots > 0 &&
      displayStatus === 'MINIMUM_SECURED'
    ) {
      parts.push(`${params.remainingSlots}자리 남음`);
    }
    if (params.recruitClosesAt && params.now) {
      parts.push(formatMatchingDeadlineHint(params.recruitClosesAt, params.now));
    }
    return parts.length > 0 ? parts.join(' · ') : null;
  }
  if (displayStatus === 'CONFIRMED' && typeof params.confirmedPlayerCount === 'number') {
    return `${params.confirmedPlayerCount}인 진행 확정`;
  }
  if (params.rewardLabel && (displayStatus === 'COMPLETED' || displayStatus === 'ATTENDANCE_PENDING')) {
    return params.rewardLabel;
  }
  return params.recruitmentLabel ?? null;
}

export type MatchingDeadlineBatchSummary = {
  scannedCount: number;
  confirmedCount: number;
  cancelledCount: number;
  skippedCount: number;
  errorCount: number;
  durationMs: number;
};

export function emptyMatchingDeadlineBatchSummary(
  durationMs = 0,
): MatchingDeadlineBatchSummary {
  return {
    scannedCount: 0,
    confirmedCount: 0,
    cancelledCount: 0,
    skippedCount: 0,
    errorCount: 0,
    durationMs,
  };
}

