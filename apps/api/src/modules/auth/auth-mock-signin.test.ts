import assert from 'node:assert/strict';
import { test } from 'node:test';
import { MockAuthPersona, SocialProvider } from '@jjoin/types';
import { isMockSignInEnabled, resolveMockSignInProvider } from './auth-mock-signin';

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

test('resolveMockSignInProvider defaults persona-only DEV sign-in to KAKAO', () => {
  assert.equal(
    resolveMockSignInProvider({ persona: MockAuthPersona.DEV_A }),
    SocialProvider.KAKAO,
  );
});

test('resolveMockSignInProvider preserves explicit provider for persona sign-in', () => {
  assert.equal(
    resolveMockSignInProvider({
      provider: SocialProvider.NAVER,
      persona: MockAuthPersona.DEV_B,
    }),
    SocialProvider.NAVER,
  );
});

test('resolveMockSignInProvider leaves scenario-only without provider unset', () => {
  assert.equal(resolveMockSignInProvider({}), undefined);
});

test('production variant disables mock-sign-in even when SOCIAL_AUTH_MODE=hybrid', () => {
  withEnv({ JJOIN_APP_VARIANT: 'production', SOCIAL_AUTH_MODE: 'hybrid' }, () => {
    assert.equal(isMockSignInEnabled(), false);
  });
  withEnv({ JJOIN_APP_VARIANT: 'production', SOCIAL_AUTH_MODE: 'mock' }, () => {
    assert.equal(isMockSignInEnabled(), false);
  });
});

test('development variant keeps mock-sign-in for mock and hybrid', () => {
  withEnv({ JJOIN_APP_VARIANT: 'development', SOCIAL_AUTH_MODE: 'mock' }, () => {
    assert.equal(isMockSignInEnabled(), true);
  });
  withEnv({ JJOIN_APP_VARIANT: 'development', SOCIAL_AUTH_MODE: 'hybrid' }, () => {
    assert.equal(isMockSignInEnabled(), true);
  });
  withEnv({ JJOIN_APP_VARIANT: 'development', SOCIAL_AUTH_MODE: 'real' }, () => {
    assert.equal(isMockSignInEnabled(), false);
  });
});
