/**
 * Manual rewardPerParticipant — Railway accounting smoke + settlement E2E.
 *
 * Usage:
 *   $env:API_BASE='https://api-production-2d67e.up.railway.app'
 *   pnpm exec tsx scripts/phase-reward-per-participant-smoke.ts
 *
 * Never prints tokens / secrets.
 */
import {
  JoinMethod,
  MockAuthPersona,
  RewardStatus,
  SocialProvider,
  SCREEN_GOLF_CODE,
} from '../packages/types/src/index.ts';

const API_BASE =
  process.env.API_BASE ?? 'https://api-production-2d67e.up.railway.app';

type Preview = {
  roomCreationFee: string;
  rewardPerParticipant: string;
  rewardEligibleSlots: number;
  rewardHoldTotal: string;
  totalRequiredCoin: string;
  walletAvailable: string;
  walletAfterCreation: string;
  canCreate: boolean;
};

type Wallet = { availableCoin: string; heldCoin: string };
type Tx = {
  type: string;
  amount: string;
  reference: { refType: string | null; refId: string | null };
};

async function req<T>(
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

async function ok<T>(path: string, init?: RequestInit): Promise<T> {
  const { status, body, raw } = await req<T>(path, init);
  if (status < 200 || status >= 300) {
    throw new Error(`${path} -> ${status} ${raw.slice(0, 240)}`);
  }
  return body;
}

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

function n(v: string) {
  return Number(v);
}

async function signIn(persona: MockAuthPersona) {
  return ok<{ session: { accessToken: string; userId: string } }>(
    '/auth/social/mock-sign-in',
    {
      method: 'POST',
      body: JSON.stringify({ provider: SocialProvider.KAKAO, persona }),
    },
  );
}

function bearer(token: string) {
  return { Authorization: `Bearer ${token}` };
}

async function getWallet(token: string) {
  return ok<Wallet>('/me/wallet', { headers: bearer(token) });
}

async function coinPreview(
  token: string,
  plannedPlayerCount: number,
  rewardPerParticipant: string,
) {
  return ok<Preview>('/joins/coin-preview', {
    method: 'POST',
    headers: bearer(token),
    body: JSON.stringify({ plannedPlayerCount, rewardPerParticipant }),
  });
}

async function createJoin(
  token: string,
  args: { plannedPlayerCount: number; rewardPerParticipant: string; label: string },
) {
  return ok<{
    joinId: string;
    rewardPerParticipant: string;
    roomCreationFeeAmount: string;
    rewardHoldTotalAmount: string;
    coinAccountingPending: boolean;
  }>('/joins', {
    method: 'POST',
    headers: bearer(token),
    body: JSON.stringify({
      sportCode: SCREEN_GOLF_CODE,
      venue: {
        provider: 'MOCK',
        providerPlaceId: `venue_reward_${args.label}_${Date.now()}`,
        name: `Reward E2E ${args.label}`,
        address: '거제시 고현동',
        regionLabel: '거제시 고현동',
        latitude: 34.8805,
        longitude: 128.6211,
      },
      startAt: new Date(Date.now() + 3 * 60 * 60_000).toISOString(),
      plannedPlayerCount: args.plannedPlayerCount,
      joinMethod: JoinMethod.APPROVAL,
      title: `Reward E2E ${args.label}`,
      rewardPerParticipant: args.rewardPerParticipant,
      idempotencyKey: `reward-e2e-${args.label}-${Date.now()}`,
    }),
  });
}

async function applyApprove(hostToken: string, guestToken: string, joinId: string) {
  const applied = await ok<{
    myParticipation: { participantId: string } | null;
  }>(`/joins/${joinId}/apply`, {
    method: 'POST',
    headers: bearer(guestToken),
  });
  const participantId = applied.myParticipation?.participantId;
  assert(participantId, 'participantId missing');
  await ok(`/joins/${joinId}/participants/${participantId}/approve`, {
    method: 'POST',
    headers: bearer(hostToken),
  });
  return participantId;
}

async function advanceClock(token: string, joinId: string, mode: 'open' | 'autopay') {
  return ok(`/joins/${joinId}/settlements/_qa/advance-clock`, {
    method: 'POST',
    headers: bearer(token),
    body: JSON.stringify({ mode }),
  });
}

// aliases kept local for readability in main()
const applyAndApprove = applyApprove;
const qaAdvance = advanceClock;

async function main() {
  console.log('API_BASE=', API_BASE);
  const health = await ok<{ status: string; database: string }>('/health');
  assert(health.status === 'ok' && health.database === 'connected', 'health FAIL');

  const a = await signIn(MockAuthPersona.DEV_A);
  const b = await signIn(MockAuthPersona.DEV_B);
  assert(a.session.userId !== b.session.userId, 'personas must differ');

  const host0 = await getWallet(a.session.accessToken);
  console.log('HOST before available=', host0.availableCoin, 'held=', host0.heldCoin);

  // -------- CASE A --------
  const p20 = await coinPreview(a.session.accessToken, 4, '20');
  assert(p20.rewardEligibleSlots === 3, 'CASE A slots');
  assert(p20.rewardPerParticipant === '20', 'CASE A reward');
  assert(p20.rewardHoldTotal === '60', 'CASE A hold');
  console.log('CASE A PASS slots=3 hold=60');

  // -------- CASE B --------
  const fee = p20.roomCreationFee;
  assert(p20.totalRequiredCoin === String(n(fee) + 60), 'CASE B total');
  console.log('CASE B PASS fee=', fee, 'total=', p20.totalRequiredCoin);

  // -------- CASE D --------
  const p0 = await coinPreview(a.session.accessToken, 4, '0');
  assert(p0.rewardHoldTotal === '0', 'CASE D hold');
  assert(p0.totalRequiredCoin === p0.roomCreationFee, 'CASE D fee-only');
  console.log('CASE D PASS zero reward');

  // -------- CASE C --------
  const huge = await coinPreview(a.session.accessToken, 4, '999999999');
  assert(huge.canCreate === false, 'CASE C canCreate false');
  const rejected = await req('/joins', {
    method: 'POST',
    headers: bearer(a.session.accessToken),
    body: JSON.stringify({
      sportCode: SCREEN_GOLF_CODE,
      venue: {
        provider: 'MOCK',
        providerPlaceId: `venue_insuff_${Date.now()}`,
        name: 'Insufficient',
        address: '거제',
        regionLabel: '거제',
        latitude: 34.88,
        longitude: 128.62,
      },
      startAt: new Date(Date.now() + 5 * 60 * 60_000).toISOString(),
      plannedPlayerCount: 4,
      joinMethod: JoinMethod.APPROVAL,
      title: 'Insufficient',
      rewardPerParticipant: '999999999',
      idempotencyKey: `reward-insuff-${Date.now()}`,
    }),
  });
  assert(rejected.status === 400, 'CASE C HTTP 400');
  assert(
    rejected.raw.includes('INSUFFICIENT_BALANCE') || rejected.raw.includes('insufficient'),
    'CASE C insufficient code',
  );
  console.log('CASE C PASS insufficient rejected');

  // -------- CREATE reward=25 / 3 slots / hold=75 --------
  const created = await createJoin(a.session.accessToken, {
    plannedPlayerCount: 4,
    rewardPerParticipant: '25',
    label: 'create25',
  });
  assert(created.rewardPerParticipant === '25', 'saved reward');
  assert(created.rewardHoldTotalAmount === '75', 'hold 75');
  assert(created.roomCreationFeeAmount === fee, 'fee snapshot');
  assert(created.coinAccountingPending === false, 'accounting live');
  console.log(
    'CREATE PASS join=',
    created.joinId,
    'reward=25 fee=',
    created.roomCreationFeeAmount,
    'hold=75',
  );

  const host1 = await getWallet(a.session.accessToken);
  assert(
    n(host1.availableCoin) === n(host0.availableCoin) - n(fee) - 75,
    `available identity got=${host1.availableCoin}`,
  );
  assert(n(host1.heldCoin) === n(host0.heldCoin) + 75, `held identity got=${host1.heldCoin}`);
  console.log('WALLET AFTER CREATE available=', host1.availableCoin, 'held=', host1.heldCoin);

  // -------- CASE E ledger separation --------
  const txs = await ok<{ items: Tx[] }>('/me/wallet/transactions?limit=40', {
    headers: bearer(a.session.accessToken),
  });
  const feeTx = txs.items.filter(
    (t) => t.type === 'ROOM_CREATION_FEE' && t.reference.refId === created.joinId,
  );
  const holdTx = txs.items.filter(
    (t) => t.type === 'JOIN_REWARD_HOLD' && t.reference.refId === created.joinId,
  );
  assert(feeTx.length === 1, 'CASE E fee x1');
  assert(holdTx.length === 1, 'CASE E hold x1');
  assert(feeTx[0].amount === `-${fee}` || feeTx[0].amount === fee, 'CASE E fee amt');
  assert(holdTx[0].amount === '-75' || holdTx[0].amount === '75', 'CASE E hold amt');
  console.log('CASE E PASS fee/hold separated');

  // -------- MANUAL PAYOUT P1 (+25, duplicate safe) --------
  const p1 = await applyApprove(a.session.accessToken, b.session.accessToken, created.joinId);
  await advanceClock(a.session.accessToken, created.joinId, 'open');

  const b0 = await getWallet(b.session.accessToken);
  const aPay0 = await getWallet(a.session.accessToken);
  await ok(`/joins/${created.joinId}/settlements/${p1}/pay`, {
    method: 'POST',
    headers: bearer(a.session.accessToken),
  });
  await ok(`/joins/${created.joinId}/settlements/${p1}/pay`, {
    method: 'POST',
    headers: bearer(a.session.accessToken),
  });
  const b1 = await getWallet(b.session.accessToken);
  const aPay1 = await getWallet(a.session.accessToken);
  assert(n(b1.availableCoin) - n(b0.availableCoin) === 25, 'P1 +25 once');
  assert(n(aPay0.heldCoin) - n(aPay1.heldCoin) === 25, 'host held -25');
  console.log('SETTLEMENT P1 PASS +25 duplicate-safe held=', aPay1.heldCoin);

  // -------- NO_SHOW refund (approved participant unused payout) --------
  const noshowJoin = await createJoin(a.session.accessToken, {
    plannedPlayerCount: 3,
    rewardPerParticipant: '25',
    label: 'noshow',
  });
  assert(noshowJoin.rewardHoldTotalAmount === '50', 'noshow hold 50 (2 slots)');
  const pNs = await applyApprove(
    a.session.accessToken,
    b.session.accessToken,
    noshowJoin.joinId,
  );
  await advanceClock(a.session.accessToken, noshowJoin.joinId, 'autopay');
  const aNs0 = await getWallet(a.session.accessToken);
  await ok(`/joins/${noshowJoin.joinId}/settlements/${pNs}/issue`, {
    method: 'POST',
    headers: bearer(a.session.accessToken),
    body: JSON.stringify({ issueType: 'NO_SHOW' }),
  });
  // duplicate issue must not double-refund
  await req(`/joins/${noshowJoin.joinId}/settlements/${pNs}/issue`, {
    method: 'POST',
    headers: bearer(a.session.accessToken),
    body: JSON.stringify({ issueType: 'NO_SHOW' }),
  });
  const aNs1 = await getWallet(a.session.accessToken);
  assert(n(aNs1.availableCoin) >= n(aNs0.availableCoin) + 25, 'NO_SHOW refund +25 once');
  const nsDetail = await ok<{
    settlement?: { settlements: Array<{ participantId: string; rewardStatus: string }> };
  }>(`/joins/${noshowJoin.joinId}`, { headers: bearer(a.session.accessToken) });
  const nsRow = nsDetail.settlement?.settlements.find((s) => s.participantId === pNs);
  assert(nsRow?.rewardStatus === RewardStatus.REFUNDED, 'REFUNDED');
  console.log('UNUSED/NO_SHOW REFUND PASS');

  // -------- AUTOPAY --------
  const autoJoin = await createJoin(a.session.accessToken, {
    plannedPlayerCount: 3,
    rewardPerParticipant: '25',
    label: 'autopay',
  });
  const pAuto = await applyApprove(
    a.session.accessToken,
    b.session.accessToken,
    autoJoin.joinId,
  );
  await advanceClock(a.session.accessToken, autoJoin.joinId, 'autopay');
  const bAuto0 = await getWallet(b.session.accessToken);
  const run1 = await ok<{ processed: number }>('/settlement/autopay/run', { method: 'POST' });
  const run2 = await ok<{ processed: number }>('/settlement/autopay/run', { method: 'POST' });
  assert(run1.processed >= 1, 'autopay processed');
  assert(run2.processed === 0, 'autopay idempotent');
  const bAuto1 = await getWallet(b.session.accessToken);
  assert(n(bAuto1.availableCoin) - n(bAuto0.availableCoin) === 25, 'autopay +25');
  const autoDetail = await ok<{
    settlement?: { settlements: Array<{ participantId: string; rewardStatus: string }> };
  }>(`/joins/${autoJoin.joinId}`, { headers: bearer(b.session.accessToken) });
  const autoRow = autoDetail.settlement?.settlements.find((s) => s.participantId === pAuto);
  assert(autoRow?.rewardStatus === RewardStatus.AUTO_PAID, 'AUTO_PAID');
  console.log('AUTOPAY PASS amount=25 duplicate-safe');

  // -------- DISPUTE blocks autopay --------
  // Re-sign-in tops available back to DEV funding target (200) after prior creates.
  const aFunded = await signIn(MockAuthPersona.DEV_A);
  const disputeJoin = await createJoin(aFunded.session.accessToken, {
    plannedPlayerCount: 3,
    rewardPerParticipant: '25',
    label: 'dispute',
  });
  const pD = await applyApprove(
    aFunded.session.accessToken,
    b.session.accessToken,
    disputeJoin.joinId,
  );
  await advanceClock(aFunded.session.accessToken, disputeJoin.joinId, 'autopay');
  await ok(`/joins/${disputeJoin.joinId}/settlements/${pD}/issue`, {
    method: 'POST',
    headers: bearer(aFunded.session.accessToken),
    body: JSON.stringify({ issueType: 'DISPUTE' }),
  });
  const bD0 = await getWallet(b.session.accessToken);
  await ok('/settlement/autopay/run', { method: 'POST' });
  const bD1 = await getWallet(b.session.accessToken);
  assert(bD1.availableCoin === bD0.availableCoin, 'dispute blocks autopay');
  const dDetail = await ok<{
    settlement?: { settlements: Array<{ participantId: string; rewardStatus: string }> };
  }>(`/joins/${disputeJoin.joinId}`, { headers: bearer(aFunded.session.accessToken) });
  const dRow = dDetail.settlement?.settlements.find((s) => s.participantId === pD);
  assert(dRow?.rewardStatus === RewardStatus.DISPUTED, 'DISPUTED');
  console.log('DISPUTE PASS autopay suspended');

  console.log('phase-reward-per-participant-smoke PASS');
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
