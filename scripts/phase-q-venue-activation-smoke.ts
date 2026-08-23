/**
 * Phase Q — Venue activation smoke (server).
 *
 * Usage:
 *   $env:API_BASE='https://api-production-2d67e.up.railway.app'
 *   pnpm exec tsx scripts/phase-q-venue-activation-smoke.ts
 */
import { MockAuthPersona, SocialProvider } from '../packages/types/src/index.ts';

const API_BASE = process.env.API_BASE ?? 'https://api-production-2d67e.up.railway.app';

async function request(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(init?.headers ?? {}),
    },
  });
}

async function json<T>(
  path: string,
  init?: RequestInit,
): Promise<{ status: number; body: T }> {
  const res = await request(path, init);
  const raw = await res.text();
  let body: T;
  try {
    body = JSON.parse(raw) as T;
  } catch {
    throw new Error(`${path} -> ${res.status} non-json ${raw.slice(0, 160)}`);
  }
  return { status: res.status, body };
}

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

type ExploreVenue = {
  venueId: string;
  name: string;
  source?: string;
  canCreateJoin?: boolean;
  providerPlaceId?: string;
  provider?: string;
  jjoinVenueId?: string | null;
  isActivated?: boolean;
  latitude: number;
  longitude: number;
};

async function main() {
  console.log('Phase Q venue activation smoke');
  console.log('API_BASE=', API_BASE);

  const health = await json<{ status: string; database?: string }>('/health');
  assert(health.status === 200, 'health http');
  assert(health.body.status === 'ok', 'health status');

  const signIn = await json<{ session: { accessToken: string } }>(
    '/auth/social/mock-sign-in',
    {
      method: 'POST',
      body: JSON.stringify({
        provider: SocialProvider.KAKAO,
        persona: MockAuthPersona.DEV_A,
      }),
    },
  );
  assert(signIn.status === 200 || signIn.status === 201, 'mock sign-in');
  const token = signIn.body.session.accessToken;
  const auth = { Authorization: `Bearer ${token}` };

  const explore = await json<{ venues: ExploreVenue[] }>(
    `/explore/map?filter=VENUE&query=${encodeURIComponent('스크린골프')}&centerLat=37.5665&centerLng=126.9780`,
    { headers: auth },
  );
  assert(explore.status === 200, 'explore');
  assert(explore.body.venues.length > 0, 'explore venues');
  const hit = explore.body.venues[0];
  console.log(
    'explore_sample=',
    hit.name,
    'canCreateJoin=',
    hit.canCreateJoin,
    'source=',
    hit.source,
  );
  assert(hit.canCreateJoin === true, 'canCreateJoin expected true');

  const provider = hit.source === 'MOCK' ? 'MOCK' : 'KAKAO';
  const providerPlaceId = hit.providerPlaceId ?? hit.venueId;

  const bad = await json('/venues/activate', {
    method: 'POST',
    headers: auth,
    body: JSON.stringify({
      provider,
      providerPlaceId: 'no-such-place-id-000',
      resolveHint: {
        latitude: hit.latitude,
        longitude: hit.longitude,
        query: '스크린골프',
      },
    }),
  });
  assert(bad.status !== 500, 'invalid place must not 500');
  console.log('invalid_activate_status=', bad.status);

  const actBody = {
    provider,
    providerPlaceId,
    resolveHint: {
      latitude: hit.latitude,
      longitude: hit.longitude,
      query: hit.name,
    },
  };

  const act1 = await json<{ venueId: string; created: boolean; name: string }>(
    '/venues/activate',
    { method: 'POST', headers: auth, body: JSON.stringify(actBody) },
  );
  assert(act1.status === 200 || act1.status === 201, `activate ${act1.status}`);
  console.log('activate1=', act1.body.venueId, 'created=', act1.body.created);

  const act2 = await json<{ venueId: string; created: boolean }>('/venues/activate', {
    method: 'POST',
    headers: auth,
    body: JSON.stringify(actBody),
  });
  assert(act2.body.venueId === act1.body.venueId, 'idempotent venueId');
  assert(act2.body.created === false, 'second activate created=false');
  console.log('activate2_idempotent=ok');

  const [c1, c2] = await Promise.all([
    json<{ venueId: string }>('/venues/activate', {
      method: 'POST',
      headers: auth,
      body: JSON.stringify(actBody),
    }),
    json<{ venueId: string }>('/venues/activate', {
      method: 'POST',
      headers: auth,
      body: JSON.stringify(actBody),
    }),
  ]);
  assert(c1.body.venueId === c2.body.venueId, 'concurrent duplicate');
  console.log('concurrent_ok');

  const unauth = await json('/venues/activate', {
    method: 'POST',
    body: JSON.stringify({ provider, providerPlaceId }),
  });
  assert(unauth.status === 401, `expected 401 got ${unauth.status}`);

  const explore2 = await json<{ venues: ExploreVenue[] }>(
    `/explore/map?filter=VENUE&query=${encodeURIComponent(hit.name)}&centerLat=${hit.latitude}&centerLng=${hit.longitude}`,
    { headers: auth },
  );
  const matched = explore2.body.venues.find(
    (v) => v.venueId === hit.venueId || v.jjoinVenueId === act1.body.venueId,
  );
  console.log(
    'explore_merge=',
    matched?.jjoinVenueId ?? 'none',
    'isActivated=',
    matched?.isActivated,
  );

  console.log('SMOKE_PASS');
}

main().catch((e) => {
  console.error('SMOKE_FAIL', e instanceof Error ? e.message : e);
  process.exit(1);
});
