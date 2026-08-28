/**
 * Region-based Join Explore catalog — fixed top-level order and hierarchical navigation.
 * Keys (sido/sigungu) align with GolfFacility DB columns where possible.
 */

import { ADMIN_SIDO_GROUPS, type AdminDistrict, type AdminSidoGroup } from './admin-districts';
import {
  addCalendarDays,
  localDayKey,
  WEEKDAY_LABELS_KO,
  type WeekDayCell,
} from './join-discovery';

/** Fixed top-level region order (excluding "내 위치" — UI-only). */
export const REGION_EXPLORE_TOP_SIDO: readonly {
  sido: string;
  label: string;
}[] = [
  { sido: '서울특별시', label: '서울' },
  { sido: '경기도', label: '경기' },
  { sido: '인천광역시', label: '인천' },
  { sido: '부산광역시', label: '부산' },
  { sido: '대구광역시', label: '대구' },
  { sido: '광주광역시', label: '광주' },
  { sido: '대전광역시', label: '대전' },
  { sido: '울산광역시', label: '울산' },
  { sido: '세종특별자치시', label: '세종' },
  { sido: '강원특별자치도', label: '강원' },
  { sido: '충청북도', label: '충북' },
  { sido: '충청남도', label: '충남' },
  { sido: '전북특별자치도', label: '전북' },
  { sido: '전라남도', label: '전남' },
  { sido: '경상북도', label: '경북' },
  { sido: '경상남도', label: '경남' },
  { sido: '제주특별자치도', label: '제주' },
] as const;

/** Legacy/alternate sido spellings in GolfFacility rows. */
const SIDO_ALIASES: Record<string, string> = {
  서울: '서울특별시',
  서울특별시: '서울특별시',
  경기: '경기도',
  경기도: '경기도',
  인천: '인천광역시',
  인천광역시: '인천광역시',
  부산: '부산광역시',
  부산광역시: '부산광역시',
  대구: '대구광역시',
  대구광역시: '대구광역시',
  광주: '광주광역시',
  광주광역시: '광주광역시',
  대전: '대전광역시',
  대전광역시: '대전광역시',
  울산: '울산광역시',
  울산광역시: '울산광역시',
  세종: '세종특별자치시',
  세종특별자치시: '세종특별자치시',
  강원: '강원특별자치도',
  강원도: '강원특별자치도',
  강원특별자치도: '강원특별자치도',
  충북: '충청북도',
  충청북도: '충청북도',
  충남: '충청남도',
  충청남도: '충청남도',
  전북: '전북특별자치도',
  전라북도: '전북특별자치도',
  전북특별자치도: '전북특별자치도',
  전남: '전라남도',
  전라남도: '전라남도',
  경북: '경상북도',
  경상북도: '경상북도',
  경남: '경상남도',
  경상남도: '경상남도',
  제주: '제주특별자치도',
  제주특별자치도: '제주특별자치도',
};

/** 광주 구 — `전남광주통합특별시` 행정 통합 데이터에서 광주로 분리. */
const GWANGJU_SIGUNGU_FROM_MERGED = new Set([
  '동구',
  '서구',
  '남구',
  '북구',
  '광산구',
]);

export type NormalizedFacilityDistrict = {
  sido: string;
  sigungu: string;
};

/**
 * Canonicalize GolfFacility sido/sigungu for region matching (no DB migration).
 * Handles merged-government labels and short sido spellings.
 */
export function normalizeFacilityDistrict(
  rawSido: string | null | undefined,
  rawSigungu: string | null | undefined,
): NormalizedFacilityDistrict | null {
  if (!rawSido?.trim()) return null;
  const trimmedSido = rawSido.trim();
  const sigungu = rawSigungu?.trim() ?? '';

  if (trimmedSido === '전남광주통합특별시') {
    if (GWANGJU_SIGUNGU_FROM_MERGED.has(sigungu)) {
      return { sido: '광주광역시', sigungu };
    }
    return { sido: '전라남도', sigungu };
  }

  const sido = normalizeSido(trimmedSido);
  if (!sido) return null;
  return { sido, sigungu };
}

function gyeonggiParentCityForGu(sigungu: string): string | null {
  for (const [city, children] of Object.entries(GYEONGGI_TREE)) {
    if (children.some((c) => c.sigungu === sigungu)) return city;
  }
  return null;
}

export type RegionExploreNode = {
  sido: string;
  sigungu: string;
  label: string;
  hasChildren: boolean;
};

export type RegionExploreBreadcrumb = {
  sido: string;
  sigungu?: string;
  label: string;
};

function node(
  sido: string,
  sigungu: string,
  label: string,
  hasChildren = false,
): RegionExploreNode {
  return { sido, sigungu, label, hasChildren };
}

/** Cities in Gyeonggi with gu subdivisions — navigation tree overlay. */
const GYEONGGI_TREE: Record<string, RegionExploreNode[]> = {
  고양시: [
    node('경기도', '일산동구', '일산동구'),
    node('경기도', '일산서구', '일산서구'),
    node('경기도', '덕양구', '덕양구'),
  ],
  성남시: [
    node('경기도', '분당구', '분당구'),
    node('경기도', '수정구', '수정구'),
    node('경기도', '중원구', '중원구'),
  ],
  수원시: [
    node('경기도', '영통구', '영통구'),
    node('경기도', '장안구', '장안구'),
    node('경기도', '권선구', '권선구'),
    node('경기도', '팔달구', '팔달구'),
  ],
  안산시: [
    node('경기도', '단원구', '단원구'),
    node('경기도', '상록구', '상록구'),
  ],
  안양시: [
    node('경기도', '동안구', '동안구'),
    node('경기도', '만안구', '만안구'),
  ],
  용인시: [
    node('경기도', '기흥구', '기흥구'),
    node('경기도', '수지구', '수지구'),
    node('경기도', '처인구', '처인구'),
  ],
};

