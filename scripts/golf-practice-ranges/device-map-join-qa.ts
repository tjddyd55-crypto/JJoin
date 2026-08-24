/**
 * Coordinate + API QA sampler for GolfFacility map (local, no geocoding).
 *
 *   pnpm exec tsx scripts/golf-practice-ranges/device-map-join-qa.ts
 *
 * Output: data/golf-practice-ranges/qa/device-map-join-qa.json (gitignored)
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { PrismaClient } from '@prisma/client';
import { PrismaService } from '../../apps/api/src/prisma/prisma.service';
import { GolfFacilitiesService } from '../../apps/api/src/modules/golf-facilities/golf-facilities.service';

const OUT_DIR = join(process.cwd(), 'data/golf-practice-ranges/qa');
const OUT_FILE = join(OUT_DIR, 'device-map-join-qa.json');

/** Rough WGS84 bbox per region keyword for automated sanity (not eyeball). */
const REGION_BBOX: Record<string, { minLat: number; maxLat: number; minLng: number; maxLng: number }> = {
  서울: { minLat: 37.41, maxLat: 37.72, minLng: 126.76, maxLng: 127.18 },
  경기: { minLat: 36.9, maxLat: 38.3, minLng: 126.4, maxLng: 127.9 },
  인천: { minLat: 37.25, maxLat: 37.75, minLng: 126.3, maxLng: 126.85 },
  부산: { minLat: 35.0, maxLat: 35.35, minLng: 128.85, maxLng: 129.35 },
  대구: { minLat: 35.7, maxLat: 36.0, minLng: 128.4, maxLng: 128.8 },
  광주: { minLat: 35.05, maxLat: 35.25, minLng: 126.7, maxLng: 127.0 },
  대전: { minLat: 36.2, maxLat: 36.5, minLng: 127.2, maxLng: 127.55 },
  울산: { minLat: 35.4, maxLat: 35.65, minLng: 129.2, maxLng: 129.5 },
  강원: { minLat: 37.0, maxLat: 38.6, minLng: 127.5, maxLng: 129.4 },
  충북: { minLat: 36.2, maxLat: 37.2, minLng: 127.3, maxLng: 128.3 },
  충남: { minLat: 36.0, maxLat: 37.0, minLng: 126.0, maxLng: 127.5 },
  전북: { minLat: 35.2, maxLat: 36.2, minLng: 126.4, maxLng: 127.8 },
  전남: { minLat: 34.2, maxLat: 35.5, minLng: 126.0, maxLng: 127.9 },
  경북: { minLat: 35.5, maxLat: 37.5, minLng: 128.0, maxLng: 129.8 },
  경남: { minLat: 34.7, maxLat: 35.9, minLng: 127.6, maxLng: 129.3 },
  제주: { minLat: 33.1, maxLat: 33.6, minLng: 126.1, maxLng: 126.95 },
};

type SampleSpec = {
  region: string;
  sidoPrefix: string;
  brand?: string;
  facilityType?: string;
};

const SAMPLE_SPECS: SampleSpec[] = [
  { region: '서울', sidoPrefix: '서울', brand: 'GOLFZON' },
  { region: '서울', sidoPrefix: '서울', brand: 'SG_GOLF' },
  { region: '서울', sidoPrefix: '서울', facilityType: 'MIXED_GOLF_FACILITY' },
  { region: '경기', sidoPrefix: '경기', brand: 'GOLFZON' },
  { region: '경기', sidoPrefix: '경기', brand: 'FRIENDS_SCREEN' },
  { region: '경기', sidoPrefix: '경기', facilityType: 'SCREEN_GOLF' },
  { region: '인천', sidoPrefix: '인천', brand: 'GOLFZON' },
  { region: '인천', sidoPrefix: '인천', brand: 'OTHER' },
  { region: '부산', sidoPrefix: '부산', brand: 'GOLFZON' },
  { region: '부산', sidoPrefix: '부산', brand: 'SG_GOLF' },
  { region: '대구', sidoPrefix: '대구', brand: 'GOLFZON' },
  { region: '광주', sidoPrefix: '광주', brand: 'GOLFZON' },
  { region: '대전', sidoPrefix: '대전', brand: 'SG_GOLF' },
  { region: '울산', sidoPrefix: '울산', brand: 'GOLFZON' },
  { region: '강원', sidoPrefix: '강원', brand: 'GOLFZON' },
  { region: '충북', sidoPrefix: '충북', brand: 'SG_GOLF' },
  { region: '충남', sidoPrefix: '충남', brand: 'GOLFZON' },
  { region: '전북', sidoPrefix: '전북', brand: 'GOLFZON' },
  { region: '전남', sidoPrefix: '전남', brand: 'FRIENDS_SCREEN' },
  { region: '경북', sidoPrefix: '경북', brand: 'GOLFZON' },
  { region: '경남', sidoPrefix: '경남', brand: 'GOLFZON' },
  { region: '경남', sidoPrefix: '경남', facilityType: 'MIXED_GOLF_FACILITY' },
  { region: '제주', sidoPrefix: '제주', brand: 'GOLFZON' },
  { region: '제주', sidoPrefix: '제주', brand: 'OTHER' },
  { region: '서울', sidoPrefix: '서울', brand: 'OTHER' },
];

