/**
 * Production DB audit — counts only, no mutations.
 * Usage (read-only, via Railway Postgres SSH tunnel):
 *   pnpm exec tsx scripts/ops/production-db-audit.ts --via-railway-tunnel
 *
 * Never prints secrets. Counts only.
 */
import { PrismaClient } from '@prisma/client';

function assertAuditEnvironment(): void {
  const url = process.env.DATABASE_URL ?? '';
  if (!url) {
    throw new Error('DATABASE_FAIL DATABASE_URL is required');
  }
  const viaTunnel = process.argv.includes('--via-railway-tunnel');
  let host = '';
  try {
    host = new URL(url.replace(/^postgres(ql)?:\/\//, 'postgresql://')).hostname;
  } catch {
    throw new Error('DATABASE_FAIL DATABASE_URL is invalid');
  }
  const isLocal = host === 'localhost' || host === '127.0.0.1';
  if (isLocal && !viaTunnel) {
    throw new Error(
      'ENV_GUARD blocked: local DATABASE_URL requires --via-railway-tunnel for production audit.',
    );
  }
}

const prisma = new PrismaClient();

type CountRow = { label: string; count: number };

async function count(label: string, fn: () => Promise<number>): Promise<CountRow> {
  return { label, count: await fn() };
}

async function main() {
  assertAuditEnvironment();

  const adminCreds = await prisma.adminLoginCredential.findMany({
    select: { id: true, userId: true, loginId: true, createdAt: true },
  });
  const adminUserIds = adminCreds.map((c) => c.userId);

  const rows: CountRow[] = await Promise.all([
    count('golf_facilities', () => prisma.golfFacility.count()),
    count('public_golf_facility_sync_runs', () => prisma.publicGolfFacilitySyncRun.count()),
    count('sports', () => prisma.sport.count()),
    count('sport_rules', () => prisma.sportRule.count()),
    count('coin_assets', () => prisma.coinAsset.count()),
    count('users_total', () => prisma.user.count()),
    count('users_non_admin', () =>
      prisma.user.count({ where: { id: { notIn: adminUserIds.length ? adminUserIds : ['00000000-0000-0000-0000-000000000000'] } } }),
    ),
    count('admin_login_credentials', () => prisma.adminLoginCredential.count()),
    count('social_accounts', () => prisma.socialAccount.count()),
    count('social_accounts_non_admin', () =>
      prisma.socialAccount.count({
        where: { userId: { notIn: adminUserIds.length ? adminUserIds : ['00000000-0000-0000-0000-000000000000'] } },
      }),
    ),
    count('user_profiles', () => prisma.userProfile.count()),
    count('user_consents', () => prisma.userConsent.count()),
    count('identity_verifications', () => prisma.identityVerification.count()),
    count('media_assets', () => prisma.mediaAsset.count()),
    count('user_sport_profiles', () => prisma.userSportProfile.count()),
    count('user_presences', () => prisma.userPresence.count()),
    count('push_devices', () => prisma.pushDevice.count()),
    count('notifications', () => prisma.appNotification.count()),
    count('notification_outbox', () => prisma.notificationOutbox.count()),
    count('venues', () => prisma.venue.count()),
    count('venues_with_golf_facility', () => prisma.venue.count({ where: { golfFacilityId: { not: null } } })),
    count('user_venue_recents', () => prisma.userVenueRecent.count()),
    count('user_venue_favorites', () => prisma.userVenueFavorite.count()),
    count('user_join_region_preferences', () => prisma.userJoinRegionPreference.count()),
    count('joins', () => prisma.join.count()),
    count('join_participants', () => prisma.joinParticipant.count()),
    count('join_requirements', () => prisma.joinRequirement.count()),
    count('join_options', () => prisma.joinOption.count()),
    count('reward_settlements', () => prisma.rewardSettlement.count()),
    count('coin_holds', () => prisma.coinHold.count()),
    count('coin_transactions', () => prisma.coinTransaction.count()),
    count('coin_issuances', () => prisma.coinIssuance.count()),
    count('wallets', () => prisma.wallet.count()),
    count('store_ownership_requests', () => prisma.storeOwnershipRequest.count()),
    count('store_ownerships', () => prisma.storeOwnership.count()),
    count('reports', () => prisma.report.count()),
    count('dispute_cases', () => prisma.disputeCase.count()),
  ]);

  const migrationCount = await prisma.$queryRaw<Array<{ cnt: bigint }>>`
    SELECT COUNT(*)::bigint AS cnt FROM _prisma_migrations
  `;

  console.log('=== PRODUCTION DB AUDIT (read-only) ===');
  console.log(JSON.stringify({ adminUserIds, adminLoginIds: adminCreds.map((c) => c.loginId) }, null, 2));
  for (const row of rows) {
    console.log(`${row.label}=${row.count}`);
  }
  console.log(`_prisma_migrations=${migrationCount[0]?.cnt ?? 0}`);

  const sampleUsers = await prisma.user.findMany({
    where: { id: { notIn: adminUserIds } },
    take: 20,
    select: {
      id: true,
      status: true,
      createdAt: true,
      profile: { select: { nickname: true } },
      socialAccounts: { select: { provider: true, providerSubject: true } },
      adminLoginCredential: { select: { loginId: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  console.log('=== NON-ADMIN USER SAMPLE (masked) ===');
  for (const u of sampleUsers) {
    console.log(
      JSON.stringify({
        userId: u.id,
        nickname: u.profile?.nickname?.slice(0, 8) ?? null,
        providers: u.socialAccounts.map((s) => s.provider),
        createdAt: u.createdAt.toISOString(),
      }),
    );
  }
}

main()
  .catch((e) => {
    console.error('AUDIT_FAIL', e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(() => void prisma.$disconnect());
