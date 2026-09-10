import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isSettlementQaAllowed } from './settlement-clock';

const TRACKED = ['JJOIN_APP_VARIANT', 'RAILWAY_ENVIRONMENT', 'SOCIAL_AUTH_MODE'] as const;

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

test('production variant never enables settlement/waitlist QA clock even in hybrid', () => {
  withEnv({ JJOIN_APP_VARIANT: 'production', SOCIAL_AUTH_MODE: 'hybrid' }, () => {
    assert.equal(isSettlementQaAllowed(), false);
  });
  withEnv({ JJOIN_APP_VARIANT: 'production', SOCIAL_AUTH_MODE: 'mock' }, () => {
    assert.equal(isSettlementQaAllowed(), false);
  });
});

test('development variant still allows QA clock in mock/hybrid', () => {
  withEnv({ JJOIN_APP_VARIANT: 'development', SOCIAL_AUTH_MODE: 'hybrid' }, () => {
    assert.equal(isSettlementQaAllowed(), true);
  });
  withEnv({ JJOIN_APP_VARIANT: 'development', SOCIAL_AUTH_MODE: 'mock' }, () => {
    assert.equal(isSettlementQaAllowed(), true);
  });
  withEnv({ JJOIN_APP_VARIANT: 'development', SOCIAL_AUTH_MODE: 'real' }, () => {
    assert.equal(isSettlementQaAllowed(), false);
  });
});
