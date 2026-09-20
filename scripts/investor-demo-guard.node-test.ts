/**
 * Production fail-closed proof for investor/demo seed.
 * Run: pnpm exec tsx scripts/investor-demo-guard.node-test.ts
 */
import assert from 'node:assert/strict';
import {
  attendanceGrantIdempotencyKey,
  milestoneGrantIdempotencyKey,
} from '../packages/domain/src/attendance-rewards.ts';
import {
  DEMO_PERSONAS,
  PROTECTED_PROVIDER_SUBJECTS,
  demoEmail,
  demoProviderSubject,
  isDemoEmail,
  isDemoProviderSubject,
  isProtectedProviderSubject,
} from './lib/investor-demo-catalog.ts';
import { listRecentKstDates } from './lib/investor-demo-rewards.ts';
import {
  INVESTOR_DEMO_TX_MAX_WAIT_MS,
  INVESTOR_DEMO_TX_TIMEOUT_MS,
  assertInvestorDemoAllowed,
  investorDemoPrismaClientOptions,
  investorDemoTransactionOptions,
  resolveInvestorDemoBlockReason,
  readDemoEnv,
} from './lib/investor-demo-guard.ts';

function withEnv(overrides: Record<string, string | undefined>, fn: () => void): void {
  const keys = [
    'NODE_ENV',
    'RAILWAY_ENVIRONMENT',
    'RAILWAY_ENVIRONMENT_NAME',
    'JJOIN_APP_VARIANT',
    'APP_ENV',
    'DATABASE_URL',
  ];
  const saved: Record<string, string | undefined> = {};
  for (const key of keys) saved[key] = process.env[key];
  // Clear first so host RAILWAY_* / APP_* cannot leak into the case under test.
  for (const key of keys) delete process.env[key];
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  try {
    fn();
  } finally {
    for (const key of keys) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
  }
}

function assertBlocked(overrides: Record<string, string | undefined>, pattern: RegExp): void {
  withEnv(overrides, () => {
    const reason = resolveInvestorDemoBlockReason(readDemoEnv());
    assert.ok(reason, `expected block for ${JSON.stringify(overrides)}`);
    assert.match(reason, pattern);
    assert.throws(() => assertInvestorDemoAllowed(), pattern);
  });
}

function assertAllowed(overrides: Record<string, string | undefined>): void {
  withEnv(overrides, () => {
    const reason = resolveInvestorDemoBlockReason(readDemoEnv());
    assert.equal(reason, null, reason ?? 'allowed');
    assert.doesNotThrow(() => assertInvestorDemoAllowed());
  });
}

assertBlocked(
  {
    JJOIN_APP_VARIANT: 'production',
    RAILWAY_ENVIRONMENT: 'development',
    NODE_ENV: 'development',
    DATABASE_URL: 'postgres://localhost/jjoin',
  },
  /production_forbidden appVariant=production/,
);

assertBlocked(
  {
    JJOIN_APP_VARIANT: 'development',
    RAILWAY_ENVIRONMENT: 'production',
    NODE_ENV: 'development',
    DATABASE_URL: 'postgres://localhost/jjoin',
  },
  /production_forbidden railwayEnvironment=production/,
);

assertBlocked(
  {
    JJOIN_APP_VARIANT: undefined,
    RAILWAY_ENVIRONMENT: undefined,
    RAILWAY_ENVIRONMENT_NAME: 'production',
    NODE_ENV: 'development',
    DATABASE_URL: 'postgres://localhost/jjoin',
  },
  /production_forbidden railwayEnvironment=production/,
);

assertBlocked(
  {
    JJOIN_APP_VARIANT: 'development',
    RAILWAY_ENVIRONMENT: 'development',
    NODE_ENV: 'development',
    DATABASE_URL: 'postgres://api-production.railway.app/jjoin',
  },
  /production_forbidden database_url/,
);

assertBlocked(
  {
    JJOIN_APP_VARIANT: undefined,
    RAILWAY_ENVIRONMENT: undefined,
    NODE_ENV: 'production',
    DATABASE_URL: 'postgres://localhost/jjoin',
  },
  /production_forbidden nodeEnv=production/,
);

assertBlocked(
  {
    JJOIN_APP_VARIANT: undefined,
    RAILWAY_ENVIRONMENT: undefined,
    NODE_ENV: undefined,
    DATABASE_URL: undefined,
  },
  /production_forbidden ambiguous_environment/,
);

assertAllowed({
  JJOIN_APP_VARIANT: undefined,
  RAILWAY_ENVIRONMENT: 'development',
  NODE_ENV: 'production',
  DATABASE_URL: 'postgres://postgres.railway.internal/railway',
});

assertAllowed({
  JJOIN_APP_VARIANT: 'development',
  RAILWAY_ENVIRONMENT: undefined,
  NODE_ENV: 'production',
  DATABASE_URL: 'postgres://postgres.railway.internal/railway',
});

assertAllowed({
  JJOIN_APP_VARIANT: undefined,
  RAILWAY_ENVIRONMENT: undefined,
  NODE_ENV: 'development',
  DATABASE_URL: 'postgres://127.0.0.1:5432/jjoin',
});

for (const persona of DEMO_PERSONAS) {
  const email = demoEmail(persona.slug);
  const subject = demoProviderSubject(persona.slug);
  assert.equal(isDemoEmail(email), true);
  assert.equal(isDemoProviderSubject(subject), true);
  assert.equal(isProtectedProviderSubject(subject), false);
  for (const protectedSubject of PROTECTED_PROVIDER_SUBJECTS) {
    assert.notEqual(subject, protectedSubject);
  }
}

assert.equal(
  attendanceGrantIdempotencyKey('user-1', '2026-09-20'),
  'reward:attendance:user-1:2026-09-20',
);
assert.equal(
  milestoneGrantIdempotencyKey('HOST_MILESTONE', 'user-1', 5),
  'reward:host_milestone:user-1:5',
);
assert.equal(
  milestoneGrantIdempotencyKey('PARTICIPATION_MILESTONE', 'user-1', 10),
  'reward:participation_milestone:user-1:10',
);

assert.equal(INVESTOR_DEMO_TX_TIMEOUT_MS, 60_000);
assert.equal(INVESTOR_DEMO_TX_MAX_WAIT_MS, 20_000);
assert.equal(investorDemoTransactionOptions().timeout, 60_000);
assert.equal(investorDemoPrismaClientOptions().transactionOptions.timeout, 60_000);

const dates = listRecentKstDates(3, true, '2026-09-20');
assert.deepEqual(dates, ['2026-09-18', '2026-09-19', '2026-09-20']);
const withoutToday = listRecentKstDates(2, false, '2026-09-20');
assert.deepEqual(withoutToday, ['2026-09-18', '2026-09-19']);

console.log('investor-demo-guard.node-test PASS');