export function normalizeSido(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  return SIDO_ALIASES[trimmed] ?? trimmed;
}

export function findSidoGroup(sido: string): AdminSidoGroup | null {
  const canonical = normalizeSido(sido);
  if (!canonical) return null;
  return (
    ADMIN_SIDO_GROUPS.find((g) => normalizeSido(g.sido) === canonical) ?? null
  );
}

export function listTopLevelSido(): readonly { sido: string; label: string }[] {
  return REGION_EXPLORE_TOP_SIDO;
}

/** Sub-regions for navigation at the current level (fixed catalog order). */
export function listRegionExploreNodes(
  sido: string,
  parentSigungu?: string,
): RegionExploreNode[] {
  const canonical = normalizeSido(sido) ?? sido;

  if (canonical === '경기도' && parentSigungu) {
    const children = GYEONGGI_TREE[parentSigungu];
    if (children?.length) return children;
  }

  if (parentSigungu) return [];

  const gyeonggiChildKeys = new Set(Object.keys(GYEONGGI_TREE));
  const group = findSidoGroup(canonical);
  if (group) {
    return group.districts.map((d) =>
      node(
        d.sido,
        d.sigungu,
        d.label,
        canonical === '경기도' && gyeonggiChildKeys.has(d.sigungu),
      ),
    );
  }

  if (canonical === '세종특별자치시') {
    return [node('세종특별자치시', '세종특별자치시', '세종')];
  }

  return [];
}

export function regionExploreHasChildren(
  sido: string,
  sigungu: string,
): boolean {
  const canonical = normalizeSido(sido) ?? sido;
  if (canonical === '경기도' && sigungu in GYEONGGI_TREE) return true;
  return false;
}

/** Sigungu values that belong to a navigation node (parent + optional tree children). */
export function resolveRegionScopeSigungu(
  sido: string,
  sigungu: string,
): string[] {
  const canonical = normalizeSido(sido) ?? sido;
  if (canonical === '경기도' && sigungu in GYEONGGI_TREE) {
    return [sigungu, ...GYEONGGI_TREE[sigungu]!.map((c) => c.sigungu)];
  }
  return [sigungu];
}

export function matchesRegionScope(
  rowSido: string | null | undefined,
  rowSigungu: string | null | undefined,
  targetSido: string,
  targetSigungu?: string,
): boolean {
  const row = normalizeFacilityDistrict(rowSido, rowSigungu);
  if (!row) return false;
  const wanted = normalizeSido(targetSido);
  if (!wanted || normalizeSido(row.sido) !== wanted) return false;
  if (!targetSigungu) return true;
  if (!row.sigungu) return false;
  const scope = resolveRegionScopeSigungu(targetSido, targetSigungu);
  if (scope.includes(row.sigungu)) return true;
  if (wanted === '경기도') {
    const parentCity = gyeonggiParentCityForGu(targetSigungu);
    if (parentCity && row.sigungu === parentCity) return true;
  }
  return false;
}

export function buildRegionBreadcrumb(
  sido: string,
  sigungu?: string,
): RegionExploreBreadcrumb[] {
  const group = findSidoGroup(sido);
  const rootLabel = group?.label ?? REGION_EXPLORE_TOP_SIDO.find(
    (s) => normalizeSido(s.sido) === normalizeSido(sido),
  )?.label ?? sido;
  const crumbs: RegionExploreBreadcrumb[] = [
    { sido, label: rootLabel },
  ];
  if (!sigungu) return crumbs;

  if (normalizeSido(sido) === '경기도') {
    for (const [city, children] of Object.entries(GYEONGGI_TREE)) {
      const child = children.find((c) => c.sigungu === sigungu);
      if (child) {
        crumbs.push({ sido, sigungu: city, label: city });
        crumbs.push({ sido, sigungu, label: child.label });
        return crumbs;
      }
    }
  }

  const district = findAdminDistrict(sido, sigungu);
  crumbs.push({ sido, sigungu, label: district?.label ?? sigungu });
  return crumbs;
}

function findAdminDistrict(sido: string, sigungu: string): AdminDistrict | null {
  const group = findSidoGroup(sido);
  if (!group) return null;
  return (
    group.districts.find((d) => d.sigungu === sigungu) ??
    null
  );
}

/** Build horizontal date strip cells starting from today (KST). */
export function buildRegionDateStrip(
  startDateKey: string,
  dayCount: number,
  options?: { now?: Date; timeZone?: string },
): WeekDayCell[] {
  const timeZone = options?.timeZone ?? 'Asia/Seoul';
  const now = options?.now ?? new Date();
  const todayKey = localDayKey(now, timeZone);
  const cells: WeekDayCell[] = [];
  for (let i = 0; i < dayCount; i += 1) {
    const date = addCalendarDays(startDateKey, i);
    const dayOfMonth = Number(date.slice(8, 10));
    const weekdayIndex = new Date(`${date}T12:00:00+09:00`).getDay();
    cells.push({
      date,
      weekdayIndex,
      weekdayLabel: WEEKDAY_LABELS_KO[weekdayIndex]!,
      dayOfMonth,
      isToday: date === todayKey,
    });
  }
  return cells;
}
