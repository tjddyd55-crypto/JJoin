/**
 * DEV / TEST coin policy only.
 * Production fee/reward/KRW values remain POLICY_TBD — never treat these as product policy.
 */

export type CoinPolicyMode = 'dev' | 'disabled';

export class CoinPolicyDisabledError extends Error {
  readonly code = 'COIN_POLICY_UNAVAILABLE';
  constructor() {
    super('coin_policy_disabled');
    this.name = 'CoinPolicyDisabledError';
  }
}

function resolveSocialAuthMode(): string {
  return (process.env.SOCIAL_AUTH_MODE ?? 'mock').trim().toLowerCase();
}

/** Hybrid keeps real Kakao tokens while DEV personas still need TEST coin policy. */
function isRegressionSocialAuthMode(): boolean {
  const mode = resolveSocialAuthMode();
  return mode === 'mock' || mode === 'hybrid';
}

/** TEST ONLY / POLICY_TBD — not a production price or fee schedule. */
export const DEV_TEST_COIN_POLICY = {
  mode: 'dev' as const,
  assetCode: 'JJOIN',
  /** TEST ONLY room creation fee (POLICY_TBD for production). */
  roomCreationFee: '2',
  /** TEST ONLY default reward per participant when client omits it (POLICY_TBD). */
  defaultRewardPerParticipant: '20',
  /**
   * TEST ONLY target available balance after DEV persona funding.
   * Not a free-grant production policy.
   */
  fundingTargetAvailable: '200',
} as const;

export function resolveCoinPolicyMode(): CoinPolicyMode {
  const raw = (process.env.COIN_POLICY_MODE ?? '').trim().toLowerCase();
  if (raw === 'disabled') return 'disabled';
  if (raw === 'dev') return 'dev';
  // Railway production QA: mock + hybrid social auth both use TEST coin policy for DEV personas.
  if (isRegressionSocialAuthMode()) return 'dev';
  return 'disabled';
}

export function isDevCoinFundingAllowed(): boolean {
  if (resolveCoinPolicyMode() !== 'dev') return false;
  return isRegressionSocialAuthMode();
}

export function resolveRoomCreationFee(): string {
  if (resolveCoinPolicyMode() !== 'dev') {
    throw new CoinPolicyDisabledError();
  }
  return DEV_TEST_COIN_POLICY.roomCreationFee;
}

export function resolveDefaultRewardPerParticipant(): string {
  if (resolveCoinPolicyMode() !== 'dev') {
    throw new CoinPolicyDisabledError();
  }
  return DEV_TEST_COIN_POLICY.defaultRewardPerParticipant;
}

export function resolveFundingTargetAvailable(): string {
  return DEV_TEST_COIN_POLICY.fundingTargetAvailable;
}

/** DEV persona-specific wallet funding target (TEST only). */
export function resolveFundingTargetForPersona(personaLabel: string): string {
  if (personaLabel === 'DEV_BILLING_LOW') return '20';
  if (personaLabel === 'DEV_BILLING_RETRY') return '500';
  return resolveFundingTargetAvailable();
}
