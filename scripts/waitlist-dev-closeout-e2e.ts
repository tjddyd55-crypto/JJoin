/**
 * Waitlist operational closeout — DEV API only (Railway development).
 *
 *   $env:API_BASE='https://api-development-e387.up.railway.app'
 *   pnpm exec tsx scripts/waitlist-dev-closeout-e2e.ts
 */
import {
  JoinMethod,
  MockAuthPersona,
  SCREEN_GOLF_CODE,
  SocialProvider,
} from '../packages/types/src/index.ts';

const API_BASE = process.env.API_BASE ?? 'https://api-development-e387.up.railway.app';
const WORKER_URL = `${API_BASE}/joins/waitlist/offers/process-expired`;
const TAG = 'waitlist-closeout';
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

async function cleanupBlockingHostedJoin(host: Auth) {
  const mine = await mustOk<{ hosted: Array<{ joinId: string; status: string }> }>(
    '/joins/mine',
    { headers: host },
  );
  const blocking = mine.hosted?.find((j) => ACTIVE_HOST_STATUSES.has(j.status));
  if (!blocking) return;
  console.log('cleanup hosted join', blocking.joinId);
  try {
    const detail = await mustOk<{
      participants: Array<{ participantId: string; role: string; participationStatus: string }>;
    }>(`/joins/${blocking.joinId}`, { headers: host });
    const nonHost = detail.participants.filter(
      (p) => p.role !== 'HOST' && p.participationStatus !== 'APPLIED',
    );
    await mustOk(`/joins/${blocking.joinId}/settlements/_qa/advance-clock`, {
      method: 'POST',
      headers: host,
      body: JSON.stringify({ mode: 'open' }),
    });
    if (nonHost.length > 0) {
      await mustOk(`/joins/${blocking.joinId}/settlements/finalize`, {
        method: 'POST',
        headers: host,
        body: JSON.stringify({
          attendance: nonHost.map((p) => ({ participantId: p.participantId, attended: false })),
        }),
      });
    }
  } catch (err) {
    console.warn('cleanup skip', err instanceof Error ? err.message : err);
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
    await cleanupBlockingHostedJoin(auth).catch(() => undefined);
    const mine = await mustOk<{ hosted: Array<{ status: string }> }>('/joins/mine', {
      headers: auth,
    });
    const active =
      mine.hosted?.filter((j) => ACTIVE_HOST_STATUSES.has(j.status)).length ?? 0;
    const preview = await mustOk<{ canCreate: boolean }>('/joins/coin-preview', {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({ plannedPlayerCount: 4, rewardPerParticipant: REWARD }),
    });
    if (active < 1 && preview.canCreate) return auth;
  }
  throw new Error('no eligible host');
}

