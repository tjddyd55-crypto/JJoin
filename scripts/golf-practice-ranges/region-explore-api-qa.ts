/**
 * Region explore API QA — local running API required.
 *
 *   pnpm exec tsx scripts/golf-practice-ranges/region-explore-api-qa.ts
 */
import { PrismaClient } from '@prisma/client';
import {
  addCalendarDays,
  localDayKey,
  normalizeFacilityDistrict,
} from '../../packages/domain/src/index.ts';

const API_BASE = process.env.API_BASE ?? 'http://127.0.0.1:3000';

async function signIn(): Promise<string> {
  const res = await fetch(`${API_BASE}/auth/social/mock-sign-in`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ provider: 'KAKAO', scenario: 'RETURNING_USER' }),
  });
  if (!res.ok) throw new Error(`sign-in ${res.status}`);
  const body = (await res.json()) as { session: { accessToken: string } };
  return body.session.accessToken;
}

async function apiGet<T>(token: string, path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${path} -> ${res.status} ${text.slice(0, 200)}`);
  return JSON.parse(text) as T;
}

function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function findJoinRegion(prisma: PrismaClient) {
  const rows = await prisma.join.findMany({
    where: {
      status: { in: ['OPEN', 'FULL', 'CONFIRMED', 'IN_PROGRESS'] },
      venue: { golfFacility: { isNot: null } },
    },
    select: {
      startAt: true,
      venue: {
        select: {
          golfFacility: { select: { sido: true, sigungu: true } },
        },
      },
    },
    orderBy: { startAt: 'asc' },
    take: 200,
  });
  for (const row of rows) {
    const gf = row.venue.golfFacility;
    if (!gf?.sido || !gf.sigungu) continue;
    const norm = normalizeFacilityDistrict(gf.sido, gf.sigungu);
    if (!norm) continue;
    return {
      date: localDayKey(row.startAt, 'Asia/Seoul'),
      sido: norm.sido,
      sigungu: norm.sigungu,
      raw: `${gf.sido}|${gf.sigungu}`,
    };
  }
  return null;
}

async function main() {
  const prisma = new PrismaClient();
  const token = await signIn();
  const today = localDayKey(new Date(), 'Asia/Seoul');
  const tomorrow = addCalendarDays(today, 1);
  const sat = (() => {
    for (let i = 0; i < 7; i += 1) {
      const d = addCalendarDays(today, i);
      const wd = new Date(`${d}T12:00:00+09:00`).getDay();
      if (wd === 6) return d;
    }
    return addCalendarDays(today, 6);
  })();

  const dates = { today, tomorrow, saturday: sat };
  const report: Record<string, unknown> = { dates, apiBase: API_BASE };

  for (const [label, date] of Object.entries(dates)) {
    const summary = await apiGet<{
      items: Array<{ label: string; sido: string; count: number }>;
    }>(token, `/joins/discover/region-summary?date=${date}`);
    const pick = (name: string) =>
      summary.items.find((i) => i.label === name || i.sido.includes(name));
    report[`regionSummary_${label}`] = {
      서울: pick('서울')?.count ?? 0,
      경기: pick('경기')?.count ?? 0,
      인천: pick('인천')?.count ?? 0,
      totalItems: summary.items.length,
    };
  }

  const joinRegion = await findJoinRegion(prisma);
  report.joinDrillDown = { discovered: joinRegion };
  if (joinRegion) {
    const guSummary = await apiGet<{ items: Array<{ sigungu: string; label: string; count: number }> }>(
      token,
      `/joins/discover/region-summary?date=${joinRegion.date}&sido=${encodeURIComponent(joinRegion.sido)}`,
    );
    const gu =
      guSummary.items.find((i) => i.sigungu === joinRegion.sigungu) ??
      guSummary.items.find((i) => i.count > 0);
    report.joinDrillDown = {
      ...report.joinDrillDown,
      guSummaryTop: guSummary.items.filter((i) => i.count > 0).slice(0, 5),
      selectedGu: gu,
    };
    if (gu) {
      const facilities = await apiGet<{ facilities: Array<{ venueName: string; joins: unknown[] }> }>(
        token,
        `/joins/discover/facilities?date=${joinRegion.date}&regionMode=DISTRICT&sido=${encodeURIComponent(joinRegion.sido)}&sigungu=${encodeURIComponent(gu.sigungu)}`,
      );
      report.joinDrillDown = {
        ...report.joinDrillDown,
        facilities: facilities.facilities.slice(0, 3).map((f) => ({
          venueName: f.venueName,
          joinCount: f.joins.length,
        })),
      };
    }
  }

  const anchor = await prisma.golfFacility.findFirst({
    where: {
      latitude: { not: null },
      longitude: { not: null },
      isActive: true,
    },
    select: { id: true, displayName: true, latitude: true, longitude: true },
  });
  if (anchor) {
    const lat = Number(anchor.latitude);
    const lng = Number(anchor.longitude);
    const nearby = await apiGet<{
      facilities: Array<{ venueName: string; distanceMeters: number | null }>;
    }>(
      token,
      `/joins/discover/facilities?date=${today}&regionMode=NEARBY&lat=${lat}&lng=${lng}&radiusMeters=5000&sort=DISTANCE`,
    );
    const far = await apiGet<{ facilities: Array<{ distanceMeters: number | null }> }>(
      token,
      `/joins/discover/facilities?date=${today}&regionMode=NEARBY&lat=${lat}&lng=${lng}&radiusMeters=5000&sort=DISTANCE`,
    );
    const allNearby = nearby.facilities;
    const over5km = allNearby.filter(
      (f) => f.distanceMeters != null && f.distanceMeters > 5000,
    );
    const sorted = [...allNearby].filter((f) => f.distanceMeters != null);
    const monotonic = sorted.every(
      (f, i, arr) => i === 0 || (arr[i - 1]!.distanceMeters! <= f.distanceMeters!),
    );

    const boundaryFacility = await prisma.golfFacility.findFirst({
      where: {
        latitude: { not: null },
        longitude: { not: null },
        isActive: true,
        NOT: { id: anchor.id },
      },
      select: { latitude: true, longitude: true, displayName: true },
    });
    let boundaryCheck: Record<string, unknown> | null = null;
    if (boundaryFacility) {
      const bLat = Number(boundaryFacility.latitude);
      const bLng = Number(boundaryFacility.longitude);
      const dist = haversineMeters(lat, lng, bLat, bLng);
      const inResult = await apiGet<{ facilities: Array<{ venueName: string }> }>(
        token,
        `/joins/discover/facilities?date=${today}&regionMode=NEARBY&lat=${lat}&lng=${lng}&radiusMeters=${Math.ceil(dist)}`,
      );
      const names = inResult.facilities.map((f) => f.venueName);
      boundaryCheck = {
        anchor: anchor.displayName,
        boundary: boundaryFacility.displayName,
        haversineMeters: Math.round(dist),
        radiusQuery: Math.ceil(dist),
        includedAtBoundary: names.includes(boundaryFacility.displayName),
      };
    }

    report.nearby5km = {
      testCoordinate: { lat, lng, facility: anchor.displayName },
      resultCount: allNearby.length,
      over5kmInResult: over5km.length,
      distanceSortMonotonic: monotonic,
      boundaryCheck,
    };
  }

  console.log(JSON.stringify(report, null, 2));
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
