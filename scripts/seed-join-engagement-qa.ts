/**
 * Development-only QA seed for join engagement growth.
 * Tag: [QA-JOIN-GROWTH]
 *
 * Requires DATABASE_URL reachable from this machine (e.g. railway connect --tunnel-only).
 */
import { randomBytes, randomUUID } from 'node:crypto';
import {
  JoinStatus,
  ParticipationStatus,
  ParticipantRole,
  PrismaClient,
} from '@prisma/client';
import {
  createJoinShareSlug,
  kstDayBoundsUtc,
  localDayKey,
} from '../packages/domain/src/index.ts';

const TAG = '[QA-JOIN-GROWTH]';
const prisma = new PrismaClient();

async function main() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL required');
  console.log(`${TAG} seeding…`);

  const preferred = await prisma.userProfile.findFirst({
    where: {
      nickname: {
        in: ['김진우_DEV_A', '박민수_DEV_B', 'QAUser', 'DevE2EUserㄴSeoul'],
      },
    },
  });
  const profile =
    preferred ??
    (await prisma.userProfile.findFirst({
      where: { nickname: { contains: 'DEV' } },
    }));
  if (!profile) throw new Error('no DEV user profile');
  const userId = profile.userId;
  console.log(`${TAG} user=${profile.nickname} ${userId}`);

  const sport = await prisma.sport.findFirst();
  const coin = await prisma.coinAsset.findFirst();
  if (!sport || !coin) throw new Error('sport/coin missing');

  // Clean previous QA joins first (FK to facilities/venues)
  const oldJoins = await prisma.join.findMany({
    where: { title: { startsWith: TAG } },
    select: { id: true },
  });
  if (oldJoins.length) {
    const ids = oldJoins.map((j) => j.id);
    await prisma.joinBookmark.deleteMany({ where: { joinId: { in: ids } } });
    await prisma.join.deleteMany({ where: { id: { in: ids } } });
    console.log(`${TAG} cleaned ${ids.length} old joins`);
  }

  await prisma.joinAlertSubscription.deleteMany({
    where: { OR: [{ label: TAG }, { label: { startsWith: TAG } }] },
  });

  // Remove previous QA-only facilities (and their venues)
  const qaFacilities = await prisma.golfFacility.findMany({
    where: { governmentSourceKey: { startsWith: `${TAG}-facility-` } },
    select: { id: true },
  });
  if (qaFacilities.length) {
    const fids = qaFacilities.map((f) => f.id);
    await prisma.golfFacilityFollow.deleteMany({
      where: { golfFacilityId: { in: fids } },
    });
    await prisma.venue.deleteMany({ where: { golfFacilityId: { in: fids } } });
    await prisma.golfFacility.deleteMany({ where: { id: { in: fids } } });
  }

  let facilities = await prisma.golfFacility.findMany({
    where: { isActive: true, latitude: { not: null }, longitude: { not: null } },
    take: 6,
    orderBy: { displayName: 'asc' },
  });

  while (facilities.length < 3) {
    const idx = facilities.length;
    const created = await prisma.golfFacility.create({
      data: {
        source: 'MANUAL',
        governmentSourceKey: `${TAG}-facility-${idx}-${randomUUID()}`,
        managementNo: `QA-MGMT-${idx}-${Date.now()}`,
        localGovernmentCode: '11140',
        sourceName: `${TAG} Facility ${idx}`,
        displayName: `${TAG} Facility ${String.fromCharCode(65 + idx)}`,
        normalizedName: `qa join growth facility ${idx}`,
        facilityType: 'SCREEN_GOLF',
        latitude: 37.5665 + idx * 0.012,
        longitude: 126.978 + idx * 0.012,
        coordinateStatus: 'VALID',
        coordinateSource: 'MANUAL',
        isActive: true,
        isScreenJoinEligible: true,
        sido: '서울특별시',
        sigungu: '중구',
        roadAddress: `${TAG} road ${idx}`,
      },
    });
    facilities.push(created);
    console.log(`${TAG} created ${created.displayName}`);
  }
  facilities = facilities.slice(0, 3);

  const today = localDayKey(new Date());
  const { start: dayStart } = kstDayBoundsUtc(today);

  async function ensureVenue(facilityId: string, name: string) {
    const existing = await prisma.venue.findFirst({
      where: { golfFacilityId: facilityId },
    });
    if (existing) return existing;
    return prisma.venue.create({
      data: {
        sportId: sport!.id,
        provider: 'CUSTOM',
        providerPlaceId: `qa-growth-${facilityId.slice(0, 8)}`,
        name,
        address: 'QA address',
        latitude: 37.5665,
        longitude: 126.978,
        golfFacilityId: facilityId,
      },
    });
  }

  const specs = [
    { facility: facilities[0]!, joinable: 2, hourOffsets: [19, 21] },
    { facility: facilities[1]!, joinable: 1, hourOffsets: [20] },
    { facility: facilities[2]!, joinable: 0, hourOffsets: [] as number[] },
  ];

  const createdJoinIds: string[] = [];
  let sampleSlug: string | null = null;

  // Keep startAt on *today* (KST) even late at night: start slightly in the past,
  // end in the future so JOINABLE (end > now) + todayKey still match.
  const todayKey = localDayKey(new Date());
  const baseStart = (() => {
    let candidate = new Date(Date.now() - 30 * 60_000);
    for (let guard = 0; guard < 12 && localDayKey(candidate) !== todayKey; guard += 1) {
      candidate = new Date(candidate.getTime() - 60 * 60_000);
    }
    return candidate;
  })();

  for (const spec of specs) {
    const venue = await ensureVenue(spec.facility.id, spec.facility.displayName);
    for (let i = 0; i < spec.joinable; i += 1) {
      const startAt = new Date(
        baseStart.getTime() + i * 20 * 60_000 + specs.indexOf(spec) * 5 * 60_000,
      );
      const endAt = new Date(Date.now() + (3 + i) * 3600_000);
      const slug = createJoinShareSlug(randomBytes(10));
      sampleSlug ??= slug;
      const join = await prisma.join.create({
        data: {
          sportId: sport.id,
          venueId: venue.id,
          hostUserId: userId,
          title: `${TAG} ${spec.facility.displayName} #${i + 1}`,
          description: `${TAG} seed joinable`,
          status: JoinStatus.OPEN,
          startAt,
          scheduledEndAt: endAt,
          plannedPlayerCount: 4,
          confirmedPlayerCount: 1,
          rewardPerParticipant: 0,
          coinAssetId: coin.id,
          roomCreationFeeAmount: 0,
          rewardHoldTotalAmount: 0,
          shareSlug: slug,
          participants: {
            create: {
              userId,
              role: ParticipantRole.HOST,
              participationStatus: ParticipationStatus.CONFIRMED,
            },
          },
        },
      });
      createdJoinIds.push(join.id);
      console.log(`${TAG} join ${join.id} @ ${spec.facility.displayName} slug=${slug} start=${startAt.toISOString()}`);
    }
  }

  // Attendance reliability: 3 COMPLETED + 1 NO_SHOW
  for (let i = 0; i < 3; i += 1) {
    const pastStart = new Date(Date.now() - (i + 2) * 86400_000);
    const venue = await ensureVenue(facilities[0]!.id, facilities[0]!.displayName);
    await prisma.join.create({
      data: {
        sportId: sport.id,
        venueId: venue.id,
        hostUserId: userId,
        title: `${TAG} past attended ${i + 1}`,
        status: JoinStatus.COMPLETED,
        startAt: pastStart,
        scheduledEndAt: new Date(pastStart.getTime() + 7200_000),
        plannedPlayerCount: 4,
        confirmedPlayerCount: 2,
        rewardPerParticipant: 0,
        coinAssetId: coin.id,
        roomCreationFeeAmount: 0,
        rewardHoldTotalAmount: 0,
        shareSlug: createJoinShareSlug(randomBytes(10)),
        participants: {
          create: {
            userId,
            role: ParticipantRole.PARTICIPANT,
            participationStatus: ParticipationStatus.COMPLETED,
          },
        },
      },
    });
  }
  {
    const pastStart = new Date(Date.now() - 10 * 86400_000);
    const venue = await ensureVenue(facilities[0]!.id, facilities[0]!.displayName);
    await prisma.join.create({
      data: {
        sportId: sport.id,
        venueId: venue.id,
        hostUserId: userId,
        title: `${TAG} past noshow`,
        status: JoinStatus.COMPLETED,
        startAt: pastStart,
        scheduledEndAt: new Date(pastStart.getTime() + 7200_000),
        plannedPlayerCount: 4,
        confirmedPlayerCount: 2,
        rewardPerParticipant: 0,
        coinAssetId: coin.id,
        roomCreationFeeAmount: 0,
        rewardHoldTotalAmount: 0,
        shareSlug: createJoinShareSlug(randomBytes(10)),
        participants: {
          create: {
            userId,
            role: ParticipantRole.PARTICIPANT,
            participationStatus: ParticipationStatus.NO_SHOW,
          },
        },
      },
    });
  }

  await prisma.joinAlertSubscription.create({
    data: {
      userId,
      label: TAG,
      sido: facilities[0]!.sido,
      sigungu: facilities[0]!.sigungu,
      dateMode: 'TODAY',
      timeBand: 'ANY',
      joinableOnly: true,
      enabled: true,
    },
  });

  for (const f of facilities.slice(0, 2)) {
    await prisma.golfFacilityFollow.upsert({
      where: {
        userId_golfFacilityId: { userId, golfFacilityId: f.id },
      },
      create: { userId, golfFacilityId: f.id },
      update: {},
    });
  }

  if (createdJoinIds[0]) {
    await prisma.joinBookmark.upsert({
      where: { userId_joinId: { userId, joinId: createdJoinIds[0] } },
      create: { userId, joinId: createdJoinIds[0] },
      update: {},
    });
  }

  console.log(
    JSON.stringify(
      {
        tag: TAG,
        userId,
        nickname: profile.nickname,
        sampleShareSlug: sampleSlug,
        facilities: facilities.map((f, i) => ({
          letter: String.fromCharCode(65 + i),
          id: f.id,
          name: f.displayName,
          expectedJoinable: specs[i]!.joinable,
        })),
        joinableJoinIds: createdJoinIds,
      },
      null,
      2,
    ),
  );
  console.log(`${TAG} done`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
