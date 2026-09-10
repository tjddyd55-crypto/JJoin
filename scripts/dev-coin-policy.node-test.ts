import assert from 'node:assert/strict';
import {
  CoinPolicyDisabledError,
  isDevCoinFundingAllowed,
  resolveCoinPolicyMode,
  resolveRoomCreationFee,
} from '../apps/api/src/coin/dev-coin-policy.ts';

function withEnv(overrides: Record<string, string | undefined>, fn: () => void) {
  const saved = { ...process.env };
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  try {
    fn();
  } finally {
    process.env = saved;
  }
}

withEnv(
  {
    JJOIN_APP_VARIANT: 'production',
    COIN_POLICY_MODE: '',
    SOCIAL_AUTH_MODE: 'hybrid',
    NODE_ENV: 'production',
  },
  () => {
    assert.equal(resolveCoinPolicyMode(), 'disabled');
    assert.equal(isDevCoinFundingAllowed(), false);
    assert.throws(() => resolveRoomCreationFee(), CoinPolicyDisabledError);
  },
);

withEnv(
  {
    JJOIN_APP_VARIANT: 'production',
    COIN_POLICY_MODE: 'dev',
    SOCIAL_AUTH_MODE: 'hybrid',
    NODE_ENV: 'production',
  },
  () => {
    assert.equal(resolveCoinPolicyMode(), 'disabled');
    assert.equal(isDevCoinFundingAllowed(), false);
  },
);

withEnv(
  {
    JJOIN_APP_VARIANT: 'development',
    COIN_POLICY_MODE: '',
    SOCIAL_AUTH_MODE: 'hybrid',
    NODE_ENV: 'development',
  },
  () => {
    assert.equal(resolveCoinPolicyMode(), 'dev');
    assert.equal(isDevCoinFundingAllowed(), true);
    assert.equal(resolveRoomCreationFee(), '2');
  },
);

console.log('dev-coin-policy.node-test PASS');
