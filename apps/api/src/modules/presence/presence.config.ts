/** Presence / explore config — POLICY_TBD knobs centralized. */
export const presenceConfig = {
  nearbyRadiusMeters: Number(process.env.PRESENCE_NEARBY_RADIUS_M ?? 5000),
  freshnessMinutes: Number(process.env.PRESENCE_FRESHNESS_MINUTES ?? 180),
  /** Max public nearby users per Explore query. */
  nearbyLimit: Number(process.env.PRESENCE_NEARBY_LIMIT ?? 40),
  privacyJitterMinMeters: Number(process.env.PRESENCE_PRIVACY_JITTER_MIN_M ?? 80),
  privacyJitterMaxMeters: Number(process.env.PRESENCE_PRIVACY_JITTER_MAX_M ?? 150),
  privacyGridDegrees: Number(process.env.PRESENCE_PRIVACY_GRID_DEGREES ?? 0.0005),
  defaultTimeZone: process.env.DEFAULT_TIMEZONE ?? 'Asia/Seoul',
};

/**
 * Server-only HMAC secret for display-point epoch seeds.
 * Lazy: avoid failing `nest build` before Railway injects runtime env.
 * Never expose to mobile / EXPO_PUBLIC. Do not reuse JWT_SECRET in production.
 */
export function getPresencePrivacySecret(): string {
  const dedicated = process.env.PRESENCE_PRIVACY_SECRET?.trim();
  if (dedicated) return dedicated;
  const nodeEnv = (process.env.NODE_ENV ?? 'development').toLowerCase();
  if (nodeEnv === 'production') {
    throw new Error('PRESENCE_PRIVACY_SECRET is required in production');
  }
  return 'dev-only-presence-privacy';
}

export const exploreConfig = {
  defaultSportCode: process.env.DEFAULT_SPORT_CODE ?? 'SCREEN_GOLF',
  fallbackCenter: {
    latitude: 37.5665,
    longitude: 126.978,
  },
  demoCenter: {
    latitude: 34.8806,
    longitude: 128.6211,
  },
};

export function resolvePresenceStoreMode(): 'prisma' | 'memory' {
  const raw = (process.env.PRESENCE_STORE ?? 'prisma').toLowerCase();
  if (raw === 'memory') return 'memory';
  if (raw === 'prisma') return 'prisma';
  throw new Error(`invalid PRESENCE_STORE=${raw}`);
}
