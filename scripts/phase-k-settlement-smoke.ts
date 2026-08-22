/**
 * Phase K settlement smoke — manual pay, auto pay, issues, auth.
 * Usage:
 *   $env:API_BASE='https://api-production-2d67e.up.railway.app'
 *   pnpm exec tsx scripts/phase-k-settlement-smoke.ts
 */
import {
  JoinMethod,
  MockAuthPersona,
  RewardStatus,
  SocialProvider,
  SCREEN_GOLF_CODE,
} from '../packages/types/src/index.ts';

const API_BASE = process.env.API_BASE ?? 'http://127.0.0.1:3000';

async function json<T>(
  path: string,
  init?: RequestInit,
): Promise<{ status: number; body: T; raw: string }> {
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

async function mustOk<T>(path: string, init?: RequestInit): Promise<T> {
  const { status, body, raw } = await json<T>(path, init);
  if (status < 200 || status >= 300) {
    throw new Error(`${path} -> ${status} ${raw.slice(0, 200)}`);
  }
  return body;
}

async function mustFail(path: string, init?: RequestInit, expectStatus?: number) {
  const { status, raw } = await json(path, init);
  if (expectStatus != null && status !== expectStatus) {
    throw new Error(`${path} expected ${expectStatus} got ${status} ${raw.slice(0, 120)}`);
  }
  if (status >= 200 && status < 300) {
    throw new Error(`${path} expected failure got ${status}`);
  }
  return status;
}

async function signIn(persona: MockAuthPersona) {
  return mustOk<{
    session: { accessToken: string; userId: string };
  }>('/auth/social/mock-sign-in', {
    method: 'POST',
    body: JSON.stringify({ provider: SocialProvider.KAKAO, persona }),
  });
}

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

async function createJoinAndApprove(tokenA: string, tokenB: string, label: string) {
  const idem = `phase-k-${label}-${Date.now()}`;
  const startAt = new Date(Date.now() + 2 * 60 * 60_000).toISOString();
  const created = await mustOk<{
    joinId: string;
    participants: Array<{ participantId: string; role: string; userId: string }>;
  }>('/joins', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
    body: JSON.stringify({
      sportCode: SCREEN_GOLF_CODE,
      venue: {
        provider: 'MOCK',
        providerPlaceId: `venue_pk_${label}_${Date.now()}`,
        name: `Phase K ${label}`,
        address: '거제',
        regionLabel: '거제',
        latitude: 34.8805,
        longitude: 128.6211,
      },
      startAt,
      plannedPlayerCount: 4,
      joinMethod: JoinMethod.APPROVAL,
      title: `Phase K ${label}`,
      idempotencyKey: idem,
    }),
  });

  const applied = await mustOk<{
    myParticipation: { participantId: string } | null;
  }>(`/joins/${created.joinId}/apply`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenB}` },
  });
  const participantId = applied.myParticipation?.participantId;
  assert(participantId, 'participantId missing');

  await mustOk(`/joins/${created.joinId}/participants/${participantId}/approve`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
  });

  return { joinId: created.joinId, participantId };
}

async function wallet(token: string) {
  return mustOk<{ availableCoin: string; heldCoin: string }>('/me/wallet', {
    headers: { Authorization: `Bearer ${token}` },
  });
}

async function runAutoPayViaApi() {
  return mustOk<{ scanned: number; processed: number }>('/settlement/autopay/run', {
    method: 'POST',
  });
}

async function main() {
  console.log('API_BASE=', API_BASE);
  const health = await mustOk<{ status: string; database: string }>('/health');
  assert(health.status === 'ok' && health.database === 'connected', 'health FAIL');

  const a = await signIn(MockAuthPersona.DEV_A);
  const b = await signIn(MockAuthPersona.DEV_B);

  const { joinId, participantId } = await createJoinAndApprove(
    a.session.accessToken,
    b.session.accessToken,
    'manual',
  );

  await mustFail(
    `/joins/${joinId}/settlements/${participantId}/pay`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${a.session.accessToken}` },
    },
    400,
  );

  await mustOk(`/joins/${joinId}/settlements/_qa/advance-clock`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${a.session.accessToken}` },
    body: JSON.stringify({ mode: 'open' }),
  });

  const beforeB = await wallet(b.session.accessToken);
  const beforeA = await wallet(a.session.accessToken);

  const detail = await mustOk<{
    settlement?: { settlements: Array<{ rewardStatus: string; canHostPay: boolean }> };
  }>(`/joins/${joinId}`, {
    headers: { Authorization: `Bearer ${a.session.accessToken}` },
  });
  assert(detail.settlement?.settlements.some((s) => s.canHostPay), 'canHostPay expected');

  await mustOk(`/joins/${joinId}/settlements/${participantId}/pay`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${a.session.accessToken}` },
  });
  await mustOk(`/joins/${joinId}/settlements/${participantId}/pay`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${a.session.accessToken}` },
  });

  const afterB = await wallet(b.session.accessToken);
  const afterA = await wallet(a.session.accessToken);
  assert(Number(afterB.availableCoin) - Number(beforeB.availableCoin) === 20, 'B +20 once');
  assert(Number(beforeA.heldCoin) - Number(afterA.heldCoin) === 20, 'A held -20');

  await mustFail(
    `/joins/${joinId}/settlements/${participantId}/pay`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${b.session.accessToken}` },
    },
    403,
  );

  const { joinId: autoJoinId, participantId: autoParticipantId } = await createJoinAndApprove(
    a.session.accessToken,
    b.session.accessToken,
    'autopay',
  );
  await mustOk(`/joins/${autoJoinId}/settlements/_qa/advance-clock`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${a.session.accessToken}` },
    body: JSON.stringify({ mode: 'autopay' }),
  });

  const autoBeforeB = await wallet(b.session.accessToken);
  const run1 = await runAutoPayViaApi();
  const run2 = await runAutoPayViaApi();
  assert(run1.processed >= 1, 'autopay processed');
  assert(run2.processed === 0, 'autopay idempotent rerun');
  const autoAfterB = await wallet(b.session.accessToken);
  assert(Number(autoAfterB.availableCoin) - Number(autoBeforeB.availableCoin) === 20, 'auto B +20');

  const autoDetail = await mustOk<{
    settlement?: { settlements: Array<{ participantId: string; rewardStatus: string }> };
  }>(`/joins/${autoJoinId}`, {
    headers: { Authorization: `Bearer ${b.session.accessToken}` },
  });
  const autoRow = autoDetail.settlement?.settlements.find(
    (s) => s.participantId === autoParticipantId,
  );
  assert(autoRow?.rewardStatus === RewardStatus.AUTO_PAID, 'AUTO_PAID');

  const { joinId: noShowJoinId, participantId: noShowParticipantId } = await createJoinAndApprove(
    a.session.accessToken,
    b.session.accessToken,
    'noshow',
  );
  await mustOk(`/joins/${noShowJoinId}/settlements/_qa/advance-clock`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${a.session.accessToken}` },
    body: JSON.stringify({ mode: 'autopay' }),
  });
  const noShowBeforeA = await wallet(a.session.accessToken);
  await mustOk(`/joins/${noShowJoinId}/settlements/${noShowParticipantId}/issue`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${a.session.accessToken}` },
    body: JSON.stringify({ issueType: 'NO_SHOW' }),
  });
  const noShowRun = await runAutoPayViaApi();
  const noShowDetail = await mustOk<{
    settlement?: { settlements: Array<{ participantId: string; rewardStatus: string }> };
  }>(`/joins/${noShowJoinId}`, {
    headers: { Authorization: `Bearer ${a.session.accessToken}` },
  });
  const noShowRow = noShowDetail.settlement?.settlements.find(
    (s) => s.participantId === noShowParticipantId,
  );
  assert(noShowRow?.rewardStatus === RewardStatus.REFUNDED, 'NO_SHOW REFUNDED');
  assert(noShowRun.processed === 0 || noShowRow?.rewardStatus !== RewardStatus.AUTO_PAID, 'NO_SHOW blocks autopay');
  const noShowAfterA = await wallet(a.session.accessToken);
  assert(
    Number(noShowAfterA.availableCoin) > Number(noShowBeforeA.availableCoin),
    'NO_SHOW refund to host available',
  );

  console.log('Phase K settlement smoke PASS');
}

main().catch((e) => {
  console.error(e instanceof Error ? (e.stack ?? e.message) : e);
  process.exit(1);
});
