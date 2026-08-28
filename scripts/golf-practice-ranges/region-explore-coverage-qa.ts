/**
 * Admin district coverage QA for region explore.
 *
 *   pnpm exec tsx scripts/golf-practice-ranges/region-explore-coverage-qa.ts
 */
import { PrismaClient } from '@prisma/client';
import {
  ADMIN_SIDO_GROUPS,
  findAdminDistrict,
  listRegionExploreNodes,
  normalizeFacilityDistrict,
  normalizeSido,
  regionExploreHasChildren,
} from '../../packages/domain/src/index.ts';

const prisma = new PrismaClient();

type FacilityRow = {
  id: string;
  sido: string | null;
  sigungu: string | null;
};

function sigunguMatchesCatalog(
  canonicalSido: string,
  rowSigungu: string,
): boolean {
  const district = findAdminDistrict(canonicalSido, rowSigungu);
  if (district) return true;

  if (canonicalSido === '경기도') {
    const gyeonggiNodes = listRegionExploreNodes('경기도');
    for (const node of gyeonggiNodes) {
      if (node.sigungu === rowSigungu) return true;
      if (node.hasChildren) {
        const children = listRegionExploreNodes('경기도', node.sigungu);
        if (children.some((c) => c.sigungu === rowSigungu)) return true;
      }
    }
  }
  return false;
}

function resolveSigunguForMatch(
  canonicalSido: string,
  rawSigungu: string,
): string {
  if (sigunguMatchesCatalog(canonicalSido, rawSigungu)) return rawSigungu;

  // "고양시 일산동구" → "일산동구" (DB may store compound form)
  const parts = rawSigungu.split(/\s+/);
  if (parts.length >= 2) {
    const last = parts[parts.length - 1]!;
    if (sigunguMatchesCatalog(canonicalSido, last)) return last;
  }
  return rawSigungu;
}

async function main() {
  const rows = await prisma.golfFacility.findMany({
    select: { id: true, sido: true, sigungu: true },
  });

  const total = rows.length;
  const sidoNull = rows.filter((r) => !r.sido?.trim()).length;
  const sigunguNull = rows.filter((r) => !r.sigungu?.trim()).length;

  const distinctSido = [...new Set(rows.map((r) => r.sido).filter(Boolean))].sort();
  const distinctSigungu = [
    ...new Set(rows.map((r) => `${r.sido ?? '(null)'}|${r.sigungu ?? '(null)'}`)),
  ].sort();

  let sidoMatched = 0;
  let sigunguMatched = 0;
  const unmatchedSido: string[] = [];
  const unmatchedSigungu: Array<{ sido: string; sigungu: string; count: number }> = [];
  const unmatchedSigunguMap = new Map<string, number>();

  for (const row of rows) {
    const norm = normalizeFacilityDistrict(row.sido, row.sigungu);
    if (!norm) continue;

    const catalogSido = ADMIN_SIDO_GROUPS.some(
      (g) => normalizeSido(g.sido) === normalizeSido(norm.sido),
    );

    if (catalogSido) {
      sidoMatched += 1;
    } else {
      unmatchedSido.push(row.sido?.trim() ?? '');
    }

    if (!norm.sigungu) continue;

    if (sigunguMatchesCatalog(norm.sido, norm.sigungu)) {
      sigunguMatched += 1;
    } else {
      const key = `${row.sido ?? ''}|${row.sigungu ?? ''}`;
      unmatchedSigunguMap.set(key, (unmatchedSigunguMap.get(key) ?? 0) + 1);
    }
  }

  for (const [key, count] of unmatchedSigunguMap) {
    const [sido, sigungu] = key.split('|');
    unmatchedSigungu.push({ sido: sido!, sigungu: sigungu!, count });
  }
  unmatchedSigungu.sort((a, b) => b.count - a.count);

  // Gyeonggi depth: cities in DB that have gu subdivisions
  const gyeonggiRows = rows.filter(
    (r) => normalizeSido(r.sido) === '경기도' && r.sigungu?.trim(),
  );
  const gyeonggiSigunguCounts = new Map<string, number>();
  for (const row of gyeonggiRows) {
    const sig = row.sigungu!.trim();
    gyeonggiSigunguCounts.set(sig, (gyeonggiSigunguCounts.get(sig) ?? 0) + 1);
  }

  const gyeonggiCitiesWithGu = new Map<string, Set<string>>();
  const gyeonggiTreeCities = listRegionExploreNodes('경기도')
    .filter((n) => n.hasChildren)
    .map((n) => n.sigungu);

  for (const [sig, count] of gyeonggiSigunguCounts) {
    if (sig.endsWith('구') && !sig.endsWith('시')) {
      for (const city of gyeonggiTreeCities) {
        const children = listRegionExploreNodes('경기도', city);
        if (children.some((c) => c.sigungu === sig)) {
          const set = gyeonggiCitiesWithGu.get(city) ?? new Set();
          set.add(sig);
          gyeonggiCitiesWithGu.set(city, set);
        }
      }
    } else if (sig.endsWith('시')) {
      const set = gyeonggiCitiesWithGu.get(sig) ?? new Set();
      gyeonggiCitiesWithGu.set(sig, set);
    }
  }

  const gyeonggiNeedsTree: string[] = [];
  const gyeonggiMissingFromTree: string[] = [];
  for (const [city, gus] of gyeonggiCitiesWithGu) {
    if (gus.size > 0) {
      gyeonggiNeedsTree.push(
        `${city} → [${[...gus].join(', ')}] (${gyeonggiSigunguCounts.get(city) ?? 0} city-level)`,
      );
      if (!regionExploreHasChildren('경기도', city)) {
        gyeonggiMissingFromTree.push(city);
      } else {
        const catalogGus = listRegionExploreNodes('경기도', city).map((c) => c.sigungu);
        for (const gu of gus) {
          if (!catalogGus.includes(gu)) {
            gyeonggiMissingFromTree.push(`${city}/${gu}`);
          }
        }
      }
    }
  }

  // Find regions with actual joins
  const joinRows = await prisma.join.findMany({
    where: {
      status: { in: ['OPEN', 'FULL', 'CONFIRMED', 'IN_PROGRESS'] },
      venue: { golfFacility: { isNot: null } },
    },
    select: {
      id: true,
      startAt: true,
      venue: {
        select: {
          golfFacility: { select: { sido: true, sigungu: true } },
        },
      },
    },
    take: 500,
  });

  const joinRegions = new Map<string, number>();
  for (const j of joinRows) {
    const gf = j.venue.golfFacility;
    if (!gf?.sido) continue;
    const key = `${gf.sido}|${gf.sigungu ?? ''}`;
    joinRegions.set(key, (joinRegions.get(key) ?? 0) + 1);
  }

  const report = {
    total,
    sidoNull,
    sigunguNull,
    sidoMatched,
    sidoMatchedPct: ((sidoMatched / (total - sidoNull)) * 100).toFixed(1),
    sigunguMatched,
    sigunguMatchedPct: ((sigunguMatched / (total - sigunguNull)) * 100).toFixed(1),
    distinctSido,
    distinctSigunguCount: distinctSigungu.length,
    unmatchedSidoUnique: [...new Set(unmatchedSido)],
    unmatchedSigungu: unmatchedSigungu.slice(0, 50),
    gyeonggiNeedsTree,
    gyeonggiMissingFromTree,
    joinRegions: [...joinRegions.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([k, c]) => ({ region: k, joinCount: c })),
  };

  console.log(JSON.stringify(report, null, 2));
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
