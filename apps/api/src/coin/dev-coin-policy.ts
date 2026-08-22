/**
 * DEV / TEST coin policy only.
 * Production fee/reward/KRW values remain POLICY_TBD — never treat these as product policy.
 */

export type CoinPolicyMode = 'dev' | 'disabled';

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
  // Mock auth QA on Railway uses production NODE_ENV — allow DEV policy when mock social is on.
  if (process.env.SOCIAL_AUTH_MODE === 'mock') return 'dev';
  return 'disabled';
}

export function isDevCoinFundingAllowed(): boolean {
  if (resolveCoinPolicyMode() !== 'dev') return false;
  return process.env.SOCIAL_AUTH_MODE === 'mock';
}

export function resolveRoomCreationFee(): string {
  if (resolveCoinPolicyMode() !== 'dev') {
    throw new Error('coin_policy_disabled');
  }
  return DEV_TEST_COIN_POLICY.roomCreationFee;
}

export function resolveDefaultRewardPerParticipant(): string {
  if (resolveCoinPolicyMode() !== 'dev') {
    throw new Error('coin_policy_disabled');
  }
  return DEV_TEST_COIN_POLICY.defaultRewardPerParticipant;
}

export function resolveFundingTargetAvailable(): string {
  return DEV_TEST_COIN_POLICY.fundingTargetAvailable;
}
