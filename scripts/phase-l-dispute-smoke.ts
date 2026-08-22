/**
 * Phase L dispute resolution smoke.
 * Usage:
 *   $env:API_BASE='https://api-production-2d67e.up.railway.app'
 *   pnpm exec tsx scripts/phase-l-dispute-smoke.ts
 */
import {
  DisputeResolution,
  DisputeStatus,
  JoinMethod,
  MockAuthPersona,
  RewardStatus,
  SocialProvider,
  SCREEN_GOLF_CODE,
} from '../packages/types/src/index.ts';

const API_BASE = process.env.API_BASE ?? 'http://127.0.0.1:3000';

async function json<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  const raw = await res.text();
  if (res.status < 200 || res.status >= 300) {
    throw new Error(`${path} -> ${res.status} ${raw.slice(0, 200)}`);
  }
  return JSON.parse(raw) as T;
}

async function signIn(persona: MockAuthPersona) {
  return json<{ session: { accessToken: string } }>('/auth/social/mock-sign-in', {
    method: 'POST',
    body: JSON.stringify({ provider: SocialProvider.KAKAO, persona }),
  });
}

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

async function setupDispute(tokenA: string, tokenB: string, label: string) {
  const idem = `phase-l-${label}-${Date.now()}`;
  const created = await json<{ joinId: string }>('/joins', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
    body: JSON.stringify({
      sportCode: SCREEN_GOLF_CODE,
      venue: {
        provider: 'MOCK',
        providerPlaceId: `venue_l_${label}_${Date.now()}`,
        name: `Phase L ${label}`,
        address: '거제',
        regionLabel: '거제',
        latitude: 34.8805,
        longitude: 128.6211,
      },
      startAt: new Date(Date.now() + 2 * 60 * 60_000).toISOString(),
      plannedPlayerCount: 4,
      joinMethod: JoinMethod.APPROVAL,
      title: `Phase L ${label}`,
      idempotencyKey: idem,
    }),
  });

  const applied = await json<{ myParticipation: { participantId: string } | null }>(
    `/joins/${created.joinId}/apply`,
    { method: 'POST', headers: { Authorization: `Bearer ${tokenB}` } },
  );
  const participantId = applied.myParticipation?.participantId;
  assert(participantId, 'participantId');

  await json(`/joins/${created.joinId}/participants/${participantId}/approve`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
  });

  await json(`/joins/${created.joinId}/settlements/_qa/advance-clock`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
    body: JSON.stringify({ mode: 'open' }),
  });

  const issue = await json<{ disputeId?: string; rewardStatus: string }>(
    `/joins/${created.joinId}/settlements/${participantId}/issue`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({ issueType: 'DISPUTE', statement: '참가 문제 신고' }),
    },
  );
  assert(issue.rewardStatus === RewardStatus.DISPUTED, 'settlement DISPUTED');

  const detail = await json<{
    settlement?: {
      settlements: Array<{ dispute?: { disputeId: string } | null }>;
    };
  }>(`/joins/${created.joinId}`, {
    headers: { Authorization: `Bearer ${tokenB}` },
  });
  const disputeId = detail.settlement?.settlements[0]?.dispute?.disputeId;
  assert(disputeId, 'disputeId');

  await json(`/me/disputes/${disputeId}/statement`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenB}` },
    body: JSON.stringify({ statement: '정상 참석했습니다.' }),
  });

  const autopay = await json<{ processed: number }>('/settlement/autopay/run', {
    method: 'POST',
  });
  assert(autopay.processed === 0, 'autopay skips dispute');

  return { joinId: created.joinId, participantId, disputeId };
}

async function wallet(token: string) {
  return json<{ availableCoin: string; heldCoin: string }>('/me/wallet', {
    headers: { Authorization: `Bearer ${token}` },
  });
}

async function main() {
  console.log('API_BASE=', API_BASE);
  const health = await json<{ status: string; database: string }>('/health');
  assert(health.status === 'ok' && health.database === 'connected', 'health');

  const a = await signIn(MockAuthPersona.DEV_A);
  const b = await signIn(MockAuthPersona.DEV_B);
  const admin = await signIn(MockAuthPersona.DEV_ADMIN);

  const payCase = await setupDispute(a.session.accessToken, b.session.accessToken, 'pay');
  const beforeB = await wallet(b.session.accessToken);
  const beforeA = await wallet(a.session.accessToken);

  const pay1 = await json<{ ok: boolean; resolution: string }>(
    `/admin/disputes/${payCase.disputeId}/resolve`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${admin.session.accessToken}` },
      body: JSON.stringify({ resolution: DisputeResolution.PAY_PARTICIPANT, adminNote: '참가 확인' }),
    },
  );
  assert(pay1.ok && pay1.resolution === DisputeResolution.PAY_PARTICIPANT, 'admin pay');

  const pay2 = await json<{ ok: boolean; alreadyResolved?: boolean }>(
    `/admin/disputes/${payCase.disputeId}/resolve`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${admin.session.accessToken}` },
      body: JSON.stringify({ resolution: DisputeResolution.REFUND_HOST }),
    },
  );
  assert(pay2.alreadyResolved, 'resolve twice idempotent');

  const afterB = await wallet(b.session.accessToken);
  const afterA = await wallet(a.session.accessToken);
  assert(Number(afterB.availableCoin) - Number(beforeB.availableCoin) === 20, 'B +20 once');
  assert(Number(beforeA.heldCoin) - Number(afterA.heldCoin) === 20, 'A held -20');

  const refundCase = await setupDispute(a.session.accessToken, b.session.accessToken, 'refund');
  const refundBeforeA = await wallet(a.session.accessToken);
  const refundBeforeB = await wallet(b.session.accessToken);

  await json(`/admin/disputes/${refundCase.disputeId}/resolve`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${admin.session.accessToken}` },
    body: JSON.stringify({ resolution: DisputeResolution.REFUND_HOST }),
  });

  const refundAfterA = await wallet(a.session.accessToken);
  const refundAfterB = await wallet(b.session.accessToken);
  assert(Number(refundAfterA.availableCoin) > Number(refundBeforeA.availableCoin), 'host refund');
  assert(refundAfterB.availableCoin === refundBeforeB.availableCoin, 'B unchanged');

  const forbidden = await fetch(`${API_BASE}/admin/disputes?status=OPEN`, {
    headers: { Authorization: `Bearer ${b.session.accessToken}` },
  });
  assert(forbidden.status === 403, 'non-admin forbidden');

  console.log('Phase L dispute smoke PASS');
}

main().catch((e) => {
  console.error(e instanceof Error ? (e.stack ?? e.message) : e);
  process.exit(1);
});