type AutoResult = 'PASS' | 'APPROXIMATE' | 'FAIL' | 'SKIP';

function autoJudge(
  lat: number,
  lng: number,
  sido: string | null,
  region: string,
): { result: AutoResult; reason: string } {
  if (lat < 33.0 || lat > 38.7 || lng < 124.5 || lng > 132.1) {
    return { result: 'FAIL', reason: 'outside_korea_bbox' };
  }
  const box = REGION_BBOX[region];
  if (!box) return { result: 'SKIP', reason: 'no_region_bbox' };
  const inBox =
    lat >= box.minLat &&
    lat <= box.maxLat &&
    lng >= box.minLng &&
    lng <= box.maxLng;
  if (!inBox) {
    const sidoOk = sido?.startsWith(region) ?? false;
    if (!sidoOk) return { result: 'FAIL', reason: 'coords_outside_region_and_sido_mismatch' };
    return { result: 'APPROXIMATE', reason: 'coords_outside_region_bbox_but_sido_ok' };
  }
  if (sido && !sido.startsWith(region) && region !== '경기') {
    return { result: 'APPROXIMATE', reason: 'in_bbox_sido_differs' };
  }
  return { result: 'PASS', reason: 'in_region_bbox' };
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const prisma = new PrismaService();
  const raw = new PrismaClient();
  const svc = new GolfFacilitiesService(prisma as PrismaService);

  const venueBefore = await raw.venue.count();

  // Side-effect browse simulation
  for (let i = 0; i < 20; i++) {
    await svc.listInBounds({
      north: 37.6 + i * 0.001,
      south: 37.5,
      east: 127.05,
      west: 126.9,
      limit: 400,
    });
  }
  for (const q of ['골프존', '스크린', '일산', '강남', '부산', '프렌즈', 'SG']) {
    await svc.search({ q });
  }
  const venueAfterBrowse = await raw.venue.count();
  const browseSideEffectOk = venueAfterBrowse === venueBefore;

  const samples: Array<Record<string, unknown>> = [];
  let pass = 0;
  let approx = 0;
  let fail = 0;

  for (const spec of SAMPLE_SPECS) {
    const row = await raw.golfFacility.findFirst({
      where: {
        isActive: true,
        isScreenJoinEligible: true,
        coordinateStatus: 'VALID',
        sido: { startsWith: spec.sidoPrefix },
        ...(spec.brand ? { primaryBrand: spec.brand as never } : {}),
        ...(spec.facilityType ? { facilityType: spec.facilityType as never } : {}),
      },
      orderBy: { displayName: 'asc' },
    });
    if (!row || row.latitude == null || row.longitude == null) {
      samples.push({
        region: spec.region,
        spec,
        result: 'SKIP',
        reason: 'no_matching_row',
      });
      continue;
    }
    const lat = Number(row.latitude);
    const lng = Number(row.longitude);
    const judge = autoJudge(lat, lng, row.sido, spec.region);
    if (judge.result === 'PASS') pass++;
    else if (judge.result === 'APPROXIMATE') approx++;
    else if (judge.result === 'FAIL') fail++;

    samples.push({
      region: spec.region,
      name: row.displayName,
      address: row.roadAddress ?? row.lotAddress,
      facilityType: row.facilityType,
      primaryBrand: row.primaryBrand,
      latitude: lat,
      longitude: lng,
      sourceTmX: row.sourceTmX == null ? null : Number(row.sourceTmX),
      sourceTmY: row.sourceTmY == null ? null : Number(row.sourceTmY),
      sido: row.sido,
      sigungu: row.sigungu,
      autoResult: judge.result,
      autoReason: judge.reason,
      deviceResult: null,
      deviceNotes: 'Requires physical device eyeball — not run in cloud VM',
    });
  }

  // Debounce burst simulation (requestSeq logic is client-side; server stability)
  const burstStart = Date.now();
  const burst = await Promise.all(
    Array.from({ length: 15 }, (_, i) =>
      svc.listInBounds({
        north: 37.55 + i * 0.002,
        south: 37.52,
        east: 127.02,
        west: 126.98,
        limit: 400,
      }),
    ),
  );
  const burstMs = Date.now() - burstStart;

  // Seoul high-density limit check
  const seoulDense = await svc.listInBounds({
    north: 37.58,
    south: 37.48,
    east: 127.05,
    west: 126.95,
    limit: 500,
  });

  const missingSearch = await svc.search({ q: '골프존', limit: 50 });
  const missingInSearch = missingSearch.items.filter(
    (i) => i.coordinateStatus === 'MISSING' || i.selectable === false,
  );

  const noPhone = await raw.golfFacility.findFirst({
    where: {
      isScreenJoinEligible: true,
      coordinateStatus: 'VALID',
      OR: [{ phone: null }, { phone: '' }],
    },
    select: { id: true, displayName: true, phone: true, phoneStatus: true },
  });

  const longName = await raw.golfFacility.findFirst({
    where: {
      isScreenJoinEligible: true,
      coordinateStatus: 'VALID',
    },
    orderBy: { displayName: 'desc' },
    select: { displayName: true, roadAddress: true },
  });

  const report = {
    testedAt: new Date().toISOString(),
    device: 'cloud-vm (no Android device connected)',
    os: 'linux (Cursor Cloud Agent)',
    expoDevClient: 'not run — adb/emulator unavailable',
    apiEnvironment: 'local Postgres + GolfFacilitiesService direct',
    mapSdk: 'Kakao native (not exercised on device)',
    coordinateSamples: {
      total: samples.length,
      pass,
      approximate: approx,
      fail,
      skip: samples.length - pass - approx - fail,
      note: 'autoResult uses region bbox sanity only; deviceResult requires eyeball on Kakao map',
      samples,
    },
    sideEffect: {
      venueCountBefore: venueBefore,
      venueCountAfterBrowse: venueAfterBrowse,
      delta: venueAfterBrowse - venueBefore,
      browseSideEffectOk,
    },
    apiBurst: {
      parallelRequests: 15,
      durationMs: burstMs,
      lastCount: burst[burst.length - 1]?.items.length ?? 0,
    },
    seoulDense: {
      count: seoulDense.items.length,
      truncated: seoulDense.truncated,
      limit: seoulDense.limit,
    },
    searchMissingPolicy: {
      missingSelectableFalseInSearch: missingInSearch.length,
      sample: missingInSearch.slice(0, 3).map((i) => ({
        id: i.id,
        displayName: i.displayName,
        coordinateStatus: i.coordinateStatus,
        selectable: i.selectable,
      })),
    },
    edgeCases: {
      noPhoneSample: noPhone,
      longNameSample: longName,
    },
  };

  writeFileSync(OUT_FILE, JSON.stringify(report, null, 2));
  console.log(`Wrote ${OUT_FILE}`);
  console.log(`COORD pass=${pass} approx=${approx} fail=${fail}`);
  console.log(`SIDE_EFFECT browse delta=${report.sideEffect.delta} ok=${browseSideEffectOk}`);
  console.log(`SEOUL dense markers=${seoulDense.items.length} truncated=${seoulDense.truncated}`);

  await raw.$disconnect();
  await prisma.$disconnect();

  if (fail > 0) process.exit(2);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
