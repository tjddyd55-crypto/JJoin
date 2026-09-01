/**
 * Phase 2.5 — Club management Development API smoke.
 * Target: https://api-development-e387.up.railway.app
 */
import { MockAuthPersona, SocialProvider } from '../packages/types/src/index.ts';

const API = process.env.API_BASE ?? 'https://api-development-e387.up.railway.app';
const TAG = '[QA-CLUB-MGMT]';

async function j<T>(path: string, init?: RequestInit): Promise<{ status: number; body: T }> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  const text = await res.text();
  let body: T;
  try {
    body = JSON.parse(text) as T;
  } catch {
    throw new Error(`${path} non-json ${res.status}: ${text.slice(0, 200)}`);
  }
  return { status: res.status, body };
}

async function signIn(persona: MockAuthPersona) {
  const sign = await j<{ session: { accessToken: string } }>('/auth/social/mock-sign-in', {
    method: 'POST',
    body: JSON.stringify({ provider: SocialProvider.KAKAO, persona }),
  });
  if (sign.status >= 300) throw new Error(`sign-in ${persona} ${sign.status}`);
  return { Authorization: `Bearer ${sign.body.session.accessToken}` };
}

async function main() {
  console.log('API=', API);
  const ownerAuth = await signIn(MockAuthPersona.DEV_A);
  const memberAuth = await signIn(MockAuthPersona.DEV_B);
  const foreignAuth = await signIn(MockAuthPersona.DEV_ADMIN);

  const health = await j<{ ok?: boolean }>('/health');
  console.log('health', health.status, health.body);
  if (health.status !== 200) throw new Error('health failed');

  const mine = await j<{ items: Array<{ id: string; name: string }> }>('/clubs/mine', {
    headers: ownerAuth,
  });
  console.log('clubs/mine', mine.status, mine.body.items?.length ?? 0);
  if (mine.status !== 200) throw new Error('clubs/mine failed');

  const discover = await j<{ items: unknown[] }>('/clubs/discover', { headers: ownerAuth });
  console.log('clubs/discover', discover.status, discover.body.items?.length ?? 0);
  if (discover.status !== 200) throw new Error('clubs/discover failed');

  const qaClub = mine.body.items.find((c) => c.name.includes(TAG));
  if (!qaClub) {
    console.warn(`${TAG} club not found — run seed-club-management-qa.ts first`);
    return;
  }

  const dashboard = await j<{
    memberCount: number;
    eventsThisYear: number;
    attendedCount: number;
    attendanceRate: number | null;
  }>(`/clubs/${qaClub.id}/dashboard`, { headers: ownerAuth });
  console.log('dashboard', dashboard.status, dashboard.body);
  if (dashboard.status !== 200) throw new Error('dashboard failed');

  const events = await j<{ items: Array<{ id: string; title: string; remainingCapacity?: number | null }> }>(
    `/clubs/${qaClub.id}/events`,
    { headers: ownerAuth },
  );
  if (events.status !== 200) throw new Error('events list failed');
  const shortage = events.body.items.find((e) => e.title.includes('정원 부족'));
  if (!shortage) throw new Error('shortage event missing');
  console.log('shortage remaining', shortage.remainingCapacity);

  const detail = await j<{
    linkedJoinId?: string | null;
    golfFacilityId?: string | null;
    venueId?: string | null;
    memberAttendingCount?: number;
    externalParticipantCount?: number;
    totalOccupiedCount?: number;
    remainingCapacity?: number | null;
    attendances: Array<{ userId: string; response: string }>;
  }>(`/clubs/${qaClub.id}/events/${shortage.id}`, { headers: ownerAuth });
  console.log('event detail capacity', {
    internal: detail.body.memberAttendingCount,
    external: detail.body.externalParticipantCount,
    total: detail.body.totalOccupiedCount,
    remaining: detail.body.remainingCapacity,
    facility: detail.body.golfFacilityId,
    venue: detail.body.venueId,
    linkedJoin: detail.body.linkedJoinId,
  });
  if (detail.status !== 200) throw new Error('event detail failed');
  if (!detail.body.golfFacilityId || !detail.body.venueId) {
    throw new Error('SCREEN event missing golf facility / venue link');
  }
  if (!detail.body.linkedJoinId) throw new Error('linked urgent join missing');

  const prefill = await j<{
    venueId?: string | null;
    golfFacilityId?: string | null;
    remainingSeats: number;
  }>(`/clubs/${qaClub.id}/events/${shortage.id}/urgent-recruit-prefill`, { headers: ownerAuth });
  console.log('urgent prefill', prefill.body);
  if (prefill.status !== 200) throw new Error('prefill failed');
  if (prefill.body.golfFacilityId !== detail.body.golfFacilityId) {
    throw new Error('prefill facility mismatch');
  }

  if (detail.body.linkedJoinId) {
    const chatPass = await j(`/joins/${detail.body.linkedJoinId}/chat`, { headers: memberAuth });
    console.log('member chat (expect 200 or membership path)', chatPass.status);

    const attendingMember = detail.body.attendances.find((a) => a.response === 'ATTENDING');
    if (attendingMember) {
      const declined = await j(`/clubs/${qaClub.id}/events/${shortage.id}/attendance/me`, {
        method: 'PATCH',
        headers: memberAuth,
        body: JSON.stringify({ response: 'DECLINED' }),
      });
      console.log('decline attendance', declined.status);
      if (declined.status === 200) {
        const chatDenied = await j(`/joins/${detail.body.linkedJoinId}/chat`, { headers: memberAuth });
        console.log('member chat after decline (expect 403)', chatDenied.status);
        if (chatDenied.status !== 403) {
          throw new Error('declined member should lose chat access');
        }
        await j(`/clubs/${qaClub.id}/events/${shortage.id}/attendance/me`, {
          method: 'PATCH',
          headers: memberAuth,
          body: JSON.stringify({ response: 'ATTENDING' }),
        });
      } else {
        console.log('skip decline chat revoke test — member not eligible or already external join participant');
      }
    }

    const foreignChat = await j(`/joins/${detail.body.linkedJoinId}/chat`, { headers: foreignAuth });
    console.log('foreign club chat (expect 403)', foreignChat.status);
    if (foreignChat.status !== 403) throw new Error('foreign club chat should be denied');
  }

  const accounting = await j<{ summary: { balance: string }; items: Array<{ id: string }> }>(
    `/clubs/${qaClub.id}/accounting?period=THIS_YEAR`,
    { headers: ownerAuth },
  );
  if (accounting.status !== 200 || !accounting.body.items.length) {
    throw new Error('accounting list failed');
  }
  const entryId = accounting.body.items[0]!.id;
  const updated = await j(`/clubs/${qaClub.id}/accounting/${entryId}`, {
    method: 'PATCH',
    headers: ownerAuth,
    body: JSON.stringify({ memo: `${TAG} smoke edit` }),
  });
  console.log('accounting update', updated.status);
  if (updated.status !== 200) throw new Error('accounting update failed');

  const notices = await j<{ items: Array<{ id: string }> }>(`/clubs/${qaClub.id}/notices`, {
    headers: ownerAuth,
  });
  console.log('notices', notices.status, notices.body.items?.length ?? 0);
  if (notices.status !== 200) throw new Error('notices failed');

  const members = await j<{ items: Array<{ status: string }> }>(`/clubs/${qaClub.id}/members`, {
    headers: ownerAuth,
  });
  const pending = members.body.items.filter((m) => m.status === 'PENDING').length;
  console.log('pending members', pending);

  console.log(`${TAG} smoke PASS`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
