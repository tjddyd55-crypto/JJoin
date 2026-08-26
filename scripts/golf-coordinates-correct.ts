/**
 * Dry-run / apply: recompute active GolfFacility canonical coords from source TM
 * using EPSG:2097 (fixes legacy EPSG:5174 lon_0=127 offset ~250m).
 *
 * Usage:
 *   pnpm golf:coordinates:audit
 *   pnpm golf:coordinates:correct -- --apply
 */
import { PrismaClient, Prisma } from '@prisma/client';
import fs from 'node:fs';
import path from 'node:path';
import {
  convertGolfTmToWgs84,
  haversineMeters,
} from '../apps/api/src/modules/golf-facilities/sync/golf-tm-crs';

type BucketKey =
  | '0-25m'
  | '25-50m'
  | '50-100m'
  | '100-250m'
  | '250-500m'
  | '500m-1km'
  | '>1km';

function bucket(m: number): BucketKey {
  if (m <= 25) return '0-25m';
  if (m <= 50) return '25-50m';
  if (m <= 100) return '50-100m';
  if (m <= 250) return '100-250m';
  if (m <= 500) return '250-500m';
  if (m <= 1000) return '500m-1km';
  return '>1km';
}

function parseArgs(argv: string[]) {
  const apply = argv.includes('--apply');
  const limitArg = argv.find((a) => a.startsWith('--limit='));
  const limit = limitArg ? Number(limitArg.split('=')[1]) : undefined;
  return { apply, limit: Number.isFinite(limit) ? limit : undefined };
}

