/**
 * Production DB test-data cleanup — selective delete with guards.
 *
 * PRESERVE: golf_facilities, public_golf_facility_sync_runs, sports, sport_rules,
 *           coin_assets, admin_login_credentials + linked admin User, _prisma_migrations
 *
 * Usage (via Railway Postgres SSH tunnel):
 *   DRY RUN:
 *     pnpm exec tsx scripts/ops/production-db-cleanup.ts --via-railway-tunnel
 *   EXECUTE (manual ops only — never automate):
 *     pnpm exec tsx scripts/ops/production-db-cleanup.ts \
 *       --via-railway-tunnel --execute --confirm-production \
 *       --confirm-phrase=JJOINZONE_PRODUCTION_CLEANUP
 *
 * Requires DATABASE_URL pointing at production (tunnel: 127.0.0.1:<port>).
 */
import { PrismaClient } from '@prisma/client';

const CONFIRM_PHRASE = 'JJOINZONE_PRODUCTION_CLEANUP';
const MIN_GOLF_FACILITIES = 10_000;

const prisma = new PrismaClient();
const EXECUTE = process.argv.includes('--execute');
const CONFIRM_PRODUCTION = process.argv.includes('--confirm-production');
const VIA_RAILWAY_TUNNEL = process.argv.includes('--via-railway-tunnel');
const confirmPhraseArg = process.argv.find((a) => a.startsWith('--confirm-phrase='));
const confirmPhrase = confirmPhraseArg?.slice('--confirm-phrase='.length);

