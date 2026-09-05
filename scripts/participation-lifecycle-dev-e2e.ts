/**
 * Participation Lifecycle DEV E2E — Railway development API.
 *
 * Usage:
 *   $env:API_BASE='https://api-development-e387.up.railway.app'
 *   pnpm exec tsx scripts/participation-lifecycle-dev-e2e.ts
 */
import {
  JoinMethod,
  MockAuthPersona,
  RewardStatus,
  SocialProvider,
  SCREEN_GOLF_CODE,
} from '../packages/types/src/index.ts';

const API_BASE = process.env.API_BASE ?? 'https://api-development-e387.up.railway.app';
const TAG = 'lifecycle-e2e';
const REWARD = '20';

type Wallet = {
  availableCoin: string;
  heldCoin: string;
  pendingPayoutCoin?: string;
};

type Tx = {
  id: string;
  type: string;
  direction: string;
  amount: string;
  reference: { refType: string | null; refId: string | null };
};

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
    throw new Error(`${path} -> ${status} ${raw.slice(0, 300)}`);
  }
  return body;
}

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

function n(v: string) {
  return Number(v);
}

function bearer(token: string) {
  return { Authorization: `Bearer ${token}` };
}

async function signIn(persona: MockAuthPersona) {
  return mustOk<{
    session: { accessToken: string; userId: string };
  }>('/auth/social/mock-sign-in', {
    method: 'POST',
    body: JSON.stringify({ provider: SocialProvider.KAKAO, persona }),
  });
}

async function wallet(token: string) {
  return mustOk<Wallet>('/me/wallet', { headers: bearer(token) });
}

async function applyApprove(hostToken: string, guestToken: string, joinId: string) {
  const applied = await mustOk<{
    myParticipation: { participantId: string } | null;
  }>(`/joins/${joinId}/apply`, {
    method: 'POST',
    headers: bearer(guestToken),
  });
  const participantId = applied.myParticipation?.participantId;
  assert(participantId, 'participantId missing');
  await mustOk(`/joins/${joinId}/participants/${participantId}/approve`, {
    method: 'POST',
    headers: bearer(hostToken),
  });
  return participantId;
}

async function listRecentTxs(token: string) {
  return mustOk<{ items: Tx[] }>('/me/wallet/transactions?limit=80', {
    headers: bearer(token),
  });
}

const ACTIVE_HOST_STATUSES = new Set(['OPEN', 'FULL', 'CONFIRMED', 'IN_PROGRESS']);

async function signInFunded(persona: MockAuthPersona) {
  let session = await signIn(persona);
  let w = await wallet(session.session.accessToken);
  if (n(w.availableCoin) < 80) {
    session = await signIn(persona);
    w = await wallet(session.session.accessToken);
  }
  console.log(`wallet ${persona}: available=${w.availableCoin} held=${w.heldCoin}`);
  return session;
}

async function cleanupBlockingHostedJoin(hostToken: string) {
  const mine = await mustOk<{
    hosted: Array<{ joinId: string; status: string }>;
  }>('/joins/mine', { headers: bearer(hostToken) });
  const blocking = mine.hosted?.find((j) => ACTIVE_HOST_STATUSES.has(j.status));
  if (!blocking) return;

  console.log('cleanup blocking hosted join', blocking.joinId, blocking.status);
  const detail = await mustOk<{
    participants: Array<{ participantId: string; role: string; participationStatus: string }>;
  }>(`/joins/${blocking.joinId}`, { headers: bearer(hostToken) });

  const applied = detail.participants.find(
    (p) => p.role !== 'HOST' && p.participationStatus === 'APPLIED',
  );
  if (applied) {
    await mustOk(`/joins/${blocking.joinId}/participants/${applied.participantId}/approve`, {
      method: 'POST',
      headers: bearer(hostToken),
    });
  }

  const approved = applied
    ? await mustOk<{
        participants: Array<{ participantId: string; role: string; participationStatus: string }>;
      }>(`/joins/${blocking.joinId}`, { headers: bearer(hostToken) })
    : detail;
  const nonHost = approved.participants.filter((p) => p.role !== 'HOST' && p.participationStatus !== 'APPLIED');

  await mustOk(`/joins/${blocking.joinId}/settlements/_qa/advance-clock`, {
    method: 'POST',
    headers: bearer(hostToken),
    body: JSON.stringify({ mode: 'open' }),
  });

  if (nonHost.length > 0) {
    await mustOk(`/joins/${blocking.joinId}/settlements/finalize`, {
      method: 'POST',
      headers: bearer(hostToken),
      body: JSON.stringify({
        attendance: nonHost.map((p) => ({ participantId: p.participantId, attended: false })),
      }),
    });
  }
}

