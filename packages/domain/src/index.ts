/**
 * Pure domain helpers — no Nest/Prisma/UI imports.
 */

import {
  AuthAppState,
  IdentityStatus,
  type GatedActionType,
  type MeDto,
  type PendingActionIntent,
} from '@jjoin/types';

export type DurationStrategy = 'PER_PLAYER_MINUTES' | 'FIXED_MINUTES' | 'CUSTOM';

export interface SportDurationRule {
  strategy: DurationStrategy;
  minutesPerPlayer?: number;
  fixedMinutes?: number;
}

export function estimateEndAt(params: {
  startAt: Date;
  playerCount: number;
  rule: SportDurationRule;
}): Date {
  const { startAt, playerCount, rule } = params;
  if (playerCount < 1) {
    throw new Error('playerCount must be >= 1');
  }

  let minutes = 0;
  switch (rule.strategy) {
    case 'PER_PLAYER_MINUTES':
      if (!rule.minutesPerPlayer || rule.minutesPerPlayer <= 0) {
        throw new Error('minutesPerPlayer required');
      }
      minutes = playerCount * rule.minutesPerPlayer;
      break;
    case 'FIXED_MINUTES':
      if (!rule.fixedMinutes || rule.fixedMinutes <= 0) {
        throw new Error('fixedMinutes required');
      }
      minutes = rule.fixedMinutes;
      break;
    default:
      throw new Error(`Unsupported duration strategy: ${rule.strategy}`);
  }

  return new Date(startAt.getTime() + minutes * 60_000);
}

export function autoPayAt(scheduledEndAt: Date, hours = 24): Date {
  return new Date(scheduledEndAt.getTime() + hours * 60 * 60_000);
}

export {
  canAutoPayReward,
  canHostPayReward,
  blocksAutoPay,
  computeAutoPayAt,
  formatCountdownMs,
  isAutoPayDue,
  isSettlementWindowOpen,
  isTerminalRewardStatus,
  settlementRefundIdempotencyKey,
  settlementRowIdempotencyKey,
  settlementTransferIdempotencyKey,
  systemSettlementClock,
  TERMINAL_REWARD_STATUSES,
  type SettlementClock,
  type TerminalRewardStatus,
} from './settlement';

/**
 * Default venue keyword per sport for Explore live search.
 * Keep mapping here — never hardcode in screen components.
 */
export const SPORT_VENUE_SEARCH_KEYWORDS: Record<string, string> = {
  SCREEN_GOLF: '스크린골프',
};

export function defaultVenueSearchQuery(sportCode: string): string {
  return SPORT_VENUE_SEARCH_KEYWORDS[sportCode] ?? sportCode;
}

export const SCREEN_GOLF_DURATION_RULE: SportDurationRule = {
  strategy: 'PER_PLAYER_MINUTES',
  minutesPerPlayer: 60,
};

/** Confirmed roster size — HOST + APPROVED/CONFIRMED participants. */
export function computeConfirmedPlayerCount(statuses: string[]): number {
  return statuses.filter((s) => s === 'APPROVED' || s === 'CONFIRMED').length;
}

export function isJoinFull(confirmedPlayerCount: number, plannedPlayerCount: number): boolean {
  return confirmedPlayerCount >= plannedPlayerCount;
}

export function nextJoinStatusAfterRoster(params: {
  currentStatus: string;
  confirmedPlayerCount: number;
  plannedPlayerCount: number;
}): 'OPEN' | 'FULL' | string {
  if (params.currentStatus === 'CANCELLED' || params.currentStatus === 'COMPLETED') {
    return params.currentStatus;
  }
  return isJoinFull(params.confirmedPlayerCount, params.plannedPlayerCount) ? 'FULL' : 'OPEN';
}

export function resolveAuthAppState(me: MeDto | null, hasSession: boolean): AuthAppState {
  if (!hasSession || !me) {
    return AuthAppState.UNAUTHENTICATED;
  }
  if (!me.authAppHints.termsAccepted) {
    return AuthAppState.AUTHENTICATED_NEEDS_TERMS;
  }
  if (me.identity.verificationStatus !== IdentityStatus.VERIFIED) {
    return AuthAppState.AUTHENTICATED_IDENTITY_UNVERIFIED;
  }
  if (!me.authAppHints.profileComplete || !me.authAppHints.hasAvatar) {
    return AuthAppState.AUTHENTICATED_PROFILE_INCOMPLETE;
  }
  if (!me.authAppHints.locationOnboardingComplete) {
    return AuthAppState.AUTHENTICATED_PROFILE_INCOMPLETE;
  }
  return AuthAppState.READY;
}

/** Onboarding path for new users. */
export function resolveOnboardingStep(me: MeDto): SocialSignInNextStep {
  if (!me.authAppHints.termsAccepted) return 'TERMS';
  if (me.identity.verificationStatus !== IdentityStatus.VERIFIED) return 'IDENTITY';
  if (!me.authAppHints.profileComplete) return 'PROFILE_SETUP';
  if (!me.authAppHints.hasAvatar) return 'PROFILE_PHOTO';
  if (!me.authAppHints.locationOnboardingComplete) return 'LOCATION';
  return 'HOME';
}

export type SocialSignInNextStep =
  | 'HOME'
  | 'TERMS'
  | 'IDENTITY'
  | 'PROFILE_SETUP'
  | 'PROFILE_PHOTO'
  | 'LOCATION';

export function requiresIdentityGate(
  identityStatus: IdentityStatus,
  action: GatedActionType,
): boolean {
  void action;
  return identityStatus !== IdentityStatus.VERIFIED;
}

export function pendingActionRoute(intent: PendingActionIntent): string {
  switch (intent.type) {
    case 'CREATE_JOIN':
      return '/(tabs)/create';
    case 'APPLY_JOIN':
      return `/join/${intent.joinId}`;
    case 'COIN_ACTIVITY':
      return '/my/wallet';
    default:
      return '/(tabs)';
  }
}

const PRIVATE_FIELD_DENYLIST = [
  'realName',
  'phone',
  'ci',
  'di',
  'ciHash',
  'birthDate',
  'phoneEncrypted',
  'verifiedNameMasked',
] as const;

export function assertPublicProfileHasNoPrivateFields(profile: object): void {
  const keys = Object.keys(profile);
  for (const denied of PRIVATE_FIELD_DENYLIST) {
    if (keys.includes(denied)) {
      throw new Error(`PublicUserProfileDto must not include private field: ${denied}`);
    }
  }
}

export function mapGenderDisplay(gender: string | null | undefined): string | null {
  switch (gender) {
    case 'MALE':
      return '남성';
    case 'FEMALE':
      return '여성';
    case 'OTHER':
      return '기타';
    case 'UNSPECIFIED':
      return null;
    default:
      return null;
  }
}

export {
  CoinAmountError,
  addCoinAmounts,
  compareCoinAmounts,
  formatCoinUnits,
  isCoinAmountPositive,
  mulCoinAmountByInt,
  parseCoinUnits,
  subCoinAmounts,
  zeroCoinAmount,
} from './coin-amount';

export {
  canAffordJoinCreate,
  computeJoinCoinRequirement,
  computeRewardEligibleSlots,
  type JoinCoinRequirement,
} from './coin-join';
