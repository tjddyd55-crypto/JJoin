/**
 * Golf friends lifecycle + join member conditions — Railway Development only.
 *
 *   $env:API_BASE='https://api-development-e387.up.railway.app'
 *   pnpm exec tsx scripts/golf-friends-join-conditions-dev-e2e.ts
 */
import {
  JoinMethod,
  JoinPreferredGender,
  MockAuthPersona,
  SCREEN_GOLF_CODE,
  SocialProvider,
  type GolfFriendRelationship,
} from '../packages/types/src/index.ts';
import { localDayKey } from '../packages/domain/src/index.ts';

const API_BASE = process.env.API_BASE ?? 'https://api-development-e387.up.railway.app';
const TAG = 'gf-join-cond-e2e';
const REWARD = '20';
const ACTIVE_HOST_STATUSES = new Set(['OPEN', 'FULL', 'CONFIRMED', 'IN_PROGRESS']);

type Auth = { Authorization: string; userId: string };

async function j<T>(path: string, init?: RequestInit) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  const raw = await res.text();
  let body = {} as T;
  try {
    body = JSON.parse(raw) as T;
  } catch {
    /* empty */
  }
  return { status: res.status, body, raw };
}

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

async function signIn(persona: MockAuthPersona): Promise<Auth> {
  const { status, body } = await j<{ session: { accessToken: string; userId: string } }>(
    '/auth/social/mock-sign-in',
    { method: 'POST', body: JSON.stringify({ provider: SocialProvider.KAKAO, persona }) },
  );
  assert(status >= 200 && status < 300, `signIn ${persona} ${status}`);
  return { Authorization: `Bearer ${body.session.accessToken}`, userId: body.session.userId };
}

async function mustOk<T>(path: string, init?: RequestInit): Promise<T> {
  const { status, body, raw } = await j<T>(path, init);
  assert(status >= 200 && status < 300, `${path} -> ${status} ${raw.slice(0, 400)}`);
  return body;
}

async function mustFail(path: string, init?: RequestInit, codes = [400, 403, 404, 409]) {
  const { status, raw } = await j(path, init);
  assert(codes.includes(status), `${path} expected failure got ${status} ${raw.slice(0, 200)}`);
  return status;
}

async function relationshipOf(viewer: Auth, targetUserId: string): Promise<GolfFriendRelationship> {
  const res = await mustOk<{ items: Array<{ user: { id: string }; relationship: GolfFriendRelationship }> }>(
    '/golf-friends/recommended',
    { headers: viewer },
  );
  const hit = res.items.find((i) => i.user.id === targetUserId);
  if (hit) return hit.relationship;

  const popular = await mustOk<{ items: Array<{ user: { id: string }; relationship: GolfFriendRelationship }> }>(
    '/golf-friends/popular',
    { headers: viewer },
  );
  const hit2 = popular.items.find((i) => i.user.id === targetUserId);
  return hit2?.relationship ?? 'NONE';
}

async function resetFriendship(a: Auth, b: Auth) {
  const relA = await relationshipOf(a, b.userId);
  if (relA === 'FRIENDS') {
    await mustOk(`/golf-friends/${b.userId}`, { method: 'DELETE', headers: a });
  } else if (relA === 'REQUESTED') {
    await mustOk(`/golf-friends/${b.userId}/request`, { method: 'DELETE', headers: a });
  } else if (relA === 'RECEIVED') {
    await mustOk(`/golf-friends/${a.userId}/reject`, { method: 'POST', headers: b });
  }
}

async function unreadCount(auth: Auth): Promise<number> {
  const res = await mustOk<{ unreadCount: number }>('/me/notifications/unread-count', {
    headers: auth,
  });
  return res.unreadCount ?? 0;
}

