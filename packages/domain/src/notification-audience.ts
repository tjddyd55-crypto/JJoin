/**
 * JOIN_CREATED audience SSOT.
 * SCREEN = stored-coord radius or same admin region.
 * FIELD = metro/city AUTO mapping — not screen distance.
 */

import {
  FIELD_REGION_CATALOG,
  isFieldMetroProvince,
  normalizeFieldCityCounty,
  shouldSkipFieldSigunguStep,
} from './field-region';
import { haversineMeters } from './join-recommendations';
import { findSidoGroup, normalizeSido } from './region-explore-catalog';
import {
  DEFAULT_SCREEN_NOTIFICATION_RADIUS_KM,
  screenRadiusModeToKm,
  type FieldNotificationRegion,
  type ScreenNotificationRadiusMode,
} from './notification-policy';

export type HomeRegionInput = {
  regionLabel?: string | null;
  regionCode?: string | null;
  sido?: string | null;
  sigungu?: string | null;
};

export type ParsedHomeRegion = {
  sido: string | null;
  sigungu: string | null;
};

export function parseHomeRegion(input: HomeRegionInput | string | null | undefined): ParsedHomeRegion {
  if (!input) return { sido: null, sigungu: null };
  if (typeof input === 'string') return parseRegionLabel(input);
  if (input.sido || input.sigungu) {
    const normalized = normalizeFieldCityCounty(input.sido, input.sigungu);
    return { sido: normalized.province, sigungu: normalized.cityCounty };
  }
  return parseRegionLabel(input.regionLabel ?? input.regionCode ?? '');
}

function parseRegionLabel(raw: string): ParsedHomeRegion {
  const trimmed = raw.trim();
  if (!trimmed) return { sido: null, sigungu: null };
  const tokens = trimmed.split(/\s+/).filter(Boolean);
  const firstToken = tokens[0] ?? '';
  const first = findSidoGroup(firstToken) ? normalizeSido(firstToken) : null;
  if (first) {
    const rest = tokens.slice(1).join(' ');
    const normalized = normalizeFieldCityCounty(first, rest || null);
    return { sido: normalized.province, sigungu: normalized.cityCounty };
  }
  return inferFromCityToken(trimmed);
}

function inferFromCityToken(raw: string): ParsedHomeRegion {
  const needle = raw.replace(/시$/, '');
  for (const group of FIELD_REGION_CATALOG) {
    const hit = group.cities.find(
      (city) => city.cityCounty === raw || city.cityCounty === `${needle}시`,
    );
    if (hit) return { sido: group.province, sigungu: hit.cityCounty };
  }
  return { sido: null, sigungu: null };
}

/**
 * AUTO field-notification regions from home/activity region.
 * Metro (서울 등) → province only. Provincial city → 시/군.
 */
export function resolveDefaultFieldNotificationRegions(
  homeRegion: HomeRegionInput | string | null | undefined,
): FieldNotificationRegion[] {
  const parsed = parseHomeRegion(homeRegion);
  if (!parsed.sido) return [];
  if (isFieldMetroProvince(parsed.sido) || shouldSkipFieldSigunguStep(parsed.sido)) {
    return [{ province: parsed.sido, cityCounty: null }];
  }
  return [{ province: parsed.sido, cityCounty: parsed.sigungu }];
}

export function resolveEffectiveFieldNotificationRegions(input: {
  mode: FieldNotificationRegionModeLike;
  customRegions: FieldNotificationRegion[] | null | undefined;
  homeRegion: HomeRegionInput | string | null | undefined;
  activityRegions?: Array<HomeRegionInput | string>;
}): FieldNotificationRegion[] {
  if (input.mode === 'CUSTOM') {
    return dedupeRegions(input.customRegions ?? []);
  }
  const fromHome = resolveDefaultFieldNotificationRegions(input.homeRegion);
  const fromActivity = (input.activityRegions ?? []).flatMap((region) =>
    resolveDefaultFieldNotificationRegions(region),
  );
  return dedupeRegions([...fromHome, ...fromActivity]);
}

type FieldNotificationRegionModeLike = 'AUTO' | 'CUSTOM';

function regionKey(region: FieldNotificationRegion): string {
  return `${region.province}::${region.cityCounty ?? ''}`;
}

export function dedupeRegions(regions: FieldNotificationRegion[]): FieldNotificationRegion[] {
  const seen = new Set<string>();
  const out: FieldNotificationRegion[] = [];
  for (const region of regions) {
    if (!region.province) continue;
    const key = regionKey(region);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ province: region.province, cityCounty: region.cityCounty ?? null });
  }
  return out;
}

export function matchesFieldNotificationRegions(input: {
  venueSido?: string | null;
  venueSigungu?: string | null;
  regions: FieldNotificationRegion[];
}): boolean {
  const venue = normalizeFieldCityCounty(input.venueSido, input.venueSigungu);
  if (!venue.province) return false;
  return input.regions.some((region) => {
    if (region.province !== venue.province) return false;
    if (!region.cityCounty) return true;
    return region.cityCounty === venue.cityCounty;
  });
}

