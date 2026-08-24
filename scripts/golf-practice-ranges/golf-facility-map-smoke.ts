/**
 * Local smoke: GolfFacility bounds/search (no Venue side effects) + activate reuse.
 *
 *   pnpm exec tsx scripts/golf-practice-ranges/golf-facility-map-smoke.ts
 */
import { PrismaClient } from '@prisma/client';
import { PrismaService } from '../../apps/api/src/prisma/prisma.service';
import { GolfFacilitiesService } from '../../apps/api/src/modules/golf-facilities/golf-facilities.service';
import { ensureFoundation } from '../../apps/api/src/foundation/ensure-foundation';

/** Keep in sync with @jjoin/types LOCALDATA_GOLF_VENUE_PROVIDER */
const LOCALDATA_GOLF_VENUE_PROVIDER = 'LOCALDATA_GOLF_PRACTICE_RANGE';

const USER = '00000000-0000-4000-8000-000000000001';

async function main() {
  const prisma = new PrismaService();
  const svc = new GolfFacilitiesService(prisma as PrismaService);
  const raw = new PrismaClient();

  const eligible = await raw.golfFacility.count({
    where: { isActive: true, isScreenJoinEligible: true },
  });
  const valid = await raw.golfFacility.count({
    where: {
      isActive: true,
      isScreenJoinEligible: true,
      coordinateStatus: 'VALID',
    },
  });
  const missing = await raw.golfFacility.count({
    where: {
      isActive: true,
      isScreenJoinEligible: true,
      coordinateStatus: 'MISSING',
    },
  });
  console.log(`COUNTS eligible=${eligible} VALID=${valid} MISSING=${missing}`);
  if (eligible !== 2848 || valid !== 2759 || missing !== 89) {
    throw new Error(`unexpected counts: ${eligible}/${valid}/${missing}`);
  }

  const venueBefore = await raw.venue.count();

  const seoul = await svc.listInBounds({
    north: 37.6,
    south: 37.5,
    east: 127.05,
    west: 126.9,
    limit: 400,
  });
  console.log(`PASS seoul bounds count=${seoul.items.length} truncated=${seoul.truncated}`);
  for (const item of seoul.items) {
    if (item.coordinateStatus !== 'VALID') throw new Error('bounds returned non-VALID');
    if (!item.selectable) throw new Error('bounds returned non-selectable');
    if (item.latitude == null || item.longitude == null) throw new Error('null coords');
    if (item.latitude < 37.5 || item.latitude > 37.6) throw new Error('lat OOB');
    if (item.longitude < 126.9 || item.longitude > 127.05) throw new Error('lng OOB');
    if (!item.isScreenJoinEligible) throw new Error('not eligible');
    // Map DTO must not leak internal source fields
    if ('governmentSourceKey' in item || 'screenEvidence' in item) {
      throw new Error('internal field leaked');
    }
  }

  const ocean = await svc.listInBounds({
    north: 33.2,
    south: 33.0,
    east: 126.2,
    west: 126.0,
    limit: 50,
  });
  if (ocean.items.length !== 0) {
    throw new Error(`ocean expected [], got ${ocean.items.length}`);
  }
  console.log('PASS empty ocean bounds → []');

  const golfzon = await svc.search({ q: '골프존', limit: 30 });
  console.log(`PASS search 골프존 count=${golfzon.items.length}`);
  if (golfzon.items.length === 0) throw new Error('골프존 search empty');
  for (const item of golfzon.items) {
    if (!item.isScreenJoinEligible) throw new Error('search not eligible');
    if (item.screenStatus !== 'CONFIRMED') throw new Error('search not CONFIRMED');
  }

  const ilsan = await svc.search({ q: '일산', limit: 30 });
  console.log(`PASS search 일산 count=${ilsan.items.length}`);
  if (ilsan.items.length === 0) throw new Error('일산 search empty');

  const screen = await svc.search({ q: '스크린', limit: 30 });
  console.log(`PASS search 스크린 count=${screen.items.length}`);

  await svc.listInBounds({
    north: 37.6,
    south: 37.5,
    east: 127.05,
    west: 126.9,
  });
  await svc.search({ q: '골프존' });
  if (golfzon.items[0]) await svc.getById(golfzon.items[0].id);
  const venueAfterGets = await raw.venue.count();
  if (venueAfterGets !== venueBefore) {
    throw new Error(`GET side effect: venue ${venueBefore} → ${venueAfterGets}`);
  }
  console.log('PASS GET bounds/search/detail → Venue count unchanged');

  const nationwide = await svc.listInBounds({
    north: 39,
    south: 33,
    east: 132,
    west: 124,
    limit: 500,
  });
  if (nationwide.items.length > 500) throw new Error('limit breached');
  if (nationwide.items.length > valid) {
    throw new Error(`more markers than VALID eligible: ${nationwide.items.length}`);
  }
  console.log(
    `PASS nationwide sample markers=${nationwide.items.length} <= VALID=${valid} truncated=${nationwide.truncated}`,
  );

  await ensureFoundation(prisma as PrismaService);
  const pick = await raw.golfFacility.findFirst({
    where: {
      isScreenJoinEligible: true,
      coordinateStatus: 'VALID',
      displayName: { contains: '골프존' },
    },
    orderBy: { governmentSourceKey: 'asc' },
  });
  if (!pick) throw new Error('no golfzon facility for activate');

  const a1 = await svc.activateVenue(USER, pick.id);
  const a2 = await svc.activateVenue(USER, pick.id);
  if (a1.venueId !== a2.venueId) throw new Error('Venue not reused');
  if (!a2.reused) throw new Error('second activate should reuse');
  if (a1.provider !== LOCALDATA_GOLF_VENUE_PROVIDER) {
    throw new Error(`provider ${a1.provider}`);
  }
  console.log(`PASS activate reuse venueId=${a1.venueId}`);

  // Simulate Join.create payload path: resolve venue by id (same as JoinsService venueId branch)
  const venue = await raw.venue.findUnique({ where: { id: a1.venueId } });
  if (!venue) throw new Error('venue missing after activate');
  if (venue.provider !== LOCALDATA_GOLF_VENUE_PROVIDER) {
    throw new Error('venue provider mismatch');
  }
  if (venue.golfFacilityId !== pick.id) throw new Error('golfFacilityId link missing');

  // Two Join rows can share the same Venue
  let host = await raw.user.findUnique({ where: { id: USER } });
  if (!host) {
    host = await raw.user.create({
      data: {
        id: USER,
        status: 'ACTIVE',
        locale: 'ko-KR',
        countryCode: 'KR',
        timezone: 'Asia/Seoul',
      },
    });
  }
  const { sport, coinAsset } = await ensureFoundation(prisma as PrismaService);
  const start1 = new Date(Date.now() + 4 * 60 * 60 * 1000);
  const start2 = new Date(Date.now() + 6 * 60 * 60 * 1000);
  const j1 = await raw.join.create({
    data: {
      sportId: sport.id,
      venueId: venue.id,
      hostUserId: host.id,
      coinAssetId: coinAsset.id,
      status: 'OPEN',
      joinMethod: 'OPEN',
      title: '[local-test] GolfFacility map join',
      startAt: start1,
      scheduledEndAt: new Date(start1.getTime() + 2 * 60 * 60 * 1000),
      plannedPlayerCount: 2,
      confirmedPlayerCount: 1,
      rewardPerParticipant: 0,
      roomCreationFeeAmount: 0,
      rewardHoldTotalAmount: 0,
    },
  });
  const j2 = await raw.join.create({
    data: {
      sportId: sport.id,
      venueId: venue.id,
      hostUserId: host.id,
      coinAssetId: coinAsset.id,
      status: 'OPEN',
      joinMethod: 'OPEN',
      title: '[local-test] GolfFacility map join 2',
      startAt: start2,
      scheduledEndAt: new Date(start2.getTime() + 2 * 60 * 60 * 1000),
      plannedPlayerCount: 2,
      confirmedPlayerCount: 1,
      rewardPerParticipant: 0,
      roomCreationFeeAmount: 0,
      rewardHoldTotalAmount: 0,
    },
  });
  const shared = await raw.join.count({ where: { venueId: venue.id } });
  if (shared < 2) throw new Error('expected >=2 joins on same venue');
  const venueRows = await raw.venue.count({
    where: { golfFacilityId: pick.id },
  });
  if (venueRows !== 1) throw new Error(`Venue rows for facility=${venueRows}`);
  // Join detail shape: provider must not assume KAKAO-only
  const loaded = await raw.join.findUnique({
    where: { id: j1.id },
    include: { venue: true },
  });
  if (!loaded || loaded.venue.provider !== LOCALDATA_GOLF_VENUE_PROVIDER) {
    throw new Error('join detail provider hardcode risk');
  }
  console.log(
    `PASS Join x2 share Venue joinIds=${j1.id.slice(0, 8)}… ${j2.id.slice(0, 8)}… venueRows=1 provider=${loaded.venue.provider}`,
  );

  const venueFinal = await raw.venue.count();
  console.log(`INFO venue count before=${venueBefore} after=${venueFinal}`);

  await raw.$disconnect();
  await prisma.$disconnect();
  console.log('ALL MAP SMOKE PASS');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
