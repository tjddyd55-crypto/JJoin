import {
  buildRegionSearchDbHints,
  matchesFacilityRegionSearch,
} from '@jjoin/domain';
import type { Prisma } from '@prisma/client';

const SEARCH_TEXT_FIELDS = [
  'displayName',
  'sourceName',
  'roadAddress',
  'lotAddress',
] as const;

/** Avoid unbounded memory refine after broad DB prefilter. */
export const GOLF_FACILITY_SEARCH_DB_FETCH_CAP = 500;

export type GolfFacilitySearchQueryInput = {
  q?: string;
  sido?: string;
  sigungu?: string;
  screenOnly?: boolean;
  cursorId?: string;
};

/**
 * Expand q so compact tokens like "가자24" also match "가자 24시 …".
 * Keeps Prisma contains (no fuzzy engine).
 */
export function expandFacilitySearchTokens(q: string): string[] {
  const trimmed = q.trim();
  if (!trimmed) return [];
  const compact = trimmed.replace(/\s+/g, '');
  const tokens = new Set<string>([trimmed]);
  if (compact !== trimmed) tokens.add(compact);
  const spaced = compact
    .replace(/([가-힣])([0-9A-Za-z])/g, '$1 $2')
    .replace(/([0-9A-Za-z])([가-힣])/g, '$1 $2');
  if (spaced !== compact) tokens.add(spaced);
  return [...tokens];
}

/**
 * Build Prisma where for facility search.
 * Region/text filters are applied in SQL — never take nationwide rows first.
 */
export function buildGolfFacilitySearchWhere(
  input: GolfFacilitySearchQueryInput,
): Prisma.GolfFacilityWhereInput {
  const q = (input.q ?? '').trim();
  const sido = input.sido?.trim();
  const sigungu = input.sigungu?.trim();
  const hasDistrict = Boolean(sido && sigungu);

  const and: Prisma.GolfFacilityWhereInput[] = [{ isActive: true }];

  if (input.screenOnly) {
    and.push({ isScreenJoinEligible: true });
  }

  if (input.cursorId) {
    and.push({ id: { gt: input.cursorId } });
  }

  if (q) {
    const tokens = expandFacilitySearchTokens(q);
    and.push({
      OR: tokens.flatMap((token) =>
        SEARCH_TEXT_FIELDS.map((field) => ({
          [field]: { contains: token, mode: 'insensitive' as const },
        })),
      ),
    });
  }

  if (hasDistrict) {
    const hints = buildRegionSearchDbHints(sido!, sigungu!);
    if (hints) {
      and.push({
        OR: [
          {
            AND: [
              { sido: { in: hints.sidoVariants } },
              { sigungu: { in: hints.sigunguCandidates } },
            ],
          },
          {
            AND: [
              { sido: { in: hints.sidoVariants } },
              {
                roadAddress: {
                  contains: hints.addressContains,
                  mode: 'insensitive',
                },
              },
            ],
          },
          {
            AND: [
              { sido: { in: hints.sidoVariants } },
              {
                lotAddress: {
                  contains: hints.addressContains,
                  mode: 'insensitive',
                },
              },
            ],
          },
        ],
      });
    }
  }

  return { AND: and };
}

export function refineGolfFacilitySearchRows<
  T extends {
    id: string;
    sido: string | null;
    sigungu: string | null;
    roadAddress?: string | null;
    lotAddress?: string | null;
  },
>(
  rows: T[],
  input: { sido?: string; sigungu?: string; limit: number },
): { page: T[]; nextCursor: string | null } {
  const sido = input.sido?.trim();
  const sigungu = input.sigungu?.trim();
  const hasDistrict = Boolean(sido && sigungu);

  const refined = hasDistrict
    ? rows.filter((row) =>
        matchesFacilityRegionSearch(row, sido!, sigungu!),
      )
    : rows;

  const page = refined.slice(0, input.limit);
  const nextCursor =
    refined.length > input.limit ? page[page.length - 1]?.id ?? null : null;
  return { page, nextCursor };
}

/** How many rows to fetch from DB before optional region refine. */
export function golfFacilitySearchTake(
  limit: number,
  hasDistrict: boolean,
): number {
  if (!hasDistrict) return limit + 1;
  return Math.min(GOLF_FACILITY_SEARCH_DB_FETCH_CAP, Math.max(limit + 1, limit * 5));
}
