/**
 * Golf facility coordinate pipeline TRACE (read-only).
 * Usage: DATABASE_URL=... KAKAO_LOCAL_REST_API_KEY=... npx tsx scripts/golf-coordinates-trace.ts
 */
import { PrismaClient } from '@prisma/client';
import proj4 from 'proj4';

proj4.defs(
  'EPSG:5174',
  '+proj=tmerc +lat_0=38 +lon_0=127 +k=1 +x_0=200000 +y_0=500000 +ellps=bessel +units=m +no_defs +towgs84=-115.80,474.99,674.11,1.16,-2.31,-1.63,6.43',
);
// Common alternate Korean CRS assumptions for comparison
proj4.defs(
  'EPSG:5181',
  '+proj=tmerc +lat_0=38 +lon_0=127 +k=1 +x_0=200000 +y_0=500000 +ellps=GRS80 +units=m +no_defs',
);
proj4.defs(
  'EPSG:5186',
  '+proj=tmerc +lat_0=38 +lon_0=127 +k=1 +x_0=200000 +y_0=600000 +ellps=GRS80 +units=m +no_defs',
);
proj4.defs(
  'EPSG:2097',
  '+proj=tmerc +lat_0=38 +lon_0=127 +k=1 +x_0=200000 +y_0=500000 +ellps=bessel +units=m +no_defs +towgs84=-115.80,474.99,674.11,1.16,-2.31,-1.63,6.43',
);

const SAMPLE_IDS = [
  'c0cd8ccd-b23f-4c7d-b52e-fd200a65420f', // 아차산골프연습장
  '1b76b1e4-d698-4a04-bc71-c198e30bc2b6', // NK 골프클럽
  '7037a3f9-55b6-4aca-a45d-16d0419b327b', // 현대골프 (광장동)
  '6b54298b-d697-4dc7-9ea7-3e0d6dee55ea', // 검색에서 같이 나온 광진 시설
  '9d009b08-5c32-4b05-9f27-0ec3a6782a33', // OK스크린골프
];

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function convert(crs: string, x: number, y: number) {
  try {
    const [lng, lat] = proj4(crs, 'EPSG:4326', [x, y]) as [number, number];
    return { lat, lng, ok: Number.isFinite(lat) && Number.isFinite(lng) };
  } catch {
    return { lat: NaN, lng: NaN, ok: false };
  }
}

async function kakaoAddressGeocode(query: string, key: string) {
  const url = new URL('https://dapi.kakao.com/v2/local/search/address.json');
  url.searchParams.set('query', query);
  const res = await fetch(url.toString(), {
    headers: { Authorization: `KakaoAK ${key}` },
  });
  if (!res.ok) {
    return { ok: false as const, status: res.status, documents: [] as unknown[] };
  }
  const json = (await res.json()) as {
    documents?: Array<{
      x: string;
      y: string;
      address_name?: string;
      road_address?: { address_name?: string; region_2depth_name?: string; region_3depth_name?: string };
      address?: { address_name?: string; region_2depth_name?: string };
    }>;
  };
  return { ok: true as const, status: res.status, documents: json.documents ?? [] };
}

