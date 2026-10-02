/**
 * Development-only: completed FIELD + SCREEN joins for DEV_A session review QA.
 * Tag: [QA-JOIN-SESSION-REVIEW]
 *
 *   pnpm exec tsx scripts/seed-dev-join-session-review-qa.ts
 */
import { randomBytes } from 'node:crypto';
import {
  JoinStatus,
  ParticipationStatus,
  ParticipantRole,
  PrismaClient,
} from '@prisma/client';
import { createJoinShareSlug } from '../packages/domain/src/index.ts';

const TAG = '[QA-JOIN-SESSION-REVIEW]';
const prisma = new PrismaClient();

async function resolvePersonaUserId(subject: string, nicknames: string[]): Promise<string> {
  const social = await prisma.socialAccount.findFirst({
    where: { provider: 'KAKAO', providerSubject: subject },
    select: { userId: true },
  });
  if (social?.userId) return social.userId;
  const profile = await prisma.userProfile.findFirst({
    where: { nickname: { in: nicknames } },
  });
  if (!profile) throw new Error(`${TAG} user ${subject} not found — mock sign-in once`);
  return profile.userId;
}

async function ensureVenue(params: {
  name: string;
  venueType: 'FIELD' | 'SCREEN';
  facilityKey: string;
}) {
  let facility = await prisma.golfFacility.findFirst({
    where: { governmentSourceKey: `${TAG}-${params.facilityKey}` },
  });
  if (!facility) {
    facility = await prisma.golfFacility.create({
      data: {
        displayName: params.name,
        governmentSourceKey: `${TAG}-${params.facilityKey}`,
        sido: '경기',
        sigungu: '성남',
        isActive: true,
        latitude: 37.4,
        longitude: 127.1,
      },
    });
  }
  let venue = await prisma.venue.findFirst({
    where: { golfFacilityId: facility.id, venueType: params.venueType },
  });
  if (!venue) {
    venue = await prisma.venue.create({
      data: {
        name: params.name,
        venueType: params.venueType,
        golfFacilityId: facility.id,
        provider: 'MOCK',
        providerPlaceId: `${TAG}-venue-${params.facilityKey}`,
        address: 'QA 주소',
        latitude: 37.4,
        longitude: 127.1,
      },
    });
  }
  return venue;
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL required');
  const userId = await resolvePersonaUserId('dev-persona-a', ['김진우', '김진우_DEV_A']);
  const hostUserId = await resolvePersonaUserId('dev-persona-b', ['박민수', '박민수_DEV_B']);
  const sport = await prisma.sport.findFirst();
  const coin = await prisma.coinAsset.findFirst();
  if (!sport || !coin) throw new Error('sport/coin missing');

  await prisma.joinSessionReview.deleteMany({
    where: { join: { title: { startsWith: TAG } } },
  });
  const old = await prisma.join.findMany({
    where: { title: { startsWith: TAG } },
    select: { id: true },
  });
  if (old.length) {
    await prisma.join.deleteMany({ where: { id: { in: old.map((j) => j.id) } } });
  }

  const pastStart = new Date(Date.now() - 3 * 86400_000);
  const endAt = new Date(pastStart.getTime() + 2 * 3600_000);

  for (const spec of [
    { kind: 'FIELD' as const, title: `${TAG} 완료 FIELD 쪼인` },
    { kind: 'SCREEN' as const, title: `${TAG} 완료 SCREEN 쪼인` },
  ]) {
    const venue = await ensureVenue({
      name: `${TAG} ${spec.kind} venue`,
      venueType: spec.kind,
      facilityKey: spec.kind.toLowerCase(),
    });
    const join = await prisma.join.create({
      data: {
        sportId: sport.id,
        venueId: venue.id,
        hostUserId,
        title: spec.title,
        status: JoinStatus.COMPLETED,
        startAt: pastStart,
        scheduledEndAt: endAt,
        plannedPlayerCount: 4,
        confirmedPlayerCount: 2,
        rewardPerParticipant: 0,
        coinAssetId: coin.id,
        roomCreationFeeAmount: 0,
        rewardHoldTotalAmount: 0,
        shareSlug: createJoinShareSlug(randomBytes(10)),
        participants: {
          create: [
            {
              userId: hostUserId,
              role: ParticipantRole.HOST,
              participationStatus: ParticipationStatus.COMPLETED,
            },
            {
              userId,
              role: ParticipantRole.PARTICIPANT,
              participationStatus: ParticipationStatus.COMPLETED,
            },
          ],
        },
      },
    });
    console.log(`${TAG} created ${spec.kind} join ${join.id}`);
  }

  console.log(`${TAG} done for user ${userId}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
