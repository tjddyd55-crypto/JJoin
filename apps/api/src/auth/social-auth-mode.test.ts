import assert from 'node:assert/strict';
import { test } from 'node:test';
import { UnauthorizedException } from '@nestjs/common';
import {
  isMockSocialCredential,
  isSocialMockCredentialAllowed,
  resolveSocialAuthMode,
} from './social-auth-mode';
import { createProviderMockAdapter } from '../providers/social/mock-social.provider';

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

test('production variant rejects mock: credentials even when SOCIAL_AUTH_MODE=hybrid', () => {
  withEnv({ JJOIN_APP_VARIANT: 'production', SOCIAL_AUTH_MODE: 'hybrid' }, () => {
    assert.equal(resolveSocialAuthMode(), 'hybrid');
    assert.equal(isMockSocialCredential('mock:KAKAO:subject'), true);
    assert.equal(isSocialMockCredentialAllowed(), false);
    assert.equal(isMockSocialCredential('real-oauth-access-token'), false);
  });
});

test('production variant rejects mock: credentials when SOCIAL_AUTH_MODE=real', () => {
  withEnv({ JJOIN_APP_VARIANT: 'production', SOCIAL_AUTH_MODE: 'real' }, () => {
    assert.equal(isSocialMockCredentialAllowed(), false);
  });
});

test('development variant still accepts mock: credentials in mock and hybrid', () => {
  withEnv({ JJOIN_APP_VARIANT: 'development', SOCIAL_AUTH_MODE: 'hybrid' }, () => {
    assert.equal(isSocialMockCredentialAllowed(), true);
  });
  withEnv({ JJOIN_APP_VARIANT: 'development', SOCIAL_AUTH_MODE: 'mock' }, () => {
    assert.equal(isSocialMockCredentialAllowed(), true);
  });
  withEnv({ JJOIN_APP_VARIANT: 'development', SOCIAL_AUTH_MODE: 'real' }, () => {
    assert.equal(isSocialMockCredentialAllowed(), false);
  });
});

test('Kakao/Naver/Google mock adapters refuse mock credentials on production variant', async () => {
  await withEnvAsync(
    { JJOIN_APP_VARIANT: 'production', SOCIAL_AUTH_MODE: 'hybrid' },
    async () => {
      for (const name of ['KAKAO', 'NAVER', 'GOOGLE'] as const) {
        const adapter = createProviderMockAdapter(name);
        await assert.rejects(
          () => adapter.verifyCredential(`mock:${name}:subject`),
          (err: unknown) =>
            err instanceof UnauthorizedException &&
            (err as UnauthorizedException).message === 'mock_credential_not_allowed',
        );
      }
    },
  );
});

test('Kakao mock adapter still verifies mock credentials on development variant', async () => {
  await withEnvAsync(
    { JJOIN_APP_VARIANT: 'development', SOCIAL_AUTH_MODE: 'hybrid' },
    async () => {
      const adapter = createProviderMockAdapter('KAKAO');
      const verified = await adapter.verifyCredential('mock:KAKAO:subject');
      assert.equal(verified.subject, 'mock-kakao-subject');
    },
  );
});

async function withEnvAsync(
  overrides: Record<string, string | undefined>,
  fn: () => Promise<void>,
): Promise<void> {
  const saved: Record<string, string | undefined> = {};
  for (const key of TRACKED) saved[key] = process.env[key];
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  try {
    await fn();
  } finally {
    for (const key of TRACKED) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
  }
}
