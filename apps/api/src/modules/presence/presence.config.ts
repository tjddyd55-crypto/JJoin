/** Presence / explore config — no magic numbers in domain services. */
export const presenceConfig = {
  /** Nearby search radius in meters. */
  nearbyRadiusMeters: Number(process.env.PRESENCE_NEARBY_RADIUS_M ?? 5000),
  /** Ignore stale location updates older than this. */
  freshnessMinutes: Number(process.env.PRESENCE_FRESHNESS_MINUTES ?? 180),
  /** Stable privacy offset band (meters). */
  privacyJitterMinMeters: 80,
  privacyJitterMaxMeters: 150,
  /** Coarse grid size for display points (~55m). */
  privacyGridDegrees: 0.0005,
  durationMinutes: {
    '1h': 60,
    '2h': 120,
    today: 24 * 60,
  } as Record<'1h' | '2h' | 'today', number>,
};

export const exploreConfig = {
  defaultSportCode: process.env.DEFAULT_SPORT_CODE ?? 'SCREEN_GOLF',
  /** GeoJSON-ish Korea fallback (Seoul City Hall area). */
  fallbackCenter: {
    latitude: 37.5665,
    longitude: 126.978,
  },
  /** Geoje (mock Explore scenario). */
  demoCenter: {
    latitude: 34.8806,
    longitude: 128.6211,
  },
};
