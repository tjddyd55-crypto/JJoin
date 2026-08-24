/**
 * Local smoke: GolfFacility → Venue lazy activation (no HTTP server).
 *
 *   pnpm exec tsx scripts/golf-practice-ranges/golf-facility-activate-smoke.ts
 */
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaService } from '../../apps/api/src/prisma/prisma.service';
import { GolfFacilitiesService } from '../../apps/api/src/modules/golf-facilities/golf-facilities.service';

/** Keep in sync with @jjoin/types LOCALDATA_GOLF_VENUE_PROVIDER */
const LOCALDATA_GOLF_VENUE_PROVIDER = 'LOCALDATA_GOLF_PRACTICE_RANGE';

const USER = '00000000-0000-4000-8000-000000000001';

function errCode(e: unknown): string {
  if (e instanceof BadRequestException || e instanceof NotFoundException) {
    const res = e.getResponse();
    if (typeof res === 'object' && res && 'code' in res) {
      return String((res as { code: string }).code);
    }
  }
  return e instanceof Error ? e.message : String(e);
}

async function expectReject(label: string, fn: () => Promise<unknown>, code: string) {
  try {
    await fn();
    throw new Error(`${label}: expected reject ${code}`);
  } catch (e) {
    const got = errCode(e);
    if (got !== code) throw new Error(`${label}: expected ${code}, got ${got}`);
    console.log(`PASS ${label} → ${code}`);
  }
}