async function cleanupBlockingHostedJoin(host: Auth) {
  const mine = await mustOk<{
    hosted: Array<{ joinId: string; status: string }>;
  }>('/joins/mine', { headers: host });
  const blocking = mine.hosted?.find((j) => ACTIVE_HOST_STATUSES.has(j.status));
  if (!blocking) return;

  console.log('cleanup blocking hosted join', blocking.joinId, blocking.status);
  const detail = await mustOk<{
    participants: Array<{ participantId: string; role: string; participationStatus: string }>;
  }>(`/joins/${blocking.joinId}`, { headers: host });

  const applied = detail.participants.find(
    (p) => p.role !== 'HOST' && p.participationStatus === 'APPLIED',
  );
  if (applied) {
    await mustOk(`/joins/${blocking.joinId}/participants/${applied.participantId}/approve`, {
      method: 'POST',
      headers: host,
    });
  }

  await mustOk(`/joins/${blocking.joinId}/settlements/_qa/advance-clock`, {
    method: 'POST',
    headers: host,
    body: JSON.stringify({ mode: 'open' }),
  });

  const approved = await mustOk<{
    participants: Array<{ participantId: string; role: string; participationStatus: string }>;
  }>(`/joins/${blocking.joinId}`, { headers: host });
  const nonHost = approved.participants.filter(
    (p) => p.role !== 'HOST' && !['APPLIED', 'CANCELLED'].includes(p.participationStatus),
  );
  if (nonHost.length > 0) {
    await mustOk(`/joins/${blocking.joinId}/settlements/finalize`, {
      method: 'POST',
      headers: host,
      body: JSON.stringify({
        attendance: nonHost.map((p) => ({ participantId: p.participantId, attended: false })),
      }),
    });
  }
}

async function pickHost(): Promise<Auth> {
  for (const persona of [
    MockAuthPersona.DEV_B,
    MockAuthPersona.DEV_A,
    MockAuthPersona.DEV_C,
    MockAuthPersona.DEV_ADMIN,
  ]) {
    const auth = await signIn(persona);
    try {
      await cleanupBlockingHostedJoin(auth);
    } catch (err) {
      console.warn(`cleanup failed for ${persona}:`, err instanceof Error ? err.message : err);
    }
    const preview = await mustOk<{ canCreate: boolean }>('/joins/coin-preview', {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({ plannedPlayerCount: 3, rewardPerParticipant: REWARD }),
    });
    if (preview.canCreate) return auth;
  }
  throw new Error('no host with coin for join create');
}

