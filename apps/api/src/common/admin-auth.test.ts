import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { PrismaService } from '../prisma/prisma.service';
import {
  ADMIN_MOCK_SUBJECT,
  isAdminUser,
  isDevAdminMockSubjectAllowed,
} from './admin-auth';

type AdminPrisma = Pick<PrismaService, 'socialAccount' | 'adminLoginCredential'>;

const TRACKED = ['JJOIN_APP_VARIANT', 'SOCIAL_AUTH_MODE', 'ADMIN_USER_IDS'] as const;

async function withEnv(
  overrides: Record<string, string | undefined>,
  fn: () => void | Promise<void>,
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

function prismaStub(opts: { credential?: boolean; mockSubject?: boolean }): AdminPrisma {
  return {
    adminLoginCredential: {
      findUnique: async () => (opts.credential ? { id: 'cred-1' } : null),
    },
    socialAccount: {
      findFirst: async () => (opts.mockSubject ? { id: 'acct-1' } : null),
    },
  } as unknown as AdminPrisma;
}

test('production variant never grants admin via DEV_ADMIN subject even in hybrid', async () => {
  await withEnv(
    { JJOIN_APP_VARIANT: 'production', SOCIAL_AUTH_MODE: 'hybrid', ADMIN_USER_IDS: '' },
    async () => {
      assert.equal(isDevAdminMockSubjectAllowed(), false);
      assert.equal(await isAdminUser(prismaStub({ mockSubject: true }), 'user-dev-admin'), false);
    },
  );
});

test('development variant still grants admin via DEV_ADMIN subject in mock/hybrid', async () => {
  await withEnv(
    { JJOIN_APP_VARIANT: 'development', SOCIAL_AUTH_MODE: 'hybrid', ADMIN_USER_IDS: '' },
    async () => {
      assert.equal(isDevAdminMockSubjectAllowed(), true);
      assert.equal(await isAdminUser(prismaStub({ mockSubject: true }), 'user-dev-admin'), true);
    },
  );
});

test('production admin password credential still grants admin', async () => {
  await withEnv(
    { JJOIN_APP_VARIANT: 'production', SOCIAL_AUTH_MODE: 'hybrid', ADMIN_USER_IDS: '' },
    async () => {
      assert.equal(
        await isAdminUser(prismaStub({ credential: true, mockSubject: true }), 'admin-user'),
        true,
      );
    },
  );
});

test('production ADMIN_USER_IDS still grants admin', async () => {
  await withEnv(
    {
      JJOIN_APP_VARIANT: 'production',
      SOCIAL_AUTH_MODE: 'real',
      ADMIN_USER_IDS: 'allowlisted-admin',
    },
    async () => {
      assert.equal(
        await isAdminUser(prismaStub({ mockSubject: true }), 'allowlisted-admin'),
        true,
      );
    },
  );
});

test('ADMIN_MOCK_SUBJECT remains the DEV_ADMIN provider subject', () => {
  assert.equal(ADMIN_MOCK_SUBJECT, 'dev-persona-admin');
});
