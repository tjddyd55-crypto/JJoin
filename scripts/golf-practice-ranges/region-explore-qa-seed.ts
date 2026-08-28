/**
 * Local-only QA seed for region explore (JOINABLE future joins).
 *
 *   pnpm exec tsx scripts/golf-practice-ranges/region-explore-qa-seed.ts
 *   pnpm exec tsx scripts/golf-practice-ranges/region-explore-qa-seed.ts --cleanup
 *
 * Refuses non-local DATABASE_URL. Never run against production/remote.
 */
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { addCalendarDays, kstDayBoundsUtc, localDayKey } from '../../packages/domain/src/index.ts';
import { PrismaService } from '../../apps/api/src/prisma/prisma.service.ts';
import { GolfFacilitiesService } from '../../apps/api/src/modules/golf-facilities/golf-facilities.service.ts';
import { ensureFoundation } from '../../apps/api/src/foundation/ensure-foundation.ts';

export const QA_REGION_EXPLORE_TAG = '[QA-REGION-EXPLORE]';
const QA_HOST_USER_ID = '00000000-0000-4000-8000-000000000099';

type SeedJoinSpec = {
  dateKey: string;
  kstHour: number;
  titleSuffix: string;
};

type SeedRegionSpec = {
  label: string;
  sido: string;
  sigungu: string;
  facilityCount: number;
  joins: SeedJoinSpec[];
};

function assertLocalDatabaseUrl(): void {
  const url = process.env.DATABASE_URL ?? '';
  const lower = url.toLowerCase();
  const local =
    lower.includes('localhost') ||
    lower.includes('127.0.0.1') ||
    lower.includes('@db:5432') ||
    lower.includes('host.docker.internal');
  if (!local) {
    throw new Error(
      `Refusing QA seed/cleanup: DATABASE_URL is not local (${url.slice(0, 40)}…)`,
    );
  }
}

function kstDateTime(dateKey: string, hour: number, minute = 0): Date {
  const hh = String(hour).padStart(2, '0');
  const mm = String(minute).padStart(2, '0');
  return new Date(`${dateKey}T${hh}:${mm}:00+09:00`);
}

function futureSlot(dateKey: string, hour: number, now: Date): Date {
  const { end } = kstDayBoundsUtc(dateKey);
  let slot = kstDateTime(dateKey, hour);
  if (slot.getTime() <= now.getTime() + 30 * 60_000) {
    slot = new Date(now.getTime() + 2 * 60 * 60_000);
  }
  if (slot.getTime() >= end.getTime() - 60 * 60_000) {
    slot = new Date(end.getTime() - 2 * 60 * 60_000);
  }
  return slot;
}

async function ensureQaHost(prisma: PrismaClient): Promise<void> {
  const existing = await prisma.user.findUnique({ where: { id: QA_HOST_USER_ID } });
  if (existing) return;
  await prisma.user.create({
    data: {
      id: QA_HOST_USER_ID,
      status: 'ACTIVE',
      identityStatus: 'VERIFIED',
      locale: 'ko-KR',
      countryCode: 'KR',
      timezone: 'Asia/Seoul',
    },
  });
}

async function pickFacilities(
  prisma: PrismaClient,
  sido: string | string[],
  sigungu: string,
  count: number,
  usedFacilityIds: Set<string>,
) {
  const rows = await prisma.golfFacility.findMany({
    where: {
      isActive: true,
      isScreenJoinEligible: true,
      coordinateStatus: 'VALID',
      latitude: { not: null },
      longitude: { not: null },
      sigungu,
      sido: Array.isArray(sido) ? { in: sido } : sido,
      id: { notIn: [...usedFacilityIds] },
    },
    orderBy: { displayName: 'asc' },
    take: count,
    select: { id: true, displayName: true, sido: true, sigungu: true },
  });
  if (rows.length < count) {
    throw new Error(
      `Not enough facilities for ${sigungu}: need ${count}, found ${rows.length}`,
    );
  }
  for (const row of rows) usedFacilityIds.add(row.id);
  return rows;
}

async function seedRegion(
  prisma: PrismaService,
  golfSvc: GolfFacilitiesService,
  sportId: string,
  coinAssetId: string,
  spec: SeedRegionSpec,
  usedFacilityIds: Set<string>,
  now: Date,
): Promise<{ joins: number; venues: number }> {
  const facilities = await pickFacilities(
    prisma,
    spec.sido,
    spec.sigungu,
    spec.facilityCount,
    usedFacilityIds,
  );

  const venueIds: string[] = [];
  for (const facility of facilities) {
    const activated = await golfSvc.activateVenue(QA_HOST_USER_ID, facility.id);
    venueIds.push(activated.venueId);
  }

  let joinCount = 0;
  for (let i = 0; i < spec.joins.length; i += 1) {
    const joinSpec = spec.joins[i]!;
    const venueId = venueIds[i % venueIds.length]!;
    const startAt = futureSlot(joinSpec.dateKey, joinSpec.kstHour, now);
    const scheduledEndAt = new Date(startAt.getTime() + 2 * 60 * 60_000);

    await prisma.join.create({
      data: {
        sportId,
        venueId,
        hostUserId: QA_HOST_USER_ID,
        coinAssetId,
        status: 'OPEN',
        joinMethod: 'OPEN',
        joinKind: 'STANDARD',
        title: `${QA_REGION_EXPLORE_TAG} ${spec.label} ${joinSpec.titleSuffix}`,
        startAt,
        scheduledEndAt,
        plannedPlayerCount: 4,
        confirmedPlayerCount: 1,
        rewardPerParticipant: 0,
        roomCreationFeeAmount: 0,
        rewardHoldTotalAmount: 0,
      },
    });
    joinCount += 1;
  }

  return { joins: joinCount, venues: venueIds.length };
}

