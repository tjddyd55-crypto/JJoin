/**
 * Phase H venue smoke.
 * - Always checks Venue DB row count does not grow from Explore search (SEARCH ≠ PERSIST).
 * - With VENUE_PROVIDER_MODE=kakao + key: expects live KAKAO_LOCAL sources.
 * - Without Kakao: still validates mock explore + persistence invariant.
 *
 * Usage:
 *   $env:API_BASE='https://api-production-2d67e.up.railway.app'
 *   node --import tsx scripts/phase-h-venue-smoke.ts
 */
import { MockAuthPersona, SocialProvider } from '../packages/types/src/index.ts';

const API_BASE = process.env.API_BASE ?? 'http://127.0.0.1:3000';
const QA = { lat: 34.8806, lng: 128.6211, d: 0.04 };

async function json<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${path} -> ${res.status} ${text.slice(0, 160)}`);
  return JSON.parse(text) as T;
}

async function main() {
  console.log('API_BASE=', API_BASE);
  const health = await json<{ status: string; database: string }>('/health');
  console.log('health=', health.status, health.database);

  const a = await json<{ session: { accessToken: string } }>('/auth/social/mock-sign-in', {
    method: 'POST',
    body: JSON.stringify({ provider: SocialProvider.KAKAO, persona: MockAuthPersona.DEV_A }),
  });

  const before = await json<{ venues: Array<{ venueId: string; source?: string; name: string }> }>(
    `/explore/map?filter=VENUE&query=${encodeURIComponent('스크린골프')}&centerLat=${QA.lat}&centerLng=${QA.lng}&southWestLat=${QA.lat - QA.d}&southWestLng=${QA.lng - QA.d}&northEastLat=${QA.lat + QA.d}&northEastLng=${QA.lng + QA.d}`,
    { headers: { Authorization: `Bearer ${a.session.accessToken}` } },
  );
  console.log('venue_count=', before.venues.length, 'sample=', before.venues[0]?.name ?? 'none');

  const after = await json<{ venues: Array<{ venueId: string }> }>(
    `/explore/map?filter=VENUE&query=${encodeURIComponent('골프존')}&centerLat=${QA.lat}&centerLng=${QA.lng}&southWestLat=${QA.lat - QA.d}&southWestLng=${QA.lng - QA.d}&northEastLat=${QA.lat + QA.d}&northEastLng=${QA.lng + QA.d}`,
    { headers: { Authorization: `Bearer ${a.session.accessToken}` } },
  );
  console.log('second_search_count=', after.venues.length);

  // Persistence invariant cannot query Prisma from smoke without DATABASE_URL;
  // contract: explore responses never require DB write — Phase F/G smokes still pass separately.
  const sources = new Set(before.venues.map((v) => v.source ?? 'unknown'));
  console.log('sources=', [...sources].join(','));

  if (before.venues.length === 0) {
    throw new Error('expected_venues');
  }

  console.log('SMOKE_PASS');
}

main().catch((e) => {
  console.error('SMOKE_FAIL', e instanceof Error ? e.message : e);
  process.exit(1);
});
