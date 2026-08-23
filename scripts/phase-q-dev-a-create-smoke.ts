/**
 * Phase Q — DEV_A activate + create join (verified persona).
 */
import { MockAuthPersona, SocialProvider } from '../packages/types/src/index.ts';

const API = process.env.API_BASE ?? 'https://api-production-2d67e.up.railway.app';

async function j<T>(path: string, init?: RequestInit): Promise<{ status: number; body: T }> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  const text = await res.text();
  return { status: res.status, body: JSON.parse(text) as T };
}

async function main() {
  console.log('API=', API);
  const sign = await j<{ session: { accessToken: string } }>('/auth/social/mock-sign-in', {
    method: 'POST',
    body: JSON.stringify({
      provider: SocialProvider.KAKAO,
      persona: MockAuthPersona.DEV_A,
    }),
  });
  if (sign.status >= 300) throw new Error(`sign-in ${sign.status}`);
  const auth = { Authorization: `Bearer ${sign.body.session.accessToken}` };

  const me = await j<{ identity?: { verificationStatus?: string }; profile?: { nickname?: string } }>(
    '/me',
    { headers: auth },
  );
  console.log('me', me.body.profile?.nickname, me.body.identity?.verificationStatus);

  const explore = await j<{
    venues: Array<{
      venueId: string;
      name: string;
      providerPlaceId?: string;
      latitude: number;
      longitude: number;
      openJoinCount?: number;
      jjoinVenueId?: string | null;
    }>;
  }>(
    `/explore/map?filter=VENUE&query=${encodeURIComponent('스크린골프')}&centerLat=34.88&centerLng=128.62`,
    { headers: auth },
  );
  const hit = explore.body.venues[0];
  if (!hit) throw new Error('no venue');
  console.log('hit', hit.name);

  const act = await j<{ venueId: string; created: boolean }>('/venues/activate', {
    method: 'POST',
    headers: auth,
    body: JSON.stringify({
      provider: 'KAKAO',
      providerPlaceId: hit.providerPlaceId ?? hit.venueId,
      resolveHint: {
        latitude: hit.latitude,
        longitude: hit.longitude,
        query: hit.name,
      },
    }),
  });
  console.log('activate', act.status, act.body);

  const start = new Date(Date.now() + 3 * 3600_000);
  start.setMinutes(0, 0, 0);
  const created = await j<{ joinId?: string; status?: string; message?: string }>('/joins', {
    method: 'POST',
    headers: auth,
    body: JSON.stringify({
      sportCode: 'SCREEN_GOLF',
      venueId: act.body.venueId,
      startAt: start.toISOString(),
      plannedPlayerCount: 4,
      joinMethod: 'APPROVAL',
      title: `${hit.name} PhaseQ`,
      idempotencyKey: `phase-q-create-${Date.now()}`,
    }),
  });
  console.log('create', created.status, created.body);

  const explore2 = await j<{ venues: typeof explore.body.venues }>(
    `/explore/map?filter=VENUE&query=${encodeURIComponent(hit.name)}&centerLat=${hit.latitude}&centerLng=${hit.longitude}`,
    { headers: auth },
  );
  const matched = explore2.body.venues.find(
    (v) => v.venueId === hit.venueId || v.jjoinVenueId === act.body.venueId,
  );
  console.log('merge openJoinCount=', matched?.openJoinCount, 'jjoinVenueId=', matched?.jjoinVenueId);

  if (created.status >= 300) process.exit(1);
  if (!matched?.jjoinVenueId) process.exit(1);
  console.log('CREATE_FLOW_PASS');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