async function pickHost() {
  const order = [MockAuthPersona.DEV_B, MockAuthPersona.DEV_A, MockAuthPersona.DEV_C, MockAuthPersona.DEV_ADMIN];
  for (const persona of order) {
    const session = await signInFunded(persona);
    await cleanupBlockingHostedJoin(session.session.accessToken).catch((err) => {
      console.warn(`cleanup failed for ${persona}:`, err instanceof Error ? err.message : err);
    });
    const mine = await mustOk<{ hosted: Array<{ status: string }> }>('/joins/mine', {
      headers: bearer(session.session.accessToken),
    });
    const active =
      mine.hosted?.filter((j) => ACTIVE_HOST_STATUSES.has(j.status)).length ?? 0;
    const preview = await mustOk<{
      totalRequiredCoin: string;
      canCreate: boolean;
      walletAvailable: string;
    }>('/joins/coin-preview', {
      method: 'POST',
      headers: bearer(session.session.accessToken),
      body: JSON.stringify({ plannedPlayerCount: 4, rewardPerParticipant: REWARD }),
    });
    if (active < 1 && preview.canCreate) {
      console.log(
        `host persona=${persona} activeHosted=${active} required=${preview.totalRequiredCoin} available=${preview.walletAvailable}`,
      );
      return session;
    }
    console.log(
      `skip host ${persona}: active=${active} canCreate=${preview.canCreate} required=${preview.totalRequiredCoin}`,
    );
  }
  throw new Error('no eligible host persona (host limit or insufficient coin)');
}