export function matchesScreenAdminRegion(input: {
  userSido?: string | null;
  userSigungu?: string | null;
  venueSido?: string | null;
  venueSigungu?: string | null;
}): boolean {
  const user = normalizeFieldCityCounty(input.userSido, input.userSigungu);
  const venue = normalizeFieldCityCounty(input.venueSido, input.venueSigungu);
  if (!user.province || !venue.province || user.province !== venue.province) return false;
  if (!user.cityCounty || !venue.cityCounty) return user.province === venue.province;
  return user.cityCounty === venue.cityCounty;
}

export type GeoPoint = { latitude: number; longitude: number };

export function boundingBoxForRadiusKm(center: GeoPoint, radiusKm: number): {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
} {
  const latDelta = radiusKm / 111.32;
  const cosLat = Math.cos((center.latitude * Math.PI) / 180);
  const lngDelta = radiusKm / (111.32 * Math.max(0.2, Math.abs(cosLat)));
  return {
    minLat: center.latitude - latDelta,
    maxLat: center.latitude + latDelta,
    minLng: center.longitude - lngDelta,
    maxLng: center.longitude + lngDelta,
  };
}

export function isWithinScreenRadius(input: {
  user: GeoPoint;
  venue: GeoPoint;
  mode: ScreenNotificationRadiusMode;
  venueSido?: string | null;
  venueSigungu?: string | null;
  userSido?: string | null;
  userSigungu?: string | null;
}): boolean {
  if (input.mode === 'SAME_ADMIN_REGION') {
    return matchesScreenAdminRegion({
      userSido: input.userSido,
      userSigungu: input.userSigungu,
      venueSido: input.venueSido,
      venueSigungu: input.venueSigungu,
    });
  }
  const km = screenRadiusModeToKm(input.mode) ?? DEFAULT_SCREEN_NOTIFICATION_RADIUS_KM;
  const meters = haversineMeters(
    input.user.latitude,
    input.user.longitude,
    input.venue.latitude,
    input.venue.longitude,
  );
  return meters <= km * 1000;
}

export function shouldExcludeHost(recipientUserId: string, hostUserId: string): boolean {
  return recipientUserId === hostUserId;
}

export function isBlockedEitherWay(
  blockerPairs: Array<{ blockerUserId: string; blockedUserId: string }>,
  userA: string,
  userB: string,
): boolean {
  return blockerPairs.some(
    (row) =>
      (row.blockerUserId === userA && row.blockedUserId === userB) ||
      (row.blockerUserId === userB && row.blockedUserId === userA),
  );
}

export function shouldRateLimitJoinCreated(
  recentCount: number,
  maxPerRecipient = 8,
): boolean {
  return recentCount >= maxPerRecipient;
}

export function parseFieldRegionsJson(raw: unknown): FieldNotificationRegion[] {
  if (!Array.isArray(raw)) return [];
  const parsed: FieldNotificationRegion[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const province = typeof (item as { province?: unknown }).province === 'string'
      ? (item as { province: string }).province.trim()
      : '';
    if (!province) continue;
    const cityRaw = (item as { cityCounty?: unknown }).cityCounty;
    const cityCounty = typeof cityRaw === 'string' && cityRaw.trim() ? cityRaw.trim() : null;
    parsed.push({ province, cityCounty });
  }
  return dedupeRegions(parsed);
}

export function isKnownFieldNotificationRegion(region: FieldNotificationRegion): boolean {
  const group = FIELD_REGION_CATALOG.find((g) => g.province === region.province);
  if (!group) return false;
  if (!region.cityCounty) return true;
  return group.cities.some((city) => city.cityCounty === region.cityCounty);
}

export type PaginatedAudienceFetchPage<T> = (
  cursor: string | undefined,
  take: number,
) => Promise<T[]>;

/**
 * Cursor page-walk for JOIN_CREATED audience.
 * `pageSize` is a page size, not a total cap. A page with zero eligible rows
 * still continues until the fetch returns a short page.
 */
export async function collectPaginatedAudienceIds<T>(input: {
  pageSize: number;
  fetchPage: PaginatedAudienceFetchPage<T>;
  cursorOf: (row: T) => string;
  idOf: (row: T) => string;
  include: (row: T) => boolean;
}): Promise<string[]> {
  const ids: string[] = [];
  let cursor: string | undefined;
  while (true) {
    const page = await input.fetchPage(cursor, input.pageSize);
    for (const row of page) {
      if (input.include(row)) ids.push(input.idOf(row));
    }
    if (page.length < input.pageSize) break;
    cursor = input.cursorOf(page[page.length - 1]!);
  }
  return ids;
}