async function main() {
  const prisma = new PrismaService();
  const svc = new GolfFacilitiesService(prisma as PrismaService);
  const raw = new PrismaClient();

  const venueBefore = await raw.venue.count();
  const joinBefore = await raw.join.count();

  const eligibleValid = await raw.golfFacility.findFirst({
    where: { isScreenJoinEligible: true, coordinateStatus: 'VALID', sportType: 'GOLF' },
    orderBy: { governmentSourceKey: 'asc' },
  });
  const notEligible = await raw.golfFacility.findFirst({
    where: { isScreenJoinEligible: false, sportType: 'GOLF' },
    orderBy: { governmentSourceKey: 'asc' },
  });
  const missingCoord = await raw.golfFacility.findFirst({
    where: { isScreenJoinEligible: true, coordinateStatus: 'MISSING' },
    orderBy: { governmentSourceKey: 'asc' },
  });
  const park = await raw.golfFacility.findFirst({ where: { sportType: 'PARK_GOLF' } });

  if (!eligibleValid || !notEligible || !missingCoord || !park) {
    throw new Error('Missing fixture facilities in local DB');
  }

  const ready = {
    eligible: await raw.golfFacility.count({ where: { isScreenJoinEligible: true } }),
    eligibleValid: await raw.golfFacility.count({
      where: { isScreenJoinEligible: true, coordinateStatus: 'VALID' },
    }),
    eligibleMissing: await raw.golfFacility.count({
      where: { isScreenJoinEligible: true, coordinateStatus: 'MISSING' },
    }),
  };
  console.log('activation_ready', ready);

  await raw.venue.deleteMany({
    where: {
      OR: [
        {
          golfFacilityId: {
            in: [eligibleValid.id, notEligible.id, missingCoord.id, park.id],
          },
        },
        {
          provider: LOCALDATA_GOLF_VENUE_PROVIDER,
          providerPlaceId: {
            in: [
              eligibleValid.governmentSourceKey,
              notEligible.governmentSourceKey,
              missingCoord.governmentSourceKey,
              park.governmentSourceKey,
            ],
          },
        },
      ],
    },
  });

  const a1 = await svc.activateVenue(USER, eligibleValid.id);
  if (!a1.created || a1.reused) throw new Error('Case1 expected created');
  if (a1.provider !== LOCALDATA_GOLF_VENUE_PROVIDER) throw new Error('Case1 provider');
  if (a1.providerPlaceId !== eligibleValid.governmentSourceKey) throw new Error('Case1 placeId');
  console.log('PASS Case1 eligible+VALID create', a1.venueId);

  const a2 = await svc.activateVenue(USER, eligibleValid.id);
  if (a2.created || !a2.reused || a2.venueId !== a1.venueId) throw new Error('Case2 reuse failed');
  console.log('PASS Case2 reuse', a2.venueId);

  const ids = new Set<string>();
  for (let i = 0; i < 10; i += 1) {
    ids.add((await svc.activateVenue(USER, eligibleValid.id)).venueId);
  }
  if (ids.size !== 1) throw new Error(`idempotency expected 1 venue, got ${ids.size}`);
  console.log('PASS Case2b 10x activation → 1 venue');

  const concurrent = await Promise.all(
    Array.from({ length: 8 }, () => svc.activateVenue(USER, eligibleValid.id)),
  );
  if (new Set(concurrent.map((r) => r.venueId)).size !== 1) {
    throw new Error('concurrent expected 1 venue');
  }
  console.log('PASS concurrent 8x → 1 venue');

  await expectReject(
    'Case3 not eligible',
    () => svc.activateVenue(USER, notEligible.id),
    'FACILITY_NOT_JOIN_ELIGIBLE',
  );
  await expectReject(
    'Case4 missing coordinate',
    () => svc.activateVenue(USER, missingCoord.id),
    'FACILITY_COORDINATE_REQUIRED',
  );
  await expectReject('Case5 park golf', () => svc.activateVenue(USER, park.id), 'FACILITY_NOT_JOIN_ELIGIBLE');
  await expectReject(
    'Case6 not found',
    () => svc.activateVenue(USER, '00000000-0000-4000-8000-000000000099'),
    'FACILITY_NOT_FOUND',
  );

  const originalDisplay = eligibleValid.displayName;
  await raw.golfFacility.update({
    where: { id: eligibleValid.id },
    data: { displayName: `${originalDisplay}__OVERRIDE_TEST`, displayNameOverridden: true },
  });
  const venueStale = await raw.venue.findUniqueOrThrow({ where: { id: a1.venueId } });
  if (venueStale.name.includes('__OVERRIDE_TEST')) {
    throw new Error('Unexpected auto-sync of existing Venue.name');
  }
  console.log('PASS existing Venue not auto-synced after displayName override');

  const second = await raw.golfFacility.findFirst({
    where: {
      isScreenJoinEligible: true,
      coordinateStatus: 'VALID',
      sportType: 'GOLF',
      id: { not: eligibleValid.id },
      venue: null,
    },
    orderBy: { governmentSourceKey: 'asc' },
  });
  if (!second) throw new Error('No second eligible facility');
  const secondOverride = `${second.sourceName}__OVERRIDE_TEST`;
  await raw.golfFacility.update({
    where: { id: second.id },
    data: { displayName: secondOverride, displayNameOverridden: true },
  });
  const aNew = await svc.activateVenue(USER, second.id);
  if (aNew.name !== secondOverride) {
    throw new Error(`Override not applied to new Venue.name: got ${aNew.name}`);
  }
  console.log('PASS new Venue.name uses displayName override');

  await raw.golfFacility.update({
    where: { id: eligibleValid.id },
    data: { displayName: originalDisplay, displayNameOverridden: false },
  });
  await raw.golfFacility.update({
    where: { id: second.id },
    data: { displayName: second.sourceName, displayNameOverridden: false },
  });

  await raw.venue.deleteMany({
    where: {
      provider: LOCALDATA_GOLF_VENUE_PROVIDER,
      golfFacilityId: { in: [eligibleValid.id, second.id] },
    },
  });

  const venueAfter = await raw.venue.count();
  const joinAfter = await raw.join.count();
  if (joinAfter !== joinBefore) throw new Error('Join count changed');
  if (venueAfter !== venueBefore) {
    throw new Error(`Venue count drift after cleanup: ${venueBefore} → ${venueAfter}`);
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        activationReady: ready,
        venueBefore,
        venueAfter,
        joinBefore,
        joinAfter,
        provider: LOCALDATA_GOLF_VENUE_PROVIDER,
      },
      null,
      2,
    ),
  );

  await raw.$disconnect();
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