async function createJoin(host: Auth, plannedPlayerCount: number) {
  return mustOk<{ joinId: string }>('/joins', {
    method: 'POST',
    headers: host,
    body: JSON.stringify({
      sportCode: SCREEN_GOLF_CODE,
      venue: {
        provider: 'MOCK',
        providerPlaceId: `venue_${TAG}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name: `Waitlist Closeout`,
        address: '거제시',
        regionLabel: '거제',
        latitude: 34.88,
        longitude: 128.62,
      },
      startAt: new Date(Date.now() + 6 * 60 * 60_000).toISOString(),
      plannedPlayerCount,
      joinMethod: JoinMethod.APPROVAL,
      title: `[${TAG}] cap ${plannedPlayerCount}`,
      rewardPerParticipant: REWARD,
      idempotencyKey: `${TAG}-${Date.now()}-${plannedPlayerCount}`,
    }),
  });
}

async function applyApprove(host: Auth, guest: Auth, joinId: string) {
  await mustOk(`/joins/${joinId}/apply`, { method: 'POST', headers: guest });
  const detail = await mustOk<{
    participants: Array<{ participantId: string; userId: string; participationStatus: string }>;
  }>(`/joins/${joinId}`, { headers: host });
  const applied = detail.participants.find(
    (p) => p.userId === guest.userId && p.participationStatus === 'APPLIED',
  );
  assert(applied, 'applied participant missing');
  await mustOk(`/joins/${joinId}/participants/${applied.participantId}/approve`, {
    method: 'POST',
    headers: host,
  });
}

async function decline(guest: Auth, joinId: string) {
  await mustOk(`/joins/${joinId}/attendance-intent`, {
    method: 'POST',
    headers: guest,
    body: JSON.stringify({ intent: 'DECLINED' }),
  });
}

async function myDetail(auth: Auth, joinId: string) {
  return mustOk<{
    myParticipation: {
      participationStatus: string;
      waitlistPosition?: number | null;
      offerExpiresAt?: string | null;
    } | null;
    confirmedPlayerCount: number;
    waitlistAvailable?: boolean;
  }>(`/joins/${joinId}`, { headers: auth });
}

async function runWorker(secret: string) {
  const res = await fetch(WORKER_URL, {
    method: 'POST',
    headers: {
      'x-settlement-cron-secret': secret,
      Authorization: `Bearer ${secret}`,
    },
  });
  const text = await res.text();
  return { status: res.status, body: text };
}

async function testCronAuth() {
  const noAuth = await fetch(WORKER_URL, { method: 'POST' });
  assert(noAuth.status === 401, `cron no-auth expected 401 got ${noAuth.status}`);
  const bad = await fetch(WORKER_URL, {
    method: 'POST',
    headers: { 'x-settlement-cron-secret': 'wrong-secret-value' },
  });
  assert(bad.status === 401, `cron bad-secret expected 401 got ${bad.status}`);
  console.log('cron auth guard OK');

  const secret = process.env.SETTLEMENT_CRON_SECRET?.trim();
  if (secret) {
    const ok = await runWorker(secret);
    assert(ok.status >= 200 && ok.status < 300, `cron ok secret ${ok.status} ${ok.body.slice(0, 120)}`);
    console.log('cron worker OK', ok.status);
  } else {
    console.log('SKIP cron ok-secret (SETTLEMENT_CRON_SECRET unset locally; use railway run)');
  }
}

async function testFifoAndCancel() {
  const host = await pickHost();
  const p1 = await signIn(MockAuthPersona.DEV_A);
  const p2 = await signIn(MockAuthPersona.DEV_C);
  const wlA = await signIn(MockAuthPersona.DEV_ADMIN);
  const wlB = await signIn(MockAuthPersona.DEV_BILLING_LOW);

  const { joinId } = await createJoin(host, 3);
  await applyApprove(host, p1, joinId);
  await applyApprove(host, p2, joinId);

  await mustOk(`/joins/${joinId}/waitlist`, { method: 'POST', headers: wlA });
  await mustOk(`/joins/${joinId}/waitlist`, { method: 'POST', headers: wlB });

  const posA = await myDetail(wlA, joinId);
  const posB = await myDetail(wlB, joinId);
  assert(posA.myParticipation?.waitlistPosition === 1, 'A position 1');
  assert(posB.myParticipation?.waitlistPosition === 2, 'B position 2');
  console.log('FIFO positions OK');

  await decline(p1, joinId);
  const offeredA = await myDetail(wlA, joinId);
  assert(offeredA.myParticipation?.participationStatus === 'OFFERED', 'A OFFERED');
  const stillB = await myDetail(wlB, joinId);
  assert(stillB.myParticipation?.participationStatus === 'WAITLISTED', 'B still WAITLISTED');

  await mustOk(`/joins/${joinId}/waitlist`, { method: 'DELETE', headers: wlA });
  const afterCancel = await myDetail(wlA, joinId);
  assert(
    afterCancel.myParticipation?.participationStatus === 'CANCELLED' ||
      afterCancel.myParticipation === null,
    'A cancelled',
  );
  const promotedB = await myDetail(wlB, joinId);
  assert(promotedB.myParticipation?.participationStatus === 'OFFERED', 'B OFFERED after A cancel');
  console.log('cancel OFFER -> next promotion OK');

  const dupCancel = await j(`/joins/${joinId}/waitlist`, { method: 'DELETE', headers: wlA });
  assert(dupCancel.status >= 400, 'duplicate cancel blocked');
}

async function testExpiry() {
  const host = await pickHost();
  const p1 = await signIn(MockAuthPersona.DEV_A);
  const p2 = await signIn(MockAuthPersona.DEV_C);
  const wlA = await signIn(MockAuthPersona.DEV_ADMIN);
  const wlB = await signIn(MockAuthPersona.DEV_BILLING_RETRY);

  const { joinId } = await createJoin(host, 3);
  await applyApprove(host, p1, joinId);
  await applyApprove(host, p2, joinId);
  await mustOk(`/joins/${joinId}/waitlist`, { method: 'POST', headers: wlA });
  await mustOk(`/joins/${joinId}/waitlist`, { method: 'POST', headers: wlB });

  await decline(p1, joinId);
  assert(
    (await myDetail(wlA, joinId)).myParticipation?.participationStatus === 'OFFERED',
    'A OFFERED before expiry',
  );

  await mustOk(`/joins/${joinId}/waitlist/_qa/expire-offer`, {
    method: 'POST',
    headers: host,
    body: JSON.stringify({ userId: wlA.userId }),
  });

  const secret = process.env.SETTLEMENT_CRON_SECRET?.trim();
  assert(secret, 'SETTLEMENT_CRON_SECRET required for expiry E2E (railway run --service api ...)');

  const run1 = await runWorker(secret);
  assert(run1.status >= 200 && run1.status < 300, `worker run1 ${run1.status}`);
  const parsed1 = JSON.parse(run1.body) as { expiredCount: number };
  assert(parsed1.expiredCount >= 1, 'expiredCount >= 1');

  const expiredA = await myDetail(wlA, joinId);
  assert(
    expiredA.myParticipation?.participationStatus === 'WAITLIST_EXPIRED',
    'A WAITLIST_EXPIRED',
  );
  const offeredB = await myDetail(wlB, joinId);
  assert(offeredB.myParticipation?.participationStatus === 'OFFERED', 'B OFFERED after expiry');
  assert(offeredB.myParticipation?.offerExpiresAt, 'B offerExpiresAt set');

  const run2 = await runWorker(secret);
  const parsed2 = JSON.parse(run2.body) as { expiredCount: number };
  assert(parsed2.expiredCount === 0, 'idempotent worker expiredCount 0');
  console.log('expiry worker OK');
}

async function testTwoSeatPromotion() {
  const host = await pickHost();
  const p1 = await signIn(MockAuthPersona.DEV_A);
  const p2 = await signIn(MockAuthPersona.DEV_C);
  const p3 = await signIn(MockAuthPersona.DEV_BILLING_LOW);
  const wlA = await signIn(MockAuthPersona.DEV_ADMIN);
  const wlB = await signIn(MockAuthPersona.DEV_BILLING_RETRY);

  const { joinId } = await createJoin(host, 4);
  await applyApprove(host, p1, joinId);
  await applyApprove(host, p2, joinId);
  await applyApprove(host, p3, joinId);

  await mustOk(`/joins/${joinId}/waitlist`, { method: 'POST', headers: wlA });
  await mustOk(`/joins/${joinId}/waitlist`, { method: 'POST', headers: wlB });

  let wlC: Auth | null = null;
  const devB = await signIn(MockAuthPersona.DEV_B);
  if (devB.userId !== host.userId) {
    wlC = devB;
    await mustOk(`/joins/${joinId}/waitlist`, { method: 'POST', headers: wlC });
  }

  await decline(p1, joinId);
  await decline(p2, joinId);

  const a = await myDetail(wlA, joinId);
  const b = await myDetail(wlB, joinId);
  assert(a.myParticipation?.participationStatus === 'OFFERED', 'two-seat A OFFERED');
  assert(b.myParticipation?.participationStatus === 'OFFERED', 'two-seat B OFFERED');
  if (wlC) {
    const c = await myDetail(wlC, joinId);
    assert(c.myParticipation?.participationStatus === 'WAITLISTED', 'two-seat C WAITLISTED');
  }

  const detail = await mustOk<{ confirmedPlayerCount: number }>(`/joins/${joinId}`, {
    headers: host,
  });
  assert(detail.confirmedPlayerCount <= 4, 'capacity invariant two-seat');
  console.log('two-seat promotion OK');
}

async function main() {
  console.log('API_BASE=', API_BASE);
  const health = await mustOk<{ status: string; appVariant?: string }>('/health');
  console.log('health', health.appVariant);

  await testCronAuth();
  await testFifoAndCancel();
  await testExpiry();
  await testTwoSeatPromotion();

  console.log('WAITLIST_DEV_CLOSEOUT_E2E_PASS');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
