/**
 * Club activity region SSOT — multi-region storage, dedupe, compact display.
 */

import { findSidoGroup, normalizeSido } from './region-explore-catalog';

export type ClubActivityRegionInput = {
  sido: string;
  sigungu: string;
  parentSigungu?: string | null;
  displayName?: string | null;
};

export type ClubActivityRegionDtoShape = {
  sido: string;
  sigungu: string;
  parentSigungu: string | null;
  displayName: string;
};

export function clubActivityRegionKey(sido: string, sigungu: string): string {
  const canonicalSido = normalizeSido(sido) ?? sido.trim();
  return `${canonicalSido}|${sigungu.trim()}`;
}

export function buildClubActivityRegionDisplay(input: ClubActivityRegionInput): string {
  const custom = input.displayName?.trim();
  if (custom) return custom;
  const label = input.sigungu.trim();
  const group = findSidoGroup(input.sido);
  const sidoShort = group?.label ?? input.sido;
  if (input.parentSigungu?.trim()) {
    return `${sidoShort} ${input.parentSigungu.trim()} ${label}`;
  }
  return label;
}

export function normalizeClubActivityRegionInput(raw: ClubActivityRegionInput): ClubActivityRegionDtoShape {
  const sido = (normalizeSido(raw.sido) ?? raw.sido).trim();
  const sigungu = raw.sigungu.trim();
  const parentSigungu = raw.parentSigungu?.trim() || null;
  return {
    sido,
    sigungu,
    parentSigungu,
    displayName: buildClubActivityRegionDisplay({ sido, sigungu, parentSigungu }),
  };
}

/** Reject duplicate sido+sigungu within the same payload. */
export function dedupeClubActivityRegions(
  regions: ClubActivityRegionInput[],
): ClubActivityRegionDtoShape[] {
  const seen = new Set<string>();
  const out: ClubActivityRegionDtoShape[] = [];
  for (const raw of regions) {
    const normalized = normalizeClubActivityRegionInput(raw);
    const key = clubActivityRegionKey(normalized.sido, normalized.sigungu);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(normalized);
  }
  return out;
}

export function primaryClubRegionString(regions: ClubActivityRegionDtoShape[]): string {
  if (!regions.length) return '';
  return regions[0].displayName.trim();
}

/**
 * Compact multi-region label for cards/headers.
 * e.g. "일산동구 · 파주시 · 은평구" or "일산동구 외 2곳"
 */
export function formatClubActivityRegionsCompact(
  regions: ClubActivityRegionDtoShape[],
  options?: { maxParts?: number },
): string {
  const maxParts = options?.maxParts ?? 3;
  if (!regions.length) return '';
  const labels = regions.map((r) => r.displayName.trim()).filter(Boolean);
  if (labels.length <= maxParts) {
    return labels.join(' · ');
  }
  const head = labels.slice(0, maxParts - 1);
  const rest = labels.length - (maxParts - 1);
  return `${head.join(' · ')} 외 ${rest}곳`;
}

/** Chip label — prefer short sigungu-style label when display is long. */
export function clubActivityRegionChipLabel(region: ClubActivityRegionDtoShape): string {
  return region.sigungu.trim() || region.displayName;
}
