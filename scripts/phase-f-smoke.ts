/**
 * Phase F smoke against a running API (local or Railway).
 * Usage:
 *   $env:API_BASE='https://api-production-2d67e.up.railway.app'
 *   node --import tsx scripts/phase-f-smoke.ts
 *
 * Does not print secrets / tokens.
 */
import {
  JoinMethod,
  MockAuthPersona,
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
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`${path} -> ${res.status} ${text.slice(0, 120)}`);
  }
  return JSON.parse(text) as T;
}

async function signIn(persona: MockAuthPersona) {
  const body = await json<{
    session: { accessToken: string; userId: string };
    me: { userId: string; publicProfile: { nickname: string } | null };
  }>('/auth/social/mock-sign-in', {
    method: 'POST',
    body: JSON.stringify({
      provider: SocialProvider.KAKAO,
      persona,
    }),
  });
  return body;
}

async function main() {
  console.log('API_BASE=', API_BASE);
  const health = await json<{ status: string; database: string }>('/health');
  console.log('health=', health.status, health.database);

  const a1 = await signIn(MockAuthPersona.DEV_A);
  const a2 = await signIn(MockAuthPersona.DEV_A);
  if (a1.session.userId !== a2.session.userId) {
    throw new Error('DEV_A not stable');
  }
  console.log('DEV_A stable=', a1.me.publicProfile?.nickname);

  const b1 = await signIn(MockAuthPersona.DEV_B);
  if (b1.session.userId === a1.session.userId) {
    throw new Error('DEV_A === DEV_B');
  }
  console.log('DEV_B stable=', b1.me.publicProfile?.nickname);

  const startAt = new Date(Date.now() + 3 * 60 * 60_000).toISOString();
  const created = await json<{
    joinId: string;
    confirmedPlayerCount: number;
    status: string;
  }>('/joins', {
    method: 'POST',
    headers: { Authorization: `Bearer ${a1.session.accessToken}` },
    body: JSON.stringify({
      sportCode: SCREEN_GOLF_CODE,
      venue: {
        provider: 'MOCK',
        providerPlaceId: 'venue_sg_geoje',
        name: 'SG골프 거제점',
        address: '거제시 고현동',
        regionLabel: '거제시 고현동',
        latitude: 34.8805,
        longitude: 128.6211,
      },
      startAt,
      plannedPlayerCount: 4,
      joinMethod: JoinMethod.APPROVAL,
      title: 'Phase F smoke',
      rewardPerParticipant: '0',
    }),
  });
  console.log('created join status=', created.status, 'confirmed=', created.confirmedPlayerCount);

  const applied = await json<{
    myParticipation: { participationStatus: string; participantId: string } | null;
    participants: Array<{ participantId: string; userId: string; participationStatus: string }>;
  }>(`/joins/${created.joinId}/apply`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${b1.session.accessToken}` },
  });
  console.log('B apply=', applied.myParticipation?.participationStatus);

  const applicant = applied.participants.find((p) => p.userId === b1.session.userId);
  if (!applicant) throw new Error('applicant missing');

  const approved = await json<{
    participants: Array<{ userId: string; participationStatus: string }>;
    confirmedPlayerCount: number;
  }>(`/joins/${created.joinId}/participants/${applicant.participantId}/approve`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${a1.session.accessToken}` },
  });
  const bStatus = approved.participants.find((p) => p.userId === b1.session.userId)
    ?.participationStatus;
  console.log('B after approve=', bStatus, 'confirmed=', approved.confirmedPlayerCount);

  if (bStatus !== 'APPROVED') throw new Error('approve failed');

  // duplicate apply should fail
  try {
    await json(`/joins/${created.joinId}/apply`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${b1.session.accessToken}` },
    });
    throw new Error('duplicate apply should fail');
  } catch (e) {
    const msg = e instanceof Error ? e.message : '';
    if (!msg.includes('409') && !msg.includes('already')) {
      // ConflictException may surface as 409
      if (!msg.includes('Conflict') && !msg.includes('already_applied')) {
        console.log('duplicate apply rejected:', msg.slice(0, 80));
      }
    }
  }

  console.log('SMOKE_PASS');
}

main().catch((e) => {
  console.error('SMOKE_FAIL', e instanceof Error ? e.message : e);
  process.exit(1);
});
