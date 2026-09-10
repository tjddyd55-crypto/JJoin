import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  assertJwtSecretConfigured,
  assertProductionFailClosedOnBoot,
  isJwtSecretPlaceholder,
  parseCorsOrigins,
  resolveCorsOriginConfig,
} from './production-guards';

const TRACKED = [
  'JJOIN_APP_VARIANT',
  'RAILWAY_ENVIRONMENT',
  'JWT_SECRET',
  'CORS_ORIGINS',
  'SOCIAL_AUTH_MODE',
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

test('isJwtSecretPlaceholder matches known leftovers including old fallback', () => {
  assert.equal(isJwtSecretPlaceholder('dev-only-change-me'), true);
  assert.equal(isJwtSecretPlaceholder('replace-me'), true);
  assert.equal(isJwtSecretPlaceholder('a-real-production-secret'), false);
});

test('production boot fails when JWT_SECRET is missing', () => {
  withEnv(
    {
      JJOIN_APP_VARIANT: 'production',
      JWT_SECRET: undefined,
      CORS_ORIGINS: 'https://jjoin.zone',
      SOCIAL_AUTH_MODE: 'real',
    },
    () => {
      assert.throws(() => assertProductionFailClosedOnBoot(), /JWT_SECRET_REQUIRED/);
      assert.throws(() => assertJwtSecretConfigured(), /JWT_SECRET_REQUIRED/);
    },
  );
});

test('production boot fails when JWT_SECRET is a placeholder', () => {
  withEnv(
    {
      JJOIN_APP_VARIANT: 'production',
      JWT_SECRET: 'dev-only-change-me',
      CORS_ORIGINS: 'https://jjoin.zone',
      SOCIAL_AUTH_MODE: 'real',
    },
    () => {
      assert.throws(
        () => assertProductionFailClosedOnBoot(),
        /JWT_SECRET_PLACEHOLDER_NOT_ALLOWED_IN_PRODUCTION/,
      );
    },
  );
  withEnv(
    {
      JJOIN_APP_VARIANT: 'production',
      JWT_SECRET: 'replace-me',
      CORS_ORIGINS: 'https://jjoin.zone',
      SOCIAL_AUTH_MODE: 'real',
    },
    () => {
      assert.throws(
        () => assertProductionFailClosedOnBoot(),
        /JWT_SECRET_PLACEHOLDER_NOT_ALLOWED_IN_PRODUCTION/,
      );
    },
  );
});

test('production boot fails when CORS_ORIGINS is empty', () => {
  withEnv(
    {
      JJOIN_APP_VARIANT: 'production',
      JWT_SECRET: 'production-secret-value',
      CORS_ORIGINS: '',
      SOCIAL_AUTH_MODE: 'real',
    },
    () => {
      assert.throws(() => assertProductionFailClosedOnBoot(), /CORS_ORIGINS_REQUIRED_IN_PRODUCTION/);
      assert.throws(() => resolveCorsOriginConfig(), /CORS_ORIGINS_REQUIRED_IN_PRODUCTION/);
    },
  );
});

test('production CORS never falls back to allow-all', () => {
  withEnv(
    {
      JJOIN_APP_VARIANT: 'production',
      JWT_SECRET: 'production-secret-value',
      CORS_ORIGINS: 'https://jjoin.zone, https://admin.jjoin.zone',
      SOCIAL_AUTH_MODE: 'real',
    },
    () => {
      assert.deepEqual(parseCorsOrigins(), [
        'https://jjoin.zone',
        'https://admin.jjoin.zone',
      ]);
      assert.deepEqual(resolveCorsOriginConfig(), [
        'https://jjoin.zone',
        'https://admin.jjoin.zone',
      ]);
    },
  );
});

test('production boot fails when SOCIAL_AUTH_MODE is mock or unset (defaults to mock)', () => {
  withEnv(
    {
      JJOIN_APP_VARIANT: 'production',
      JWT_SECRET: 'production-secret-value',
      CORS_ORIGINS: 'https://jjoin.zone',
      SOCIAL_AUTH_MODE: 'mock',
    },
    () => {
      assert.throws(
        () => assertProductionFailClosedOnBoot(),
        /SOCIAL_AUTH_MODE_MOCK_NOT_ALLOWED_IN_PRODUCTION/,
      );
    },
  );
  withEnv(
    {
      JJOIN_APP_VARIANT: 'production',
      JWT_SECRET: 'production-secret-value',
      CORS_ORIGINS: 'https://jjoin.zone',
      SOCIAL_AUTH_MODE: undefined,
    },
    () => {
      assert.throws(
        () => assertProductionFailClosedOnBoot(),
        /SOCIAL_AUTH_MODE_MOCK_NOT_ALLOWED_IN_PRODUCTION/,
      );
    },
  );
});

test('production boot succeeds with real secret, CORS allowlist, and hybrid (runtime stays fail-closed)', () => {
  withEnv(
    {
      JJOIN_APP_VARIANT: 'production',
      JWT_SECRET: 'production-secret-value',
      CORS_ORIGINS: 'https://jjoin.zone',
      SOCIAL_AUTH_MODE: 'hybrid',
    },
    () => {
      assert.doesNotThrow(() => assertProductionFailClosedOnBoot());
    },
  );
});

test('Railway production (implicit variant) is fail-closed for placeholder JWT', () => {
  withEnv(
    {
      JJOIN_APP_VARIANT: undefined,
      RAILWAY_ENVIRONMENT: 'production',
      JWT_SECRET: 'dev-only-change-me',
      CORS_ORIGINS: 'https://jjoin.zone',
      SOCIAL_AUTH_MODE: 'real',
    },
    () => {
      assert.throws(
        () => assertProductionFailClosedOnBoot(),
        /JWT_SECRET_PLACEHOLDER_NOT_ALLOWED_IN_PRODUCTION/,
      );
    },
  );
});

test('Railway development (implicit variant) still allows local mock boot', () => {
  withEnv(
    {
      JJOIN_APP_VARIANT: undefined,
      RAILWAY_ENVIRONMENT: 'development',
      JWT_SECRET: 'replace-me',
      CORS_ORIGINS: '',
      SOCIAL_AUTH_MODE: 'mock',
    },
    () => {
      assert.doesNotThrow(() => assertProductionFailClosedOnBoot());
      assert.equal(resolveCorsOriginConfig(), true);
    },
  );
});

test('documented local sample env boots as development (placeholder JWT + empty CORS + mock)', () => {
  withEnv(
    {
      JJOIN_APP_VARIANT: 'development',
      JWT_SECRET: 'replace-me',
      CORS_ORIGINS: '',
      SOCIAL_AUTH_MODE: 'mock',
    },
    () => {
      assert.doesNotThrow(() => assertProductionFailClosedOnBoot());
      assert.equal(resolveCorsOriginConfig(), true);
    },
  );
});

test('development boot requires JWT_SECRET but allows placeholder and empty CORS', () => {
  withEnv(
    {
      JJOIN_APP_VARIANT: 'development',
      JWT_SECRET: undefined,
      CORS_ORIGINS: '',
      SOCIAL_AUTH_MODE: 'mock',
    },
    () => {
      assert.throws(() => assertProductionFailClosedOnBoot(), /JWT_SECRET_REQUIRED/);
    },
  );
  withEnv(
    {
      JJOIN_APP_VARIANT: 'development',
      JWT_SECRET: 'replace-me',
      CORS_ORIGINS: '',
      SOCIAL_AUTH_MODE: 'mock',
    },
    () => {
      assert.doesNotThrow(() => assertProductionFailClosedOnBoot());
      assert.equal(resolveCorsOriginConfig(), true);
    },
  );
});
