/**
 * Phase R — AutoPay duplicate push check (server + optional tray).
 * Uses same API shapes as phase-r-android-tray-e2e.ts
 */
import {
  JoinMethod,
  MockAuthPersona,
  SocialProvider,
  SCREEN_GOLF_CODE,
} from '../packages/types/src/index.ts';

const API_BASE = process.env.API_BASE ?? 'https://api-production-2d67e.up.railway.app';
const CRON = process.env.SETTLEMENT_CRON_SECRET ?? '';

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
  if (!res.ok) throw new Error(`${path} -> ${res.status} ${text.slice(0, 240)}`);
  return (text ? JSON.parse(text) : null) as T;
}

async function signIn(persona: MockAuthPersona) {
  return json<{ session: { accessToken: string; userId: string } }>(
    '/auth/social/mock-sign-in',
    {
      method: 'POST',
      body: JSON.stringify({ provider: SocialProvider.KAKAO, persona }),
    },
  );
}

async function main() {
  const a = await signIn(MockAuthPersona.DEV_A);
  const b = await signIn(MockAuthPersona.DEV_B);
  const startAt = new Date(Date.now() + 6 * 60 * 60_000).toISOString();

  const created = await json<{ joinId: string }>('/joins', {
    method: 'POST',
    headers: { Authorization: `Bearer ${a.session.accessToken}` },
    body: JSON.stringify({
      sportCode: SCREEN_GOLF_CODE,
      venue: {
        provider: 'MOCK',
        providerPlaceId: `venue_pr_auto_${Date.now()}`,
        name: 'Phase R AutoPay',
        address: '거제시 고현동',
        regionLabel: '거제',
        latitude: 34.8805,
        longitude: 128.6211,
      },
      startAt,
      plannedPlayerCount: 4,
      joinMethod: JoinMethod.APPROVAL,
      title: `Phase R AutoPay ${Date.now()}`,
      rewardPerParticipant: '20',
    }),
  });

  const applied = await json<{
    myParticipation: { participantId: string } | null;
    participants: Array<{ participantId: string; userId: string }>;
  }>(`/joins/${created.joinId}/apply`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${b.session.accessToken}` },
  });
  const applicant =
    applied.myParticipation ??
    applied.participants.find((p) => p.userId === b.session.userId);
  if (!applicant?.participantId) throw new Error('missing participant');

  await json(
    `/joins/${created.joinId}/participants/${applicant.participantId}/approve`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${a.session.accessToken}` },
    },
  );

  await json(`/joins/${created.joinId}/settlements/_qa/advance-clock`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${a.session.accessToken}` },
    body: JSON.stringify({ mode: 'autopay' }),
  });

  const headers: Record<string, string> = {};
  if (CRON) headers['x-settlement-cron-secret'] = CRON;

  const run1 = await json<{ scanned: number; processed: number }>(
    '/settlement/autopay/run',
    { method: 'POST', headers },
  );
  const run2 = await json<{ scanned: number; processed: number }>(
    '/settlement/autopay/run',
    { method: 'POST', headers },
  );

  await new Promise((r) => setTimeout(r, 4000));

  const centerB = await json<{
    items?: Array<{ type: string; id: string; data?: { joinId?: string } }>;
  }>('/me/notifications?limit=50', {
    headers: { Authorization: `Bearer ${b.session.accessToken}` },
  });
  const rewards = (centerB.items ?? []).filter(
    (n) =>
      String(n.type).includes('REWARD') &&
      (n.data?.joinId === created.joinId || !n.data?.joinId),
  );
  const rewardsForJoin = (centerB.items ?? []).filter(
    (n) =>
      String(n.type).includes('REWARD') && n.data?.joinId === created.joinId,
  );

  const result = {
    joinId: created.joinId,
    participantId: applicant.participantId,
    run1,
    run2,
    rewardCountForJoin: rewardsForJoin.length,
    rewardTypesForJoin: rewardsForJoin.map((n) => n.type),
    rewardCountLoose: rewards.length,
    settlementIdempotent: run2.processed === 0 && run1.processed === 1,
  };
  console.log(JSON.stringify(result, null, 2));
  if (run1.processed !== 1) {
    throw new Error(`expected autopay processed=1, got ${run1.processed}`);
  }
  if (run2.processed !== 0) {
    throw new Error(`second autopay processed=${run2.processed} (expected 0)`);
  }
  if (rewardsForJoin.length !== 1) {
    throw new Error(
      `expected 1 reward notification for join, got ${rewardsForJoin.length}`,
    );
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
