/**
 * Development-only QA seed: store dashboard + recurring + recommendations.
 * Tag: [QA-STORE-DASH-RECUR-RECOMMEND]
 *
 * Usage (DEV DB only):
 *   railway run -s api -e development -- pnpm exec tsx scripts/seed-store-growth-loop-qa.ts
 */
import { randomUUID } from 'node:crypto';
import {
  JoinKind,
  JoinStatus,
  MatchingRewardTarget,
  ParticipantRole,
  ParticipationStatus,
  Prisma,
  PrismaClient,
  RecurringJoinCadence,
  RecurringJoinScheduleStatus,
  StoreOwnershipStatus,
} from '@prisma/client';
import {
  isoWeekdayKst,
  kstDateKey,
  nextWeeklyOccurrenceStart,
} from '../packages/domain/src/index.ts';

const TAG = '[QA-STORE-DASH-RECUR-RECOMMEND]';
const prisma = new PrismaClient();

async function main() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL required');
  console.log(`${TAG} seeding…`);

  const nicknames = [
    '김진우_DEV_A',
    '박민수_DEV_B',
    'QAUser',
    'DevE2EUserㄴSeoul',
    '금치',
  ];
  const profiles = await prisma.userProfile.findMany({
    where: { OR: [{ nickname: { in: nicknames } }, { nickname: { contains: 'DEV' } }] },
    take: 12,
  });
  const byNick = new Map(profiles.map((p) => [p.nickname, p]));

  // Prefer 김진우_DEV_A as store owner when they already have ACTIVE ownership
  // (matches USB DEV app mock login).
  const ownershipCandidates = await prisma.storeOwnership.findMany({
    where: {
      status: StoreOwnershipStatus.ACTIVE,
      user: {
        profile: {
          nickname: { in: nicknames },
        },
      },
    },
    include: { user: { include: { profile: true } } },
    take: 20,
  });
  const preferredOwnerIds = [
    byNick.get('DevE2EUserㄴSeoul')?.userId,
    byNick.get('김진우_DEV_A')?.userId,
    byNick.get('금치')?.userId,
  ].filter(Boolean) as string[];
  const ownerFromStores =
    ownershipCandidates.find((o) => preferredOwnerIds.includes(o.userId))?.user
      .profile ??
    ownershipCandidates[0]?.user.profile ??
    null;

  const owner =
    ownerFromStores ??
    byNick.get('김진우_DEV_A') ??
    byNick.get('금치') ??
    profiles[0];
  if (!owner) throw new Error('need DEV owner user');

  await prisma.user.update({
    where: { id: owner.userId },
    data: { identityStatus: 'VERIFIED' },
  });

  const pickDistinct = (...preferred: Array<typeof owner | undefined>) => {
    const used = new Set<string>([owner.userId]);
    for (const p of preferred) {
      if (p && !used.has(p.userId)) return p;
    }
    const fallback = profiles.find((p) => !used.has(p.userId));
    if (!fallback) throw new Error('need distinct DEV participant users');
    return fallback;
  };

  const userA = pickDistinct(
    byNick.get('김진우_DEV_A'),
    byNick.get('QAUser'),
    profiles.find((p) => p.userId !== owner.userId),
  );
  const userB = pickDistinct(
    byNick.get('박민수_DEV_B'),
    byNick.get('DevE2EUserㄴSeoul'),
  );

  const sport = await prisma.sport.findFirst();
  const coin = await prisma.coinAsset.findFirst();
  if (!sport || !coin) throw new Error('sport/coin missing');

  // Prefer facilities with ownership or create ownership on two facilities
  let ownerships = await prisma.storeOwnership.findMany({
    where: { userId: owner.userId, status: StoreOwnershipStatus.ACTIVE },
    include: { golfFacility: true, venue: true },
    take: 5,
  });
  ownerships = ownerships.sort((a, b) => {
    const pref = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
    if (a.golfFacilityId === pref) return -1;
    if (b.golfFacilityId === pref) return 1;
    return a.createdAt.getTime() - b.createdAt.getTime();
  });

  if (ownerships.length < 1) {
    const facility = await prisma.golfFacility.findFirst({
      where: { isActive: true, isScreenJoinEligible: true },
    });
    if (!facility) throw new Error('no golf facility');
    let venue = await prisma.venue.findFirst({ where: { golfFacilityId: facility.id } });
    if (!venue) {
      venue = await prisma.venue.create({
        data: {
          id: randomUUID(),
          name: facility.displayName,
          golfFacilityId: facility.id,
          sportId: sport.id,
          address: facility.roadAddress ?? facility.lotAddress ?? '서울',
          latitude: facility.latitude ?? new Prisma.Decimal('37.5'),
          longitude: facility.longitude ?? new Prisma.Decimal('127.0'),
        },
      });
    }
    const created = await prisma.storeOwnership.create({
      data: {
        id: randomUUID(),
        userId: owner.userId,
        golfFacilityId: facility.id,
        venueId: venue.id,
        status: StoreOwnershipStatus.ACTIVE,
      },
      include: { golfFacility: true, venue: true },
    });
    ownerships = [created];
  }

  const storeA = ownerships[0]!;
  let storeB = ownerships[1] ?? null;
  if (!storeB) {
    const otherFacility = await prisma.golfFacility.findFirst({
      where: {
        isActive: true,
        isScreenJoinEligible: true,
        id: { not: storeA.golfFacilityId },
      },
    });
    if (otherFacility) {
      let venueB = await prisma.venue.findFirst({
        where: { golfFacilityId: otherFacility.id },
      });
      if (!venueB) {
        venueB = await prisma.venue.create({
          data: {
            id: randomUUID(),
            name: `${TAG} Store B ${otherFacility.displayName}`.slice(0, 80),
            golfFacilityId: otherFacility.id,
            sportId: sport.id,
            address: otherFacility.roadAddress ?? otherFacility.lotAddress ?? '서울',
            latitude: otherFacility.latitude ?? new Prisma.Decimal('37.51'),
            longitude: otherFacility.longitude ?? new Prisma.Decimal('127.01'),
          },
        });
      }
      storeB = await prisma.storeOwnership.create({
        data: {
          id: randomUUID(),
          userId: owner.userId,
          golfFacilityId: otherFacility.id,
          venueId: venueB.id,
          status: StoreOwnershipStatus.ACTIVE,
        },
        include: { golfFacility: true, venue: true },
      });
    }
  }

  // Cleanup prior tagged joins/schedules
  await prisma.recurringJoinSchedule.updateMany({
    where: { title: { startsWith: TAG } },
    data: { status: RecurringJoinScheduleStatus.DELETED },
  });
  const oldJoins = await prisma.join.findMany({
    where: { title: { startsWith: TAG } },
    select: { id: true },
  });
  if (oldJoins.length) {
    const ids = oldJoins.map((j) => j.id);
    await prisma.joinParticipant.deleteMany({ where: { joinId: { in: ids } } });
    await prisma.join.deleteMany({ where: { id: { in: ids } } });
    console.log(`${TAG} cleaned ${ids.length} joins`);
  }

  const venueA = storeA.venueId
    ? await prisma.venue.findUniqueOrThrow({ where: { id: storeA.venueId } })
    : null;
  if (!venueA) throw new Error('store A needs venue');

  async function makeJoin(input: {
    ownershipId: string;
    venueId: string;
    startAt: Date;
    status: JoinStatus;
    isUrgent?: boolean;
    confirmed: number;
    planned?: number;
    suffix: string;
    hostUserId?: string;
  }) {
    const id = randomUUID();
    const planned = input.planned ?? 4;
    const hostId = input.hostUserId ?? owner!.userId;
    await prisma.join.create({
      data: {
        id,
        sportId: sport!.id,
        venueId: input.venueId,
        hostUserId: hostId,
        title: `${TAG} ${input.suffix}`,
        status: input.status,
        joinKind: JoinKind.STORE_MATCHING,
        startAt: input.startAt,
        scheduledEndAt: new Date(input.startAt.getTime() + 2 * 60 * 60_000),
        recruitClosesAt: new Date(input.startAt.getTime() - 60 * 60_000),
        plannedPlayerCount: planned,
        minimumPlayers: 2,
        targetMaleCount: 2,
        targetFemaleCount: 2,
        matchingRewardTarget: MatchingRewardTarget.ALL,
        storeOwnershipId: input.ownershipId,
        confirmedPlayerCount: input.confirmed,
        isUrgent: input.isUrgent ?? false,
        rewardPerParticipant: new Prisma.Decimal('100'),
        coinAssetId: coin!.id,
        roomCreationFeeAmount: new Prisma.Decimal('0'),
        rewardHoldTotalAmount: new Prisma.Decimal('0'),
        participants: {
          create: (() => {
            const status =
              input.status === JoinStatus.COMPLETED
                ? ParticipationStatus.COMPLETED
                : ParticipationStatus.APPROVED;
            const rows: Array<{
              userId: string;
              role: ParticipantRole;
              participationStatus: ParticipationStatus;
            }> = [
              {
                userId: hostId,
                role: ParticipantRole.HOST,
                participationStatus: status,
              },
            ];
            const seen = new Set([hostId]);
            const extras = [owner!.userId, userA!.userId, userB!.userId];
            for (const uid of extras) {
              if (rows.length >= Math.max(1, input.confirmed)) break;
              if (seen.has(uid)) continue;
              seen.add(uid);
              rows.push({
                userId: uid,
                role: ParticipantRole.PARTICIPANT,
                participationStatus: status,
              });
            }
            return rows;
          })(),
        },
      },
    });
    return id;
  }

  const now = new Date();
  // Store A history for KPI
  await makeJoin({
    ownershipId: storeA.id,
    venueId: venueA.id,
    startAt: new Date(now.getTime() - 10 * 24 * 60 * 60_000),
    status: JoinStatus.COMPLETED,
    confirmed: 3,
    suffix: 'A-done-1',
  });
  await makeJoin({
    ownershipId: storeA.id,
    venueId: venueA.id,
    startAt: new Date(now.getTime() - 8 * 24 * 60 * 60_000),
    status: JoinStatus.COMPLETED,
    confirmed: 3,
    suffix: 'A-done-2',
  });
  await makeJoin({
    ownershipId: storeA.id,
    venueId: venueA.id,
    startAt: new Date(now.getTime() - 5 * 24 * 60 * 60_000),
    status: JoinStatus.CANCELLED,
    confirmed: 1,
    suffix: 'A-cancel',
  });
  await makeJoin({
    ownershipId: storeA.id,
    venueId: venueA.id,
    startAt: new Date(now.getTime() - 2 * 24 * 60 * 60_000),
    status: JoinStatus.COMPLETED,
    isUrgent: true,
    confirmed: 4,
    suffix: 'A-urgent-ok',
  });
  const openA = await makeJoin({
    ownershipId: storeA.id,
    venueId: venueA.id,
    startAt: new Date(now.getTime() + 6 * 60 * 60_000),
    status: JoinStatus.OPEN,
    isUrgent: true,
    confirmed: 1,
    suffix: 'A-open-urgent',
    // Host must not be the recommend viewer (owner / DEV_A).
    hostUserId: userB.userId,
  });

  // Follow + region for recommendations (viewer = owner DEV_A)
  await prisma.golfFacilityFollow.upsert({
    where: {
      userId_golfFacilityId: {
        userId: owner.userId,
        golfFacilityId: storeA.golfFacilityId,
      },
    },
    create: {
      id: randomUUID(),
      userId: owner.userId,
      golfFacilityId: storeA.golfFacilityId,
    },
    update: {},
  });
  await prisma.golfFacilityFollow.upsert({
    where: {
      userId_golfFacilityId: {
        userId: userA.userId,
        golfFacilityId: storeA.golfFacilityId,
      },
    },
    create: {
      id: randomUUID(),
      userId: userA.userId,
      golfFacilityId: storeA.golfFacilityId,
    },
    update: {},
  });

  // Recurring weekly Wed 19:00
  const next = nextWeeklyOccurrenceStart({
    dayOfWeek: 3,
    startTimeLocal: '19:00',
    after: now,
  });
  const schedule = await prisma.recurringJoinSchedule.create({
    data: {
      id: randomUUID(),
      ownerUserId: owner.userId,
      storeOwnershipId: storeA.id,
      golfFacilityId: storeA.golfFacilityId,
      cadence: RecurringJoinCadence.WEEKLY,
      dayOfWeek: 3,
      startTimeLocal: '19:00',
      targetMaleCount: 2,
      targetFemaleCount: 2,
      minimumPlayers: 2,
      matchingRewardTarget: MatchingRewardTarget.ALL,
      // DEV wallets are often at funding floor (~200); keep HOLD at 0 for scheduler E2E.
      rewardPerParticipant: new Prisma.Decimal('0'),
      title: `${TAG} weekly wed 19`,
      recruitClosesHoursBefore: 3,
      status: RecurringJoinScheduleStatus.ACTIVE,
      nextRunAt: next,
    },
  });

  console.log(
    JSON.stringify(
      {
        tag: TAG,
        ownerUserId: owner.userId,
        ownerNick: owner.nickname,
        userA: userA.userId,
        storeA: storeA.id,
        storeB: storeB?.id ?? null,
        facilityA: storeA.golfFacilityId,
        openUrgentJoinId: openA,
        scheduleId: schedule.id,
        nextRunAt: schedule.nextRunAt,
        weekday: isoWeekdayKst(next),
        occurrenceKey: kstDateKey(next),
      },
      null,
      2,
    ),
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
