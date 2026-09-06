/**
 * Waitlist DEV API E2E — Railway development only.
 *
 *   $env:API_BASE='https://api-development-e387.up.railway.app'
 *   pnpm exec tsx scripts/waitlist-dev-e2e.ts
 */
import { JoinMethod, MockAuthPersona, SCREEN_GOLF_CODE, SocialProvider } from '../packages/types/src/index.ts';

const API_BASE = process.env.API_BASE ?? 'https://api-development-e387.up.railway.app';
const TAG = 'waitlist-e2e';
const REWARD = '20';

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
  assert(status >= 200 && status < 300, `${path} -> ${status} ${raw.slice(0, 300)}`);
  return body;
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

async function main() {
  console.log('API_BASE=', API_BASE);
  const health = await mustOk<{ status: string; database: string; appVariant?: string }>('/health');
  console.log('health OK', health.appVariant);

  const host = await signIn(MockAuthPersona.DEV_B);
  const p1 = await signIn(MockAuthPersona.DEV_A);
  const p2 = await signIn(MockAuthPersona.DEV_C);
  const wl = await signIn(MockAuthPersona.DEV_ADMIN);

  const created = await mustOk<{ joinId: string; plannedPlayerCount: number }>('/joins', {
    method: 'POST',
    headers: host,
    body: JSON.stringify({
      sportCode: SCREEN_GOLF_CODE,
      venue: {
        provider: 'MOCK',
        providerPlaceId: `venue_${TAG}_${Date.now()}`,
        name: `Waitlist E2E`,
        address: '거제시',
        regionLabel: '거제',
        latitude: 34.88,
        longitude: 128.62,
      },
      startAt: new Date(Date.now() + 4 * 60 * 60_000).toISOString(),
      plannedPlayerCount: 2,
      joinMethod: JoinMethod.APPROVAL,
      title: `[${TAG}] capacity 2`,
      rewardPerParticipant: REWARD,
      idempotencyKey: `${TAG}-${Date.now()}`,
    }),
  });
  const joinId = created.joinId;
  console.log('join', joinId);

  await applyApprove(host, p1, joinId);
  await applyApprove(host, p2, joinId);

  const full = await mustOk<{
    status: string;
    waitlistAvailable?: boolean;
    confirmedPlayerCount: number;
    availableSlots: number;
  }>(`/joins/${joinId}`, { headers: wl });
  assert(full.confirmedPlayerCount >= 2, 'join should be full');
  assert(full.waitlistAvailable === true, 'waitlistAvailable expected true');
  console.log('full join OK', full.status, full.availableSlots);

  await mustOk(`/joins/${joinId}/waitlist`, { method: 'POST', headers: wl });
  const afterWl = await mustOk<{
    myParticipation: {
      participationStatus: string;
      waitlistPosition?: number | null;
    } | null;
  }>(`/joins/${joinId}`, { headers: wl });
  assert(afterWl.myParticipation?.participationStatus === 'WAITLISTED', 'WAITLISTED');
  assert(afterWl.myParticipation?.waitlistPosition === 1, `position ${afterWl.myParticipation?.waitlistPosition}`);
  console.log('waitlist position 1 OK');

  const dup = await j(`/joins/${joinId}/waitlist`, { method: 'POST', headers: wl });
  assert(dup.status === 409 || dup.raw.includes('already_waitlisted'), 'duplicate blocked');
  console.log('duplicate waitlist blocked OK');

  const hostList = await mustOk<{ total: number; items: unknown[] }>(`/joins/${joinId}/waitlist`, {
    headers: host,
  });
  assert(hostList.total >= 1, 'host waitlist list');
  console.log('host waitlist list OK', hostList.total);

  const cross = await j(`/joins/${joinId}/waitlist`, { method: 'DELETE', headers: p1 });
  assert(cross.status >= 400, 'cross-user cancel blocked');
  console.log('security cross-cancel OK');

  await mustOk(`/joins/${joinId}/attendance-intent`, {
    method: 'POST',
    headers: p1,
    body: JSON.stringify({ intent: 'DECLINED' }),
  });

  const offered = await mustOk<{
    myParticipation: { participationStatus: string; offerExpiresAt?: string | null } | null;
  }>(`/joins/${joinId}`, { headers: wl });
  assert(offered.myParticipation?.participationStatus === 'OFFERED', 'OFFERED after seat release');
  assert(offered.myParticipation?.offerExpiresAt, 'offerExpiresAt set');
  console.log('seat release -> OFFERED OK');

  await mustOk(`/joins/${joinId}/waitlist/accept`, { method: 'POST', headers: wl });
  const promoted = await mustOk<{
    myParticipation: { participationStatus: string } | null;
    confirmedPlayerCount: number;
  }>(`/joins/${joinId}`, { headers: wl });
  assert(promoted.myParticipation?.participationStatus === 'APPROVED', 'APPROVED after accept');
  assert(promoted.confirmedPlayerCount <= 2, 'capacity invariant');
  console.log('accept -> APPROVED OK', promoted.confirmedPlayerCount);

  const dupAccept = await j(`/joins/${joinId}/waitlist/accept`, { method: 'POST', headers: wl });
  assert(dupAccept.status < 300 || dupAccept.raw.includes('no_active_offer'), 'duplicate accept idempotent');
  console.log('duplicate accept OK');

  const secret = process.env.SETTLEMENT_CRON_SECRET?.trim();
  if (secret) {
    const worker = await fetch(`${API_BASE}/joins/waitlist/offers/process-expired`, {
      method: 'POST',
      headers: { 'x-settlement-cron-secret': secret, Authorization: `Bearer ${secret}` },
    });
    console.log('worker endpoint', worker.status, (await worker.text()).slice(0, 120));
  } else {
    console.log('SKIP worker auth test (SETTLEMENT_CRON_SECRET unset locally)');
  }

  console.log('WAITLIST_DEV_API_E2E_PASS');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