function buildSeedPlan(now: Date): SeedRegionSpec[] {
  const today = localDayKey(now, 'Asia/Seoul');
  const tomorrow = addCalendarDays(today, 1);
  const weekday = new Date(`${today}T12:00:00+09:00`).getDay();
  const weekendKey =
    weekday === 6 || weekday === 0
      ? today
      : addCalendarDays(today, 6 - weekday);

  return [
    {
      label: '서울-강남',
      sido: ['서울특별시', '서울'],
      sigungu: '강남구',
      facilityCount: 2,
      joins: [
        { dateKey: today, kstHour: 19, titleSuffix: '강남-1' },
        { dateKey: tomorrow, kstHour: 18, titleSuffix: '강남-2' },
      ],
    },
    {
      label: '서울-송파',
      sido: ['서울특별시', '서울'],
      sigungu: '송파구',
      facilityCount: 2,
      joins: [
        { dateKey: today, kstHour: 20, titleSuffix: '송파-1' },
        { dateKey: weekendKey, kstHour: 15, titleSuffix: '송파-2' },
      ],
    },
    {
      label: '서울-마포',
      sido: ['서울특별시', '서울'],
      sigungu: '마포구',
      facilityCount: 1,
      joins: [
        { dateKey: tomorrow, kstHour: 19, titleSuffix: '마포-1' },
        { dateKey: weekendKey, kstHour: 16, titleSuffix: '마포-2' },
      ],
    },
    {
      label: '경기-고양',
      sido: ['경기도', '경기'],
      sigungu: '고양시',
      facilityCount: 2,
      joins: [
        { dateKey: today, kstHour: 18, titleSuffix: '고양-1' },
        { dateKey: tomorrow, kstHour: 17, titleSuffix: '고양-2' },
        { dateKey: weekendKey, kstHour: 14, titleSuffix: '고양-3' },
      ],
    },
    {
      label: '인천-연수',
      sido: ['인천광역시', '인천'],
      sigungu: '연수구',
      facilityCount: 1,
      joins: [
        { dateKey: today, kstHour: 21, titleSuffix: '연수-1' },
        { dateKey: weekendKey, kstHour: 13, titleSuffix: '연수-2' },
      ],
    },
  ];
}

export async function cleanupRegionExploreQa(prisma: PrismaClient): Promise<number> {
  const qaJoins = await prisma.join.findMany({
    where: { title: { startsWith: QA_REGION_EXPLORE_TAG } },
    select: { id: true },
  });
  const joinIds = qaJoins.map((j) => j.id);
  if (joinIds.length === 0) return 0;

  await prisma.joinParticipant.deleteMany({ where: { joinId: { in: joinIds } } });
  await prisma.join.deleteMany({ where: { id: { in: joinIds } } });
  return joinIds.length;
}

async function main() {
  assertLocalDatabaseUrl();
  const cleanup = process.argv.includes('--cleanup');
  const prisma = new PrismaService();
  const raw = new PrismaClient();

  try {
    if (cleanup) {
      const removed = await cleanupRegionExploreQa(raw);
      console.log(JSON.stringify({ action: 'cleanup', removedJoins: removed }, null, 2));
      return;
    }

    const existing = await raw.join.count({
      where: { title: { startsWith: QA_REGION_EXPLORE_TAG } },
    });
    if (existing > 0) {
      console.log(`Removing ${existing} existing QA joins before re-seed…`);
      await cleanupRegionExploreQa(raw);
    }

    await ensureQaHost(raw);
    const { sport, coinAsset } = await ensureFoundation(prisma);
    const golfSvc = new GolfFacilitiesService(prisma);
    const now = new Date();
    const plan = buildSeedPlan(now);
    const usedFacilityIds = new Set<string>();

    let totalJoins = 0;
    let totalVenues = 0;
    const regions: Record<string, { joins: number; venues: number }> = {};

    for (const spec of plan) {
      const result = await seedRegion(
        prisma,
        golfSvc,
        sport.id,
        coinAsset.id,
        spec,
        usedFacilityIds,
        now,
      );
      totalJoins += result.joins;
      totalVenues += result.venues;
      regions[spec.label] = result;
    }

    console.log(
      JSON.stringify(
        {
          action: 'seed',
          tag: QA_REGION_EXPLORE_TAG,
          hostUserId: QA_HOST_USER_ID,
          dates: {
            today: localDayKey(now, 'Asia/Seoul'),
            tomorrow: addCalendarDays(localDayKey(now, 'Asia/Seoul'), 1),
          },
          totalJoins,
          totalVenues,
          regions,
        },
        null,
        2,
      ),
    );
  } finally {
    await raw.$disconnect();
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
