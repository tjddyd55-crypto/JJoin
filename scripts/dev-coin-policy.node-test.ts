import assert from 'node:assert/strict';
import {
  CoinPolicyDisabledError,
  isDevCoinFundingAllowed,
  resolveCoinPolicyMode,
  resolveRoomCreationFee,
} from '../apps/api/src/coin/dev-coin-policy.ts';

function withEnv(overrides: Record<string, string | undefined>, fn: () => void) {
  const saved = { ...process.env };
  Object.assign(process.env, overrides);
  try {
    fn();
  } finally {
    process.env = saved;
  }
}

withEnv({ COIN_POLICY_MODE: '', SOCIAL_AUTH_MODE: 'hybrid', NODE_ENV: 'production' }, () => {
  assert.equal(resolveCoinPolicyMode(), 'dev');
  assert.equal(isDevCoinFundingAllowed(), true);
  assert.equal(resolveRoomCreationFee(), '2');
});

withEnv({ COIN_POLICY_MODE: '', SOCIAL_AUTH_MODE: 'real', NODE_ENV: 'production' }, () => {
  assert.equal(resolveCoinPolicyMode(), 'disabled');
  assert.throws(() => resolveRoomCreationFee(), CoinPolicyDisabledError);
});

console.log('dev-coin-policy.node-test PASS');