async function main() {
  console.log('API_BASE=', API_BASE);

  const health = await mustOk<{
    status: string;
    database: string;
    appVariant?: string;
    railwayEnvironment?: string;
  }>('/health');
  assert(health.status === 'ok' && health.database === 'connected', 'health FAIL');
  console.log('health OK', health.appVariant, health.railwayEnvironment);

  const host = await pickHost();
  const guestB = await signInFunded(MockAuthPersona.DEV_A);
  const guestC = await signInFunded(MockAuthPersona.DEV_C);
  const guestD = await signInFunded(MockAuthPersona.DEV_ADMIN);

  const idem = `${TAG}-${Date.now()}`;
  const created = await mustOk<{
    joinId: string;
    rewardHoldTotalAmount: string;
    rewardPerParticipant: string;
  }>('/joins', {
    method: 'POST',
    headers: bearer(host.session.accessToken),
    body: JSON.stringify({
      sportCode: SCREEN_GOLF_CODE,
      venue: {
        provider: 'MOCK',
        providerPlaceId: `venue_${TAG}_${Date.now()}`,
        name: `Lifecycle E2E ${TAG}`,
        address: '거제시 고현동',
        regionLabel: '거제시 고현동',
        latitude: 34.8805,
        longitude: 128.6211,
      },
      startAt: new Date(Date.now() + 2 * 60 * 60_000).toISOString(),
      plannedPlayerCount: 4,
      joinMethod: JoinMethod.APPROVAL,
      title: `[${TAG}] STANDARD lifecycle`,
      rewardPerParticipant: REWARD,
      idempotencyKey: idem,
    }),
  });

  assert(created.rewardHoldTotalAmount === '60', `hold expected 60 got ${created.rewardHoldTotalAmount}`);
  const joinId = created.joinId;
  console.log('join created', joinId);

  const pidB = await applyApprove(host.session.accessToken, guestB.session.accessToken, joinId);
  const pidC = await applyApprove(host.session.accessToken, guestC.session.accessToken, joinId);
  const pidD = await applyApprove(host.session.accessToken, guestD.session.accessToken, joinId);
  console.log('participants', { pidB, pidC, pidD });

  await mustOk(`/joins/${joinId}/settlements/_qa/advance-clock`, {
    method: 'POST',
    headers: bearer(host.session.accessToken),
    body: JSON.stringify({ mode: 'open' }),
  });

  const hostBefore = await wallet(host.session.accessToken);
  const bBefore = await wallet(guestB.session.accessToken);
  const cBefore = await wallet(guestC.session.accessToken);
  const dBefore = await wallet(guestD.session.accessToken);

  const finalizeBody = {
    attendance: [
      { participantId: pidB, attended: true },
      { participantId: pidC, attended: true },
      { participantId: pidD, attended: false },
    ],
  };

  const finalized = await mustOk<{
    ok: boolean;
    attendedCount: number;
    noShowCount: number;
    results: Array<{ participantId: string; rewardStatus?: string }>;
  }>(`/joins/${joinId}/settlements/finalize`, {
    method: 'POST',
    headers: bearer(host.session.accessToken),
    body: JSON.stringify(finalizeBody),
  });
  assert(finalized.attendedCount === 2 && finalized.noShowCount === 1, 'finalize counts');
  console.log('finalize 1', finalized);

  const hostAfter1 = await wallet(host.session.accessToken);
  const bAfter1 = await wallet(guestB.session.accessToken);
  const cAfter1 = await wallet(guestC.session.accessToken);
  const dAfter1 = await wallet(guestD.session.accessToken);

  assert(n(bAfter1.availableCoin) - n(bBefore.availableCoin) === n(REWARD), 'B reward +20');
  assert(n(cAfter1.availableCoin) - n(cBefore.availableCoin) === n(REWARD), 'C reward +20');
  assert(n(dAfter1.availableCoin) === n(dBefore.availableCoin), 'D reward 0');
  assert(n(hostBefore.heldCoin) - n(hostAfter1.heldCoin) === 60, 'host held released 60');

  const hostTxs = (await listRecentTxs(host.session.accessToken)).items;
  const bTxs = (await listRecentTxs(guestB.session.accessToken)).items;
  const refundTxs = hostTxs.filter((t) => t.type === 'JOIN_REWARD_REFUND');
  const transferB = bTxs.filter((t) => t.type === 'JOIN_REWARD_TRANSFER');
  assert(transferB.length >= 1, 'B transfer ledger');
  assert(refundTxs.length >= 1, 'host refund ledger');

  const detail = await mustOk<{
    status: string;
    settlement?: { settlements: Array<{ participantId: string; rewardStatus: string }> };
  }>(`/joins/${joinId}`, { headers: bearer(host.session.accessToken) });
  assert(detail.status === 'COMPLETED', `join status ${detail.status}`);
  const rowB = detail.settlement?.settlements.find((s) => s.participantId === pidB);
  const rowC = detail.settlement?.settlements.find((s) => s.participantId === pidC);
  const rowD = detail.settlement?.settlements.find((s) => s.participantId === pidD);
  assert(rowB?.rewardStatus === RewardStatus.PAID, 'B PAID');
  assert(rowC?.rewardStatus === RewardStatus.PAID, 'C PAID');
  assert(rowD?.rewardStatus === RewardStatus.REFUNDED, 'D REFUNDED');

  const hostTxCount = hostTxs.length;
  const bTxCount = bTxs.length;

  const dup = await mustOk(`/joins/${joinId}/settlements/finalize`, {
    method: 'POST',
    headers: bearer(host.session.accessToken),
    body: JSON.stringify(finalizeBody),
  });
  console.log('finalize duplicate', dup);

  const hostAfter2 = await wallet(host.session.accessToken);
  const bAfter2 = await wallet(guestB.session.accessToken);
  const cAfter2 = await wallet(guestC.session.accessToken);
  const dAfter2 = await wallet(guestD.session.accessToken);
  assert(n(hostAfter2.availableCoin) === n(hostAfter1.availableCoin), 'duplicate host wallet');
  assert(n(bAfter2.availableCoin) === n(bAfter1.availableCoin), 'duplicate B wallet');
  assert(n(cAfter2.availableCoin) === n(cAfter1.availableCoin), 'duplicate C wallet');
  assert(n(dAfter2.availableCoin) === n(dAfter1.availableCoin), 'duplicate D wallet');

  const hostTxs2 = (await listRecentTxs(host.session.accessToken)).items;
  const bTxs2 = (await listRecentTxs(guestB.session.accessToken)).items;
  assert(hostTxs2.length === hostTxCount, 'no duplicate host ledger');
  assert(bTxs2.length === bTxCount, 'no duplicate B ledger');

  const trustB = await mustOk<{
    attendedCount: number;
    noShowCount: number;
    cancelledCount: number;
    attendanceRatePercent: number | null;
    labelText: string;
  }>(`/users/${guestB.session.userId}/participation-trust`);
  console.log('trust B', trustB);
  assert(trustB.attendedCount >= 1, 'B attended count');

  const notifB = await mustOk<{ items: Array<{ type: string; readAt: string | null }> }>(
    '/me/notifications?limit=20',
    { headers: bearer(guestB.session.accessToken) },
  );
  const rewardNotifs = notifB.items.filter((n) => n.type === 'REWARD_PAID');
  assert(rewardNotifs.length >= 1, 'B reward notification');

  const unreadB = await mustOk<{ unreadCount: number }>('/me/notifications/unread-count', {
    headers: bearer(guestB.session.accessToken),
  });
  console.log('unread B', unreadB.unreadCount);

  // Club: join request / approve / reject / club-only gate
  const clubOwner = await signInFunded(MockAuthPersona.DEV_B);
  await cleanupBlockingHostedJoin(clubOwner.session.accessToken).catch(() => undefined);
  const clubMember = await signInFunded(MockAuthPersona.DEV_A);
  const clubForeign = await signInFunded(MockAuthPersona.DEV_ADMIN);
  const clubName = `[${TAG}-club-${Date.now()}]`;
  const club = await mustOk<{ id: string }>('/clubs', {
    method: 'POST',
    headers: bearer(clubOwner.session.accessToken),
    body: JSON.stringify({
      name: clubName,
      intro: 'lifecycle club e2e',
      region: '거제',
      activityType: 'SCREEN',
      joinMode: 'APPROVAL',
      visibility: 'PUBLIC',
    }),
  });

  const startsAt = new Date(Date.now() + 5 * 24 * 60 * 60_000).toISOString();
  const event = await mustOk<{ id: string }>(`/clubs/${club.id}/events`, {
    method: 'POST',
    headers: bearer(clubOwner.session.accessToken),
    body: JSON.stringify({
      title: `${clubName} event`,
      eventType: 'FIELD',
      startsAt,
      endsAt: new Date(Date.now() + 5 * 24 * 60 * 60_000 + 3 * 60 * 60_000).toISOString(),
      venueName: 'Lifecycle club venue',
      venueAddress: '거제',
      capacity: 12,
      responseDeadline: new Date(Date.now() + 4 * 24 * 60 * 60_000).toISOString(),
    }),
  });

  const pending = await mustOk<{ id: string }>(`/clubs/${club.id}/join`, {
    method: 'POST',
    headers: bearer(clubForeign.session.accessToken),
    body: JSON.stringify({}),
  });
  assert(pending.id, 'pending membership');

  const members = await mustOk<{
    items: Array<{ id: string; userId: string; status: string }>;
  }>(`/clubs/${club.id}/members`, { headers: bearer(clubOwner.session.accessToken) });
  const pendingRow = members.items.find((m) => m.userId === clubForeign.session.userId);
  assert(pendingRow?.status === 'PENDING', 'pending status');

  await mustOk(`/clubs/${club.id}/members/${pendingRow!.id}/reject`, {
    method: 'POST',
    headers: bearer(clubOwner.session.accessToken),
  });

  const foreignNotifs = await mustOk<{ items: Array<{ type: string }> }>('/me/notifications?limit=10', {
    headers: bearer(clubForeign.session.accessToken),
  });
  console.log('reject notif types', foreignNotifs.items.map((i) => i.type).slice(0, 5));

  await mustOk(`/clubs/${club.id}/join`, {
    method: 'POST',
    headers: bearer(clubMember.session.accessToken),
    body: JSON.stringify({}),
  });
  const members2 = await mustOk<{
    items: Array<{ id: string; userId: string; status: string }>;
  }>(`/clubs/${club.id}/members`, { headers: bearer(clubOwner.session.accessToken) });
  const memberRow = members2.items.find((m) => m.userId === clubMember.session.userId);
  assert(memberRow, 'member row');
  await mustOk(`/clubs/${club.id}/members/${memberRow!.id}/approve`, {
    method: 'POST',
    headers: bearer(clubOwner.session.accessToken),
  });

  await cleanupBlockingHostedJoin(clubOwner.session.accessToken).catch(() => undefined);

  const clubJoinIdem = `${TAG}-club-join-${Date.now()}`;
  const clubJoin = await mustOk<{ joinId: string }>('/joins', {
    method: 'POST',
    headers: bearer(clubOwner.session.accessToken),
    body: JSON.stringify({
      sportCode: SCREEN_GOLF_CODE,
      clubId: club.id,
      clubEventId: event.id,
      venue: {
        provider: 'MOCK',
        providerPlaceId: `venue_club_${Date.now()}`,
        name: 'Club only join',
        address: '거제',
        regionLabel: '거제',
        latitude: 34.88,
        longitude: 128.62,
      },
      startAt: new Date(Date.now() + 4 * 60 * 60_000).toISOString(),
      plannedPlayerCount: 4,
      joinMethod: JoinMethod.APPROVAL,
      title: `[${TAG}] club-only`,
      rewardPerParticipant: '0',
      idempotencyKey: clubJoinIdem,
    }),
  });

  const denied = await json(`/joins/${clubJoin.joinId}/apply`, {
    method: 'POST',
    headers: bearer(clubForeign.session.accessToken),
  });
  assert(denied.status === 403 || denied.raw.includes('club_member_required'), 'non-member denied');

  const allowed = await json(`/joins/${clubJoin.joinId}/apply`, {
    method: 'POST',
    headers: bearer(clubMember.session.accessToken),
  });
  assert(allowed.status >= 200 && allowed.status < 300, 'member apply OK');

  console.log('PARTICIPATION_LIFECYCLE_DEV_E2E_PASS');
}

main().catch((e) => {
  console.error(e instanceof Error ? (e.stack ?? e.message) : e);
  process.exit(1);
});
