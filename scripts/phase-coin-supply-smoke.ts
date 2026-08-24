/**
 * Coin Supply / Issuance smoke — local or Railway.
 *
 * Usage:
 *   $env:API_BASE='http://127.0.0.1:3000'
 *   pnpm exec tsx scripts/phase-coin-supply-smoke.ts
 *
 * Never prints tokens.
 */
import {
  CoinIssuanceType,
  JoinMethod,
  MockAuthPersona,
  SocialProvider,
  SCREEN_GOLF_CODE,
} from '../packages/types/src/index.ts';

const API_BASE = process.env.API_BASE ?? 'http://127.0.0.1:3000';

async function req<T>(path: string, init?: RequestInit): Promise<{ status: number; body: T; raw: string }> {
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

async function ok<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await req<T>(path, init);
  if (r.status < 200 || r.status >= 300) {
    throw new Error(`${path} -> ${r.status} ${r.raw.slice(0, 280)}`);
  }
  return r.body;
}

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

function bearer(token: string) {
  return { Authorization: `Bearer ${token}` };
}

async function signIn(persona: MockAuthPersona) {
  return ok<{ session: { accessToken: string; userId: string } }>('/auth/social/mock-sign-in', {
    method: 'POST',
    body: JSON.stringify({ provider: SocialProvider.KAKAO, persona }),
  });
}

async function main() {
  console.log('API_BASE=', API_BASE);
  await ok('/health');

  const admin = await signIn(MockAuthPersona.DEV_ADMIN);
  const a = await signIn(MockAuthPersona.DEV_A);
  const b = await signIn(MockAuthPersona.DEV_B);

  const before = await ok<{
    kpi: {
      totalIssued: string;
      totalBurned: string;
      totalAvailable: string;
      totalHeld: string;
      currentSupply: string;
      identityOk: boolean;
    };
  }>('/admin/coin/supply', { headers: bearer(admin.session.accessToken) });
  console.log('BEFORE', before.kpi);

  // Case 1+7: PURCHASE-like admin event + idempotent retry
  const key = `smoke-purchase:${a.session.userId}:1000`;
  const issue1 = await ok<{ issuanceId: string; alreadyExists: boolean }>(
    '/admin/coin/issuances',
    {
      method: 'POST',
      headers: bearer(admin.session.accessToken),
      body: JSON.stringify({
        userId: a.session.userId,
        amount: '1000',
        issuanceType: CoinIssuanceType.EVENT_REWARD,
        reason: 'smoke purchase-shaped event',
        idempotencyKey: key,
        referenceType: 'SMOKE',
        referenceId: 'ORDER-SMOKE-001',
      }),
    },
  );
  const issue1b = await ok<{ alreadyExists: boolean }>('/admin/coin/issuances', {
    method: 'POST',
    headers: bearer(admin.session.accessToken),
    body: JSON.stringify({
      userId: a.session.userId,
      amount: '1000',
      issuanceType: CoinIssuanceType.EVENT_REWARD,
      reason: 'smoke purchase-shaped event',
      idempotencyKey: key,
    }),
  });
  assert(issue1b.alreadyExists === true, 'duplicate issuance must be idempotent');

  // Case 2: EVENT +100 to B
  await ok('/admin/coin/issuances', {
    method: 'POST',
    headers: bearer(admin.session.accessToken),
    body: JSON.stringify({
      userId: b.session.userId,
      amount: '100',
      issuanceType: CoinIssuanceType.EVENT_REWARD,
      reason: 'smoke event',
      idempotencyKey: `smoke-event:${b.session.userId}:${Date.now()}`,
    }),
  });

  // Case 3–5: create join (fee burn + hold) then pay transfer
  const created = await ok<{ joinId: string }>('/joins', {
    method: 'POST',
    headers: bearer(a.session.accessToken),
    body: JSON.stringify({
      sportCode: SCREEN_GOLF_CODE,
      venue: {
        provider: 'MOCK',
        providerPlaceId: `venue_supply_${Date.now()}`,
        name: 'Supply Smoke Venue',
        address: '거제시',
        regionLabel: '거제시',
        latitude: 34.88,
        longitude: 128.62,
      },
      startAt: new Date(Date.now() + 2 * 60 * 60_000).toISOString(),
      plannedPlayerCount: 4,
      joinMethod: JoinMethod.APPROVAL,
      title: 'Supply Smoke',
      rewardPerParticipant: '100',
      idempotencyKey: `supply-smoke-join-${Date.now()}`,
    }),
  });

  const applied = await ok<{ myParticipation: { participantId: string } }>(
    `/joins/${created.joinId}/apply`,
    { method: 'POST', headers: bearer(b.session.accessToken) },
  );
  const pid = applied.myParticipation.participantId;
  await ok(`/joins/${created.joinId}/participants/${pid}/approve`, {
    method: 'POST',
    headers: bearer(a.session.accessToken),
  });
  await ok(`/joins/${created.joinId}/settlements/_qa/advance-clock`, {
    method: 'POST',
    headers: bearer(a.session.accessToken),
    body: JSON.stringify({ mode: 'open' }),
  });
  await ok(`/joins/${created.joinId}/settlements/${pid}/pay`, {
    method: 'POST',
    headers: bearer(a.session.accessToken),
  });

  const after = await ok<{
    kpi: {
      totalIssued: string;
      totalBurned: string;
      identityOk: boolean;
      currentSupply: string;
    };
  }>('/admin/coin/supply', { headers: bearer(admin.session.accessToken) });

  const recon = await ok<{ ok: boolean; delta: string }>('/admin/coin/supply/reconcile', {
    headers: bearer(admin.session.accessToken),
  });

  console.log('AFTER', after.kpi);
  console.log('RECON', recon);
  assert(recon.ok === true, `supply identity mismatch delta=${recon.delta}`);
  assert(after.kpi.identityOk === true, 'kpi identityOk false');

  const userA = await ok<{
    lifetimeIssuedReceived: string;
    lifetimeTransferReceived: string;
  }>(`/admin/coin/users/${a.session.userId}`, {
    headers: bearer(admin.session.accessToken),
  });
  const userB = await ok<{
    lifetimeIssuedReceived: string;
    lifetimeTransferReceived: string;
  }>(`/admin/coin/users/${b.session.userId}`, {
    headers: bearer(admin.session.accessToken),
  });
  console.log('USER_A issued=', userA.lifetimeIssuedReceived, 'transfer=', userA.lifetimeTransferReceived);
  console.log('USER_B issued=', userB.lifetimeIssuedReceived, 'transfer=', userB.lifetimeTransferReceived);
  assert(Number(userB.lifetimeTransferReceived) >= 100, 'B should receive transfer 100');

  console.log('PASS coin supply smoke', { issuanceId: issue1.issuanceId, joinId: created.joinId });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
