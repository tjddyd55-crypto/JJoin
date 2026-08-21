/**
 * Phase G presence smoke against a running API (local or Railway).
 * Usage:
 *   $env:API_BASE='https://api-production-2d67e.up.railway.app'
 *   node --import tsx scripts/phase-g-presence-smoke.ts
 *
 * Does not print secrets, tokens, or exact GPS.
 *
 * One-device QA helper: leaves DEV_A AVAILABLE at QA coords so Android DEV_B
 * can discover the marker. Pass CLEANUP=1 to hide after assertions.
 */
import { MockAuthPersona, SocialProvider } from '../packages/types/src/index.ts';

const API_BASE = process.env.API_BASE ?? 'http://127.0.0.1:3000';
const CLEANUP = process.env.CLEANUP === '1';

/** Public QA coordinate near mock Geoje venues — not a real user home. */
const QA = { latitude: 34.8806, longitude: 128.6211 };

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
  if (!res.ok) {
    throw new Error(`${path} -> ${res.status} ${text.slice(0, 160)}`);
  }
  return JSON.parse(text) as T;
}

function assertNoExactGps(payload: unknown) {
  const raw = JSON.stringify(payload);
  const forbidden = [
    '"latitude"',
    '"longitude"',
    '"lat"',
    '"lng"',
    'birthDate',
    'phoneEncrypted',
    'ciHash',
    'verifiedNameMasked',
    'providerVerificationId',
  ];
  for (const key of forbidden) {
    if (raw.includes(key)) {
      throw new Error(`privacy_leak:${key}`);
    }
  }
}

async function signIn(persona: MockAuthPersona) {
  return json<{
    session: { accessToken: string; userId: string };
    me: { userId: string; publicProfile: { nickname: string } | null };
  }>('/auth/social/mock-sign-in', {
    method: 'POST',
    body: JSON.stringify({ provider: SocialProvider.KAKAO, persona }),
  });
}

async function main() {
  console.log('API_BASE=', API_BASE);
  const health = await json<{ status: string; database: string }>('/health');
  console.log('health=', health.status, health.database);

  const a = await signIn(MockAuthPersona.DEV_A);
  const b = await signIn(MockAuthPersona.DEV_B);
  console.log('DEV_A=', a.me.publicProfile?.nickname, 'DEV_B=', b.me.publicProfile?.nickname);

  await json('/me/presence', {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${a.session.accessToken}` },
  });

  const on = await json<{
    visibility: string;
    availableUntil: string | null;
    hasLocation: boolean;
  }>('/me/presence', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${a.session.accessToken}` },
    body: JSON.stringify({
      latitude: QA.latitude,
      longitude: QA.longitude,
      accuracyMeters: 25,
      duration: '1h',
    }),
  });
  if (on.visibility !== 'AVAILABLE' || !on.availableUntil || !on.hasLocation) {
    throw new Error('presence_on_failed');
  }
  console.log('A presence=AVAILABLE');

  const mine = await json<Record<string, unknown>>('/me/presence', {
    headers: { Authorization: `Bearer ${a.session.accessToken}` },
  });
  if ('latitude' in mine || 'longitude' in mine) {
    throw new Error('private_presence_leaks_coords');
  }

  const mapB = await json<{
    users: Array<{
      userId: string;
      nickname: string;
      displayLat: number;
      displayLng: number;
      approxDistanceMeters: number;
    }>;
    metadata: { userCount: number; source: string };
  }>(
    `/explore/map?filter=USER&centerLat=${QA.latitude}&centerLng=${QA.longitude}`,
    { headers: { Authorization: `Bearer ${b.session.accessToken}` } },
  );
  assertNoExactGps(mapB);
  const found = mapB.users.find((u) => u.userId === a.session.userId);
  if (!found) throw new Error('B_did_not_discover_A');
  if (found.displayLat === QA.latitude && found.displayLng === QA.longitude) {
    throw new Error('display_equals_exact_gps');
  }
  console.log('B discovered A nickname=', found.nickname, 'users=', mapB.metadata.userCount);

  const mapA = await json<{ users: Array<{ userId: string }> }>(
    `/explore/map?filter=USER&centerLat=${QA.latitude}&centerLng=${QA.longitude}`,
    { headers: { Authorization: `Bearer ${a.session.accessToken}` } },
  );
  if (mapA.users.some((u) => u.userId === a.session.userId)) {
    throw new Error('self_not_excluded');
  }
  console.log('self_exclusion=ok');

  await json('/auth/logout', {
    method: 'POST',
    headers: { Authorization: `Bearer ${a.session.accessToken}` },
  });
  const a2 = await signIn(MockAuthPersona.DEV_A);
  const afterLogout = await json<{ visibility: string }>('/me/presence', {
    headers: { Authorization: `Bearer ${a2.session.accessToken}` },
  });
  if (afterLogout.visibility !== 'HIDDEN') {
    throw new Error('logout_did_not_hide');
  }
  const mapAfterLogout = await json<{ users: Array<{ userId: string }> }>(
    `/explore/map?filter=USER&centerLat=${QA.latitude}&centerLng=${QA.longitude}`,
    { headers: { Authorization: `Bearer ${b.session.accessToken}` } },
  );
  if (mapAfterLogout.users.some((u) => u.userId === a.session.userId)) {
    throw new Error('hidden_still_nearby');
  }
  console.log('logout_hide=ok');

  // Re-activate A for Android one-device nearby QA (unless CLEANUP)
  const reOn = await json<{ visibility: string }>('/me/presence', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${a2.session.accessToken}` },
    body: JSON.stringify({
      latitude: QA.latitude,
      longitude: QA.longitude,
      accuracyMeters: 25,
      duration: '2h',
    }),
  });
  if (reOn.visibility !== 'AVAILABLE') throw new Error('reactivate_failed');

  // Expired fixture via direct DELETE then we only assert hide path above.
  // Expiration is query-time; short-lived PUT + wait is too slow for smoke.
  // Mark: expired coverage lives in unit tests + optional EXPIRED_FIXTURE admin later.

  if (CLEANUP) {
    await json('/me/presence', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${a2.session.accessToken}` },
    });
    console.log('cleanup=HIDDEN');
  } else {
    console.log('A left AVAILABLE for Android DEV_B nearby QA (set CLEANUP=1 to hide)');
  }

  console.log('SMOKE_PASS');
}

main().catch((e) => {
  console.error('SMOKE_FAIL', e instanceof Error ? e.message : e);
  process.exit(1);
});
