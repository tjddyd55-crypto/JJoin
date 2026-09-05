/**
 * DEV-only billing closeout fixtures (Prisma). Use via `railway run -s api -e development`.
 */
import { PrismaClient, PremiumPlanCode } from '@prisma/client';
import { encryptCredential } from '../apps/api/src/common/credential-crypto.ts';

function assertDevOnly() {
  const url = process.env.DATABASE_URL ?? '';
  const env = (process.env.RAILWAY_ENVIRONMENT_NAME ?? process.env.NODE_ENV ?? '').toLowerCase();
  if (env === 'production' || url.includes('production')) {
    throw new Error('billing fixtures are DEV-only');
  }
}

export async function withBillingPrisma<T>(fn: (prisma: PrismaClient) => Promise<T>): Promise<T> {
  assertDevOnly();
  const prisma = new PrismaClient();
  try {
    return await fn(prisma);
  } finally {
    await prisma.$disconnect();
  }
}

export async function seedPremiumMembership(
  prisma: PrismaClient,
  userId: string,
  input: {
    plan: PremiumPlanCode;
    expiresAt: Date;
    nextBillingAt?: Date | null;
    cancelAtPeriodEnd?: boolean;
    withBillingAuth?: boolean;
  },
) {
  let billingAuthorizationId: string | null = null;
  if (input.withBillingAuth) {
    const auth = await prisma.premiumBillingAuthorization.upsert({
      where: { userId },
      create: {
        userId,
        customerKey: `JJOIN_fixture_${userId.replace(/-/g, '').slice(0, 16)}`,
        billingKeyEncrypted: encryptCredential('billing_fixture_test_key'),
        cardCompany: 'TEST',
        cardNumberMasked: '433012******0004',
        environment: 'TEST',
      },
      update: {
        billingKeyEncrypted: encryptCredential('billing_fixture_test_key'),
        environment: 'TEST',
      },
    });
    billingAuthorizationId = auth.id;
  }

  const now = new Date();
  await prisma.premiumMembership.upsert({
    where: { userId },
    create: {
      userId,
      status: 'ACTIVE',
      plan: input.plan,
      startedAt: now,
      expiresAt: input.expiresAt,
      nextBillingAt: input.nextBillingAt ?? null,
      cancelAtPeriodEnd: input.cancelAtPeriodEnd ?? false,
      billingAuthorizationId,
    },
    update: {
      status: 'ACTIVE',
      plan: input.plan,
      expiresAt: input.expiresAt,
      nextBillingAt: input.nextBillingAt ?? null,
      cancelAtPeriodEnd: input.cancelAtPeriodEnd ?? false,
      billingAuthorizationId,
    },
  });
}

export async function clearPremiumMembership(prisma: PrismaClient, userId: string) {
  await prisma.premiumMembership.deleteMany({ where: { userId } });
  await prisma.premiumBillingAuthorization.deleteMany({ where: { userId } });
}