async function main() {
  const { apply, limit } = parseArgs(process.argv.slice(2));
  const prisma = new PrismaClient();

  const rows = await prisma.golfFacility.findMany({
    where: {
      isActive: true,
      sourceTmX: { not: null },
      sourceTmY: { not: null },
    },
    select: {
      id: true,
      displayName: true,
      roadAddress: true,
      sourceTmX: true,
      sourceTmY: true,
      latitude: true,
      longitude: true,
      sourceWgsLatitude: true,
      coordinateSource: true,
      coordinateStatus: true,
      venue: { select: { id: true, golfFacilityId: true } },
    },
    take: limit,
    orderBy: { id: 'asc' },
  });

  const buckets: Record<BucketKey, number> = {
    '0-25m': 0,
    '25-50m': 0,
    '50-100m': 0,
    '100-250m': 0,
    '250-500m': 0,
    '500m-1km': 0,
    '>1km': 0,
  };

  const candidates: Array<{
    facilityId: string;
    name: string;
    roadAddress: string | null;
    oldLat: number | null;
    oldLng: number | null;
    newLat: number;
    newLng: number;
    distanceMeters: number | null;
    currentSource: string;
    proposedSource: string;
    reason: string;
    focus: boolean;
    linkedVenueId: string | null;
  }> = [];

  let transformOk = 0;
  let transformFail = 0;
  let unchanged = 0;
  let autoCorrect = 0;
  let skippedAddressGeocoded = 0;
  let alreadyApplied = 0;

  const SAMPLE_FOCUS = new Set([
    'c0cd8ccd-b23f-4c7d-b52e-fd200a65420f',
    '1b76b1e4-d698-4a04-bc71-c198e30bc2b6',
  ]);

  type Pending = {
    id: string;
    lat: number;
    lng: number;
    venueId: string | null;
  };
  const pending: Pending[] = [];

  for (const row of rows) {
    if (row.coordinateSource === 'ADDRESS_GEOCODED') {
      skippedAddressGeocoded += 1;
      continue;
    }

    const tmX = Number(row.sourceTmX);
    const tmY = Number(row.sourceTmY);
    const conv = convertGolfTmToWgs84(tmX, tmY);
    if (!conv.ok) {
      transformFail += 1;
      continue;
    }
    transformOk += 1;

    const oldLat = row.latitude == null ? null : Number(row.latitude);
    const oldLng = row.longitude == null ? null : Number(row.longitude);
    const dist =
      oldLat != null && oldLng != null
        ? haversineMeters(oldLat, oldLng, conv.lat, conv.lng)
        : null;

    if (dist != null) buckets[bucket(dist)] += 1;

    // Idempotent: already on 2097 WGS (sourceWgs set + within 1m)
    if (
      row.sourceWgsLatitude != null &&
      dist != null &&
      dist <= 1 &&
      row.coordinateSource === 'GOV_TM_CONVERTED'
    ) {
      alreadyApplied += 1;
      unchanged += 1;
      continue;
    }

    const needsUpdate =
      oldLat == null ||
      oldLng == null ||
      dist == null ||
      dist > 1 ||
      row.coordinateSource !== 'GOV_TM_CONVERTED' ||
      row.sourceWgsLatitude == null;

    if (!needsUpdate) {
      unchanged += 1;
      continue;
    }

    autoCorrect += 1;
    candidates.push({
      facilityId: row.id,
      name: row.displayName,
      roadAddress: row.roadAddress,
      oldLat,
      oldLng,
      newLat: conv.lat,
      newLng: conv.lng,
      distanceMeters: dist == null ? null : Math.round(dist * 10) / 10,
      currentSource: row.coordinateSource,
      proposedSource: 'GOV_TM_CONVERTED',
      reason: 'crs_epsg_2097_retransform',
      focus: SAMPLE_FOCUS.has(row.id),
      linkedVenueId: row.venue?.id ?? null,
    });

    pending.push({
      id: row.id,
      lat: conv.lat,
      lng: conv.lng,
      venueId: row.venue?.golfFacilityId === row.id ? row.venue.id : null,
    });
  }

  let appliedFacilities = 0;
  let appliedVenues = 0;

  if (apply && pending.length) {
    const BATCH = 200;
    for (let i = 0; i < pending.length; i += BATCH) {
      const chunk = pending.slice(i, i + BATCH);
      const ids = chunk.map((c) => c.id);
      const lats = chunk.map((c) => c.lat);
      const lngs = chunk.map((c) => c.lng);

      await prisma.$executeRaw`
        UPDATE golf_facilities AS g
        SET
          source_wgs_latitude = v.lat,
          source_wgs_longitude = v.lng,
          latitude = v.lat,
          longitude = v.lng,
          coordinate_source = 'GOV_TM_CONVERTED'::"CoordinateSource",
          coordinate_status = 'VALID'::"CoordinateStatus",
          coordinate_verified_at = NOW(),
          updated_at = NOW()
        FROM (
          SELECT
            UNNEST(${ids}::uuid[]) AS id,
            UNNEST(${lats}::float8[]) AS lat,
            UNNEST(${lngs}::float8[]) AS lng
        ) AS v
        WHERE g.id = v.id
      `;
      appliedFacilities += chunk.length;

      const venueUpdates = chunk.filter((c) => c.venueId);
      if (venueUpdates.length) {
        const vIds = venueUpdates.map((c) => c.venueId!);
        const vLats = venueUpdates.map((c) => c.lat);
        const vLngs = venueUpdates.map((c) => c.lng);
        await prisma.$executeRaw`
          UPDATE venues AS ve
          SET
            latitude = v.lat,
            longitude = v.lng,
            updated_at = NOW()
          FROM (
            SELECT
              UNNEST(${vIds}::uuid[]) AS id,
              UNNEST(${vLats}::float8[]) AS lat,
              UNNEST(${vLngs}::float8[]) AS lng
          ) AS v
          WHERE ve.id = v.id
        `;
        appliedVenues += venueUpdates.length;
      }

      if ((i / BATCH) % 5 === 0) {
        console.error(`apply progress ${Math.min(i + BATCH, pending.length)}/${pending.length}`);
      }
    }
  }

  const summary = {
    mode: apply ? 'APPLY' : 'DRY_RUN',
    totalChecked: rows.length,
    transformOk,
    transformFail,
    unchanged,
    alreadyApplied,
    autoCorrectCandidates: autoCorrect,
    skippedAddressGeocoded,
    appliedFacilities,
    appliedVenues,
    discrepancyBuckets: buckets,
    focusSamples: candidates.filter((c) => c.focus),
  };

  const outDir = path.resolve('artifacts/golf-coord');
  fs.mkdirSync(outDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  fs.writeFileSync(
    path.join(outDir, `crs-retransform-${apply ? 'apply' : 'dryrun'}-${stamp}.json`),
    JSON.stringify({ summary, candidates: candidates.slice(0, 500) }, null, 2),
    'utf8',
  );

  console.log(JSON.stringify(summary, null, 2));
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