async function main() {
  console.log('API_BASE=', API_BASE);
  const health = await mustOk<{ status: string; database: string; appVariant?: string }>('/health');
  console.log('health', health.status, health.database, health.appVariant);

  const devA = await signIn(MockAuthPersona.DEV_A);
  const devB = await signIn(MockAuthPersona.DEV_B);
  const devC = await signIn(MockAuthPersona.DEV_C);

  await resetFriendship(devA, devB);
  await resetFriendship(devB, devA);

  // CASE 1 request
  const req1 = await mustOk<{ relationship: GolfFriendRelationship }>(
    `/golf-friends/${devB.userId}/request`,
    { method: 'POST', headers: devA },
  );
  assert(req1.relationship === 'REQUESTED', 'A should see REQUESTED');
  const relB = await relationshipOf(devB, devA.userId);
  assert(relB === 'RECEIVED', 'B should see RECEIVED');

  // CASE 3 duplicate request idempotent
  const dup = await mustOk<{ relationship: GolfFriendRelationship }>(
    `/golf-friends/${devB.userId}/request`,
    { method: 'POST', headers: devA },
  );
  assert(dup.relationship === 'REQUESTED', 'duplicate request stays REQUESTED');

  // CASE 7 self request
  await mustFail(`/golf-friends/${devA.userId}/request`, { method: 'POST', headers: devA }, [400]);

  // notification on request
  const unreadBBefore = await unreadCount(devB);
  // already sent on first request; duplicate should not add another eventKey row

  // CASE 2 accept
  const accept = await mustOk<{ relationship: GolfFriendRelationship }>(
    `/golf-friends/${devA.userId}/accept`,
    { method: 'POST', headers: devB },
  );
  assert(accept.relationship === 'FRIENDS', 'accept -> FRIENDS');
  assert(await relationshipOf(devA, devB.userId) === 'FRIENDS', 'A friends');
  assert(await relationshipOf(devB, devA.userId) === 'FRIENDS', 'B friends');

  const unreadAAfterAccept = await unreadCount(devA);
  console.log('notifications unread B before', unreadBBefore, 'A after accept', unreadAAfterAccept);

  // CASE 4 unfriend
  await mustOk(`/golf-friends/${devB.userId}`, { method: 'DELETE', headers: devA });
  assert(await relationshipOf(devA, devB.userId) === 'NONE', 'unfriend A');
  assert(await relationshipOf(devB, devA.userId) === 'NONE', 'unfriend B');

  // CASE 5 reject
  await mustOk(`/golf-friends/${devB.userId}/request`, { method: 'POST', headers: devA });
  await mustOk(`/golf-friends/${devA.userId}/reject`, { method: 'POST', headers: devB });
  assert(await relationshipOf(devA, devB.userId) === 'NONE', 'reject A');
  assert(await relationshipOf(devB, devA.userId) === 'NONE', 'reject B');

  // CASE 6 cancel
  await mustOk(`/golf-friends/${devB.userId}/request`, { method: 'POST', headers: devA });
  await mustOk(`/golf-friends/${devB.userId}/request`, { method: 'DELETE', headers: devA });
  assert(await relationshipOf(devA, devB.userId) === 'NONE', 'cancel A');
  assert(await relationshipOf(devB, devA.userId) === 'NONE', 'cancel B');

  // CASE 8 IDOR — C cannot accept A->B pending
  await mustOk(`/golf-friends/${devB.userId}/request`, { method: 'POST', headers: devA });
  await mustFail(`/golf-friends/${devA.userId}/accept`, { method: 'POST', headers: devC }, [403, 404]);
  await mustOk(`/golf-friends/${devB.userId}/request`, { method: 'DELETE', headers: devA });

  console.log('friendship lifecycle PASS');

  const host = await pickHost();
  const created = await mustOk<{
    joinId: string;
    preferredGender: JoinPreferredGender | null;
    minAge: number | null;
    maxAge: number | null;
  }>('/joins', {
    method: 'POST',
    headers: host,
    body: JSON.stringify({
      sportCode: SCREEN_GOLF_CODE,
      venue: {
        provider: 'MOCK',
        providerPlaceId: `venue_${TAG}_${Date.now()}`,
        name: `[${TAG}] member prefs`,
        address: '서울',
        regionLabel: '서울',
        latitude: 37.56,
        longitude: 126.97,
      },
      startAt: new Date(Date.now() + 6 * 60 * 60_000).toISOString(),
      plannedPlayerCount: 3,
      joinMethod: JoinMethod.APPROVAL,
      title: `[${TAG}] female 30-45`,
      rewardPerParticipant: REWARD,
      preferredGender: JoinPreferredGender.FEMALE,
      minAge: 30,
      maxAge: 45,
      idempotencyKey: `${TAG}-${Date.now()}`,
    }),
  });

  assert(created.preferredGender === JoinPreferredGender.FEMALE, 'create gender');
  assert(created.minAge === 30 && created.maxAge === 45, 'create age range');

  const detail = await mustOk<{
    startAt: string;
    preferredGender: JoinPreferredGender | null;
    minAge: number | null;
    maxAge: number | null;
  }>(`/joins/${created.joinId}`, { headers: host });
  assert(detail.preferredGender === JoinPreferredGender.FEMALE, 'detail gender');
  assert(detail.minAge === 30 && detail.maxAge === 45, 'detail age');

  const date = localDayKey(new Date(detail.startAt));
  const discover = await mustOk<{
    ongoing: Array<{ joinId: string; preferredGender?: string | null; minAge?: number | null; maxAge?: number | null }>;
    upcoming: Array<{ joinId: string; preferredGender?: string | null; minAge?: number | null; maxAge?: number | null }>;
  }>(`/joins/discover?date=${date}&lat=37.56&lng=126.97&regionMode=NEARBY&radiusMeters=100000&joinability=ALL`, { headers: devC });
  const card = [...discover.ongoing, ...discover.upcoming].find((c) => c.joinId === created.joinId);
  assert(card, 'discover card present');
  assert(card?.preferredGender === JoinPreferredGender.FEMALE, 'discover gender');
  assert(card?.minAge === 30 && card?.maxAge === 45, 'discover age');

  console.log('join member conditions PASS');
  console.log('GOLF_FRIENDS_JOIN_CONDITIONS_DEV_E2E_PASS');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