function stripAddressNoise(addr: string): string {
  return addr
    .replace(/\([^)]*\)/g, ' ')
    .replace(/지하\s*\d*층?/g, ' ')
    .replace(/지층/g, ' ')
    .replace(/\d+층/g, ' ')
    .replace(/,/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function main() {
  const prisma = new PrismaClient();
  const kakaoKey = process.env.KAKAO_LOCAL_REST_API_KEY?.trim();
  if (!kakaoKey) throw new Error('KAKAO_LOCAL_REST_API_KEY required');

  const rows = await prisma.golfFacility.findMany({
    where: { id: { in: SAMPLE_IDS } },
    select: {
      id: true,
      displayName: true,
      sourceName: true,
      governmentSourceKey: true,
      managementNo: true,
      roadAddress: true,
      lotAddress: true,
      sourceRoadAddress: true,
      sourceLotAddress: true,
      sourceTmX: true,
      sourceTmY: true,
      latitude: true,
      longitude: true,
      coordinateSource: true,
      coordinateStatus: true,
      isActive: true,
      updatedAt: true,
      sourceRawJson: true,
    },
  });

  // Also pull a few "good" candidates near Gwangjin by searching names we expect near correct roads
  const extra = await prisma.golfFacility.findMany({
    where: {
      isActive: true,
      coordinateStatus: 'VALID',
      sigungu: '광진구',
      NOT: { id: { in: SAMPLE_IDS } },
    },
    take: 3,
    orderBy: { displayName: 'asc' },
    select: {
      id: true,
      displayName: true,
      sourceName: true,
      governmentSourceKey: true,
      managementNo: true,
      roadAddress: true,
      lotAddress: true,
      sourceRoadAddress: true,
      sourceLotAddress: true,
      sourceTmX: true,
      sourceTmY: true,
      latitude: true,
      longitude: true,
      coordinateSource: true,
      coordinateStatus: true,
      isActive: true,
      updatedAt: true,
      sourceRawJson: true,
    },
  });

  const all = [...rows, ...extra];
  const report: unknown[] = [];

  for (const row of all) {
    const tmX = row.sourceTmX == null ? null : Number(row.sourceTmX);
    const tmY = row.sourceTmY == null ? null : Number(row.sourceTmY);
    const dbLat = row.latitude == null ? null : Number(row.latitude);
    const dbLng = row.longitude == null ? null : Number(row.longitude);

    const raw = (row.sourceRawJson ?? {}) as Record<string, unknown>;
    const rawX = raw.CRD_INFO_X ?? raw.crdInfoX ?? null;
    const rawY = raw.CRD_INFO_Y ?? raw.crdInfoY ?? null;

    const transforms: Record<string, unknown> = {};
    if (tmX != null && tmY != null) {
      transforms['5174_XY'] = convert('EPSG:5174', tmX, tmY);
      transforms['5174_YX'] = convert('EPSG:5174', tmY, tmX);
      transforms['5181_XY'] = convert('EPSG:5181', tmX, tmY);
      transforms['5186_XY'] = convert('EPSG:5186', tmX, tmY);
    }

    const road = row.roadAddress || row.sourceRoadAddress || '';
    const roadNorm = stripAddressNoise(road);
    const geoRoad = roadNorm
      ? await kakaoAddressGeocode(roadNorm, kakaoKey)
      : { ok: false as const, status: 0, documents: [] };
    const geoLot =
      row.lotAddress || row.sourceLotAddress
        ? await kakaoAddressGeocode(
            stripAddressNoise(String(row.lotAddress || row.sourceLotAddress)),
            kakaoKey,
          )
        : null;

    const bestDoc = geoRoad.ok ? geoRoad.documents[0] : undefined;
    const geoLat = bestDoc ? Number(bestDoc.y) : null;
    const geoLng = bestDoc ? Number(bestDoc.x) : null;

    const distances: Record<string, number | null> = {
      db_vs_geo: dbLat != null && geoLat != null ? haversineMeters(dbLat, dbLng!, geoLat, geoLng!) : null,
    };
    for (const [k, v] of Object.entries(transforms)) {
      const t = v as { lat: number; lng: number; ok: boolean };
      if (t.ok && geoLat != null) {
        distances[`${k}_vs_geo`] = haversineMeters(t.lat, t.lng, geoLat, geoLng!);
      }
      if (t.ok && dbLat != null) {
        distances[`${k}_vs_db`] = haversineMeters(t.lat, t.lng, dbLat, dbLng!);
      }
    }

    report.push({
      id: row.id,
      displayName: row.displayName,
      governmentSourceKey: row.governmentSourceKey,
      managementNo: row.managementNo,
      roadAddress: row.roadAddress,
      lotAddress: row.lotAddress,
      sourceRoadAddress: row.sourceRoadAddress,
      sourceLotAddress: row.sourceLotAddress,
      rawX,
      rawY,
      sourceTmX: tmX,
      sourceTmY: tmY,
      dbLat,
      dbLng,
      coordinateSource: row.coordinateSource,
      coordinateStatus: row.coordinateStatus,
      isActive: row.isActive,
      updatedAt: row.updatedAt,
      transforms,
      geocode: {
        query: roadNorm,
        resultCount: geoRoad.ok ? geoRoad.documents.length : 0,
        geoLat,
        geoLng,
        roadAddressName: bestDoc?.road_address?.address_name ?? bestDoc?.address_name ?? null,
        district: bestDoc?.road_address?.region_2depth_name ?? bestDoc?.address?.region_2depth_name ?? null,
        lotFallbackCount: geoLot && geoLot.ok ? geoLot.documents.length : null,
      },
      distancesMeters: distances,
    });

    // gentle Kakao rate limit
    await new Promise((r) => setTimeout(r, 120));
  }

  // TM range sanity on active Seoul sample
  const tmStats = await prisma.$queryRawUnsafe<
    Array<{ n: string; minx: number; maxx: number; miny: number; maxy: number }>
  >(`
    SELECT
      COUNT(*)::text AS n,
      MIN(source_tm_x::float8) AS minx,
      MAX(source_tm_x::float8) AS maxx,
      MIN(source_tm_y::float8) AS miny,
      MAX(source_tm_y::float8) AS maxy
    FROM golf_facilities
    WHERE is_active = true AND source_tm_x IS NOT NULL AND source_tm_y IS NOT NULL
  `);

  const out = { tmStatsActive: tmStats[0], samples: report };
  const outPath = process.env.TRACE_OUT || 'artifacts/golf-coord/sample-trace.json';
  const fs = await import('node:fs');
  const path = await import('node:path');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2), 'utf8');
  console.log(`wrote ${outPath} samples=${report.length}`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
