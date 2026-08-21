/** Kakao Local / venue search knobs — POLICY_TBD values centralized. */
export const venueSearchConfig = {
  pageSize: Number(process.env.KAKAO_LOCAL_PAGE_SIZE ?? 15),
  maxPages: Number(process.env.KAKAO_LOCAL_MAX_PAGES ?? 3),
  /** Fallback when map bounds unavailable; must stay ≤ Kakao max 20000. */
  fallbackRadiusMeters: Number(process.env.KAKAO_LOCAL_FALLBACK_RADIUS_M ?? 5000),
  kakaoMaxRadiusMeters: 20_000,
  timeoutMs: Number(process.env.KAKAO_LOCAL_TIMEOUT_MS ?? 4000),
  baseUrl:
    process.env.KAKAO_LOCAL_BASE_URL ??
    'https://dapi.kakao.com/v2/local/search/keyword.json',
  restApiKey: process.env.KAKAO_LOCAL_REST_API_KEY?.trim() ?? '',
  queryMaxLength: Number(process.env.VENUE_SEARCH_QUERY_MAX_LENGTH ?? 80),
};

export function resolveVenueProviderMode(): 'kakao' | 'mock' {
  const raw = (process.env.VENUE_PROVIDER_MODE ?? 'mock').toLowerCase();
  if (raw === 'kakao' || raw === 'kakao_local') return 'kakao';
  if (raw === 'mock') return 'mock';
  throw new Error(`invalid VENUE_PROVIDER_MODE=${raw}`);
}

export function cappedRadiusMeters(requested?: number): number {
  const base = requested ?? venueSearchConfig.fallbackRadiusMeters;
  return Math.min(
    Math.max(1, base),
    venueSearchConfig.kakaoMaxRadiusMeters,
  );
}
