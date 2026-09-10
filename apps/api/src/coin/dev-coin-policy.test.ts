import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  CoinPolicyDisabledError,
  isDevCoinFundingAllowed,
  resolveCoinPolicyMode,
  resolveRoomCreationFee,
} from './dev-coin-policy';

const TRACKED = [
  'JJOIN_APP_VARIANT',
  'RAILWAY_ENVIRONMENT',
  'SOCIAL_AUTH_MODE',
  'COIN_POLICY_MODE',
] as const;

function withEnv(overrides: Record<string, string | undefined>, fn: () => void): void {
  const saved: Record<string, string | undefined> = {};
  for (const key of TRACKED) saved[key] = process.env[key];
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  try {
    fn();
  } finally {
    for (const key of TRACKED) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
  }
}

test('production variant disables TEST coin even if SOCIAL_AUTH_MODE=hybrid', () => {
  withEnv(
    {
      JJOIN_APP_VARIANT: 'production',
      SOCIAL_AUTH_MODE: 'hybrid',
      COIN_POLICY_MODE: undefined,
    },
    () => {
      assert.equal(resolveCoinPolicyMode(), 'disabled');
      assert.equal(isDevCoinFundingAllowed(), false);
      assert.throws(() => resolveRoomCreationFee(), CoinPolicyDisabledError);
    },
  );
});

test('production variant ignores explicit COIN_POLICY_MODE=dev', () => {
  withEnv(
    {
      JJOIN_APP_VARIANT: 'production',
      SOCIAL_AUTH_MODE: 'hybrid',
      COIN_POLICY_MODE: 'dev',
    },
    () => {
      assert.equal(resolveCoinPolicyMode(), 'disabled');
      assert.equal(isDevCoinFundingAllowed(), false);
    },
  );
});

test('development variant keeps TEST coin and funding for mock/hybrid', () => {
  withEnv(
    {
      JJOIN_APP_VARIANT: 'development',
      SOCIAL_AUTH_MODE: 'hybrid',
      COIN_POLICY_MODE: undefined,
    },
    () => {
      assert.equal(resolveCoinPolicyMode(), 'dev');
      assert.equal(isDevCoinFundingAllowed(), true);
      assert.equal(resolveRoomCreationFee(), '2');
    },
  );
});

test('development variant with SOCIAL_AUTH_MODE=real stays disabled unless COIN_POLICY_MODE=dev', () => {
  withEnv(
    {
      JJOIN_APP_VARIANT: 'development',
      SOCIAL_AUTH_MODE: 'real',
      COIN_POLICY_MODE: undefined,
    },
    () => {
      assert.equal(resolveCoinPolicyMode(), 'disabled');
      assert.equal(isDevCoinFundingAllowed(), false);
    },
  );
});