function assertProductionEnvironment(): void {
  const url = process.env.DATABASE_URL ?? '';
  if (!url) {
    throw new Error('DATABASE_FAIL DATABASE_URL is required');
  }

  let host = '';
  try {
    host = new URL(url.replace(/^postgres(ql)?:\/\//, 'postgresql://')).hostname;
  } catch {
    throw new Error('DATABASE_FAIL DATABASE_URL is invalid');
  }

  const isLocalDev =
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host.endsWith('.local') ||
    url.includes('@localhost:');

  if (isLocalDev && !VIA_RAILWAY_TUNNEL) {
    throw new Error(
      'ENV_GUARD blocked: local DATABASE_URL requires --via-railway-tunnel (Railway SSH tunnel to production).',
    );
  }

  const railwayEnv = process.env.RAILWAY_ENVIRONMENT?.trim();
  if (railwayEnv && railwayEnv !== 'production') {
    throw new Error(`ENV_GUARD blocked: RAILWAY_ENVIRONMENT=${railwayEnv} (production required)`);
  }
}

type Snapshot = {
  golfFacilities: number;
  adminCredentials: number;
  migrations: number;
};

async function snapshot(): Promise<Snapshot> {
  const [golfFacilities, adminCredentials, migrationRows] = await Promise.all([
    prisma.golfFacility.count(),
    prisma.adminLoginCredential.count(),
    prisma.$queryRaw<Array<{ cnt: bigint }>>`SELECT COUNT(*)::bigint AS cnt FROM _prisma_migrations`,
  ]);
  return {
    golfFacilities,
    adminCredentials,
    migrations: Number(migrationRows[0]?.cnt ?? 0),
  };
}

function assertGuards(before: Snapshot, after: Snapshot): void {
  if (after.golfFacilities !== before.golfFacilities) {
    throw new Error(
      `GUARD_FAIL golf_facilities changed ${before.golfFacilities} -> ${after.golfFacilities}`,
    );
  }
  if (after.adminCredentials !== before.adminCredentials || after.adminCredentials === 0) {
    throw new Error(
      `GUARD_FAIL admin_login_credentials ${before.adminCredentials} -> ${after.adminCredentials}`,
    );
  }
  if (after.migrations !== before.migrations) {
    throw new Error(
      `GUARD_FAIL _prisma_migrations changed ${before.migrations} -> ${after.migrations}`,
    );
  }
}

async function countDeleteTargets(adminUserIds: string[]) {
  const notAdmin = { notIn: adminUserIds.length ? adminUserIds : ['00000000-0000-0000-0000-000000000000'] };
  const nonAdminWalletIds = (
    await prisma.wallet.findMany({ where: { userId: notAdmin }, select: { id: true } })
  ).map((w) => w.id);

  return {
    dispute_cases: await prisma.disputeCase.count(),
    reports: await prisma.report.count(),
    notification_outbox: await prisma.notificationOutbox.count(),
    notifications: await prisma.appNotification.count(),
    reward_settlements: await prisma.rewardSettlement.count(),
    coin_issuances: await prisma.coinIssuance.count({ where: { userId: notAdmin } }),
    coin_holds: await prisma.coinHold.count({
      where: nonAdminWalletIds.length ? { walletId: { in: nonAdminWalletIds } } : undefined,
    }),
    coin_transactions: await prisma.coinTransaction.count({
      where: nonAdminWalletIds.length ? { walletId: { in: nonAdminWalletIds } } : undefined,
    }),
    join_participants: await prisma.joinParticipant.count(),
    join_requirements: await prisma.joinRequirement.count(),
    join_options: await prisma.joinOption.count(),
    joins: await prisma.join.count(),
    store_ownerships: await prisma.storeOwnership.count(),
    store_ownership_requests: await prisma.storeOwnershipRequest.count(),
    user_venue_recents: await prisma.userVenueRecent.count({ where: { userId: notAdmin } }),
    user_venue_favorites: await prisma.userVenueFavorite.count({ where: { userId: notAdmin } }),
    user_join_region_preferences: await prisma.userJoinRegionPreference.count({
      where: { userId: notAdmin },
    }),
    user_presences: await prisma.userPresence.count({ where: { userId: notAdmin } }),
    push_devices: await prisma.pushDevice.count({ where: { userId: notAdmin } }),
    venues: await prisma.venue.count(),
    wallets: await prisma.wallet.count({ where: { userId: notAdmin } }),
    media_assets: await prisma.mediaAsset.count({ where: { ownerUserId: notAdmin } }),
    identity_verifications: await prisma.identityVerification.count({ where: { userId: notAdmin } }),
    user_sport_profiles: await prisma.userSportProfile.count({ where: { userId: notAdmin } }),
    user_consents: await prisma.userConsent.count({ where: { userId: notAdmin } }),
    user_profiles: await prisma.userProfile.count({ where: { userId: notAdmin } }),
    social_accounts: await prisma.socialAccount.count({ where: { userId: notAdmin } }),
    users_non_admin: await prisma.user.count({ where: { id: notAdmin } }),
  };
}

type Db = Pick<
  PrismaClient,
  | 'wallet'
  | 'disputeCase'
  | 'report'
  | 'notificationOutbox'
  | 'appNotification'
  | 'rewardSettlement'
  | 'coinIssuance'
  | 'coinHold'
  | 'coinTransaction'
  | 'joinParticipant'
  | 'joinRequirement'
  | 'joinOption'
  | 'join'
  | 'storeOwnership'
  | 'storeOwnershipRequest'
  | 'userVenueRecent'
  | 'userVenueFavorite'
  | 'userJoinRegionPreference'
  | 'userPresence'
  | 'pushDevice'
  | 'venue'
  | 'mediaAsset'
  | 'identityVerification'
  | 'userSportProfile'
  | 'userConsent'
  | 'userProfile'
  | 'socialAccount'
  | 'user'
>;

async function runCleanup(db: Db, adminUserIds: string[]): Promise<void> {
  const notAdmin = { notIn: adminUserIds };
  const nonAdminWalletIds = (
    await db.wallet.findMany({ where: { userId: notAdmin }, select: { id: true } })
  ).map((w) => w.id);

  // 1. Join / dispute ecosystem
  await db.disputeCase.deleteMany({});
  await db.report.deleteMany({});
  await db.notificationOutbox.deleteMany({});
  await db.appNotification.deleteMany({ where: { userId: notAdmin } });
  await db.rewardSettlement.deleteMany({});

  // 2. Coin (issuance before ledger — Restrict FK)
  await db.coinIssuance.deleteMany({ where: { userId: notAdmin } });
  if (nonAdminWalletIds.length) {
    await db.coinHold.deleteMany({ where: { walletId: { in: nonAdminWalletIds } } });
    await db.coinTransaction.deleteMany({ where: { walletId: { in: nonAdminWalletIds } } });
  }

  // 3. Join graph
  await db.joinParticipant.deleteMany({});
  await db.joinRequirement.deleteMany({});
  await db.joinOption.deleteMany({});
  await db.join.deleteMany({});

  // 4. Store (test only — GolfFacility preserved)
  await db.storeOwnership.deleteMany({});
  await db.storeOwnershipRequest.deleteMany({});

  // 5. User venue prefs / presence / push
  await db.userVenueRecent.deleteMany({ where: { userId: notAdmin } });
  await db.userVenueFavorite.deleteMany({ where: { userId: notAdmin } });
  await db.userJoinRegionPreference.deleteMany({ where: { userId: notAdmin } });
  await db.userPresence.deleteMany({ where: { userId: notAdmin } });
  await db.pushDevice.deleteMany({ where: { userId: notAdmin } });

  // 6. Test-activated venues (GF master untouched — onDelete SetNull on GF side)
  await db.venue.deleteMany({});

  // 7. Remaining user-bound data then users
  await db.wallet.deleteMany({ where: { userId: notAdmin } });
  await db.mediaAsset.deleteMany({ where: { ownerUserId: notAdmin } });
  await db.identityVerification.deleteMany({ where: { userId: notAdmin } });
  await db.userSportProfile.deleteMany({ where: { userId: notAdmin } });
  await db.userConsent.deleteMany({ where: { userId: notAdmin } });
  await db.userProfile.deleteMany({ where: { userId: notAdmin } });
  await db.socialAccount.deleteMany({ where: { userId: notAdmin } });
  await db.user.deleteMany({ where: { id: notAdmin } });
}

async function main() {
  assertProductionEnvironment();

  if (EXECUTE && !CONFIRM_PRODUCTION) {
    console.error(
      'EXECUTE blocked: pass --confirm-production together with --execute (manual ops script only).',
    );
    process.exit(1);
  }

  if (EXECUTE && confirmPhrase !== CONFIRM_PHRASE) {
    console.error(
      `EXECUTE blocked: pass --confirm-phrase=${CONFIRM_PHRASE} (exact match required).`,
    );
    process.exit(1);
  }

  const adminCreds = await prisma.adminLoginCredential.findMany({
    select: { userId: true, loginId: true },
  });
  const adminUserIds = adminCreds.map((c) => c.userId);

  console.log('=== PRODUCTION DB CLEANUP ===');
  console.log(`mode=${EXECUTE ? 'EXECUTE' : 'DRY_RUN'}`);
  console.log(`adminUserIds=${JSON.stringify(adminUserIds)}`);
  console.log(`adminLoginIds=${JSON.stringify(adminCreds.map((c) => c.loginId))}`);

  const before = await snapshot();
  console.log('=== PRESERVE SNAPSHOT (before) ===');
  console.log(JSON.stringify(before));

  const targets = await countDeleteTargets(adminUserIds);
  const deleteTotal = Object.values(targets).reduce((a, b) => a + b, 0);

  console.log('=== DELETE PLAN ===');
  for (const [k, v] of Object.entries(targets)) {
    console.log(`${k}=${v}`);
  }
  console.log(`DELETE_TOTAL=${deleteTotal}`);

  console.log('=== PRESERVE (unchanged) ===');
  console.log(`golf_facilities=${before.golfFacilities}`);
  console.log(
    `public_golf_facility_sync_runs=${await prisma.publicGolfFacilitySyncRun.count()}`,
  );
  console.log(`sports=${await prisma.sport.count()}`);
  console.log(`sport_rules=${await prisma.sportRule.count()}`);
  console.log(`coin_assets=${await prisma.coinAsset.count()}`);
  console.log(`admin_login_credentials=${before.adminCredentials}`);
  console.log(`_prisma_migrations=${before.migrations}`);

  if (before.golfFacilities < MIN_GOLF_FACILITIES) {
    throw new Error(
      `FINGERPRINT_FAIL golf_facilities=${before.golfFacilities} (expected >= ${MIN_GOLF_FACILITIES})`,
    );
  }

  if (!EXECUTE) {
    console.log('DRY_RUN complete — pass --execute --confirm-production --confirm-phrase=... to apply');
    return;
  }

  const midBefore = await snapshot();
  await prisma.$transaction(
    async (tx) => {
      await runCleanup(tx as unknown as Db, adminUserIds);
    },
    { timeout: 120_000 },
  );
  const after = await snapshot();
  assertGuards(midBefore, after);

  const afterCounts = await countDeleteTargets(adminUserIds);
  const afterSnap = await snapshot();

  console.log('=== AFTER CLEANUP ===');
  console.log(JSON.stringify(afterSnap));
  for (const [k, v] of Object.entries(afterCounts)) {
    console.log(`${k}=${v}`);
  }
  console.log(`users_total=${await prisma.user.count()}`);
  console.log('CLEANUP_SUCCESS');
}

main()
  .catch((e) => {
    console.error('CLEANUP_FAIL', e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(() => void prisma.$disconnect());
