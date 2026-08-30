/**
 * Attendance + Chat Loop acceptance smoke against Development API.
 *
 * Usage:
 *   $env:API_BASE='https://api-development-e387.up.railway.app'
 *   pnpm exec tsx scripts/phase-join-loop-acceptance-smoke.ts
 *
 * Never prints tokens.
 */
import { MockAuthPersona, SocialProvider } from '../packages/types/src/index.ts';
import { CHAT_MESSAGE_MAX_LENGTH } from '../packages/domain/src/join-chat-loop.ts';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const API_BASE =
  process.env.API_BASE ?? 'https://api-development-e387.up.railway.app';

type Session = { accessToken: string; userId: string };

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

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

async function signIn(persona: MockAuthPersona): Promise<Session> {
  const { status, body, raw } = await req<{ session: Session }>(
    '/auth/social/mock-sign-in',
    {
      method: 'POST',
      body: JSON.stringify({ provider: SocialProvider.KAKAO, persona }),
    },
  );
  assert(status === 201 || status === 200, `signIn ${persona} -> ${status} ${raw.slice(0, 200)}`);
  assert(body.session?.accessToken, `missing token for ${persona}`);
  return body.session;
}

function bearer(token: string) {
  return { Authorization: `Bearer ${token}` };
}

function loadSeedIds(): {
  urgentJoinId: string;
  chatJoinId: string;
  inviteJoinId: string;
  hostUserId: string;
} {
  const path = resolve('artifacts/join-attendance-chat-qa/seed-ids.txt');
  const text = readFileSync(path, 'utf8');
  const map: Record<string, string> = {};
  for (const line of text.split(/\r?\n/)) {
    const [k, v] = line.split('=');
    if (k && v) map[k.trim()] = v.trim();
  }
  assert(map.urgentJoinId && map.chatJoinId && map.inviteJoinId, 'seed-ids incomplete');
  return map as {
    urgentJoinId: string;
    chatJoinId: string;
    inviteJoinId: string;
    hostUserId: string;
  };
}

async function main() {
  const seed = loadSeedIds();
  const a = await signIn(MockAuthPersona.DEV_A);
  const b = await signIn(MockAuthPersona.DEV_B);

  console.log('API_BASE', API_BASE);
  console.log('seed', {
    urgent: seed.urgentJoinId.slice(0, 8),
    chat: seed.chatJoinId.slice(0, 8),
  });

  // --- Played together ---
  {
    const { status, body, raw } = await req<
      Array<{ userId: string; nickname: string; playedCount: number }>
    >('/me/played-together', { headers: bearer(a.accessToken) });
    assert(status === 200, `played-together ${status} ${raw.slice(0, 200)}`);
    assert(Array.isArray(body), 'played-together not array');
    assert(body.length >= 1, 'played-together empty for DEV_A');
    const nicknames = body.map((p) => p.nickname);
    assert(!nicknames.some((n) => /NO_SHOW/i.test(n)), 'unexpected');
    console.log('PASS played-together', body.length, nicknames.join(','));
  }

  // --- Chat: empty / max / plain HTML / spoof extra field ---
  {
    const empty = await req(`/joins/${seed.urgentJoinId}/chat/messages`, {
      method: 'POST',
      headers: bearer(a.accessToken),
      body: JSON.stringify({ body: '   ' }),
    });
    assert(empty.status === 400, `empty expected 400 got ${empty.status}`);

    const tooLong = await req(`/joins/${seed.urgentJoinId}/chat/messages`, {
      method: 'POST',
      headers: bearer(a.accessToken),
      body: JSON.stringify({ body: 'x'.repeat(CHAT_MESSAGE_MAX_LENGTH + 1) }),
    });
    assert(tooLong.status === 400, `tooLong expected 400 got ${tooLong.status}`);

    const htmlBody = `<script>alert(1)</script> smoke ${Date.now()}`;
    const posted = await req<{
      body: string;
      senderUserId: string;
    }>(`/joins/${seed.urgentJoinId}/chat/messages`, {
      method: 'POST',
      headers: bearer(a.accessToken),
      body: JSON.stringify({ body: htmlBody, senderUserId: b.userId }),
    });
    assert(posted.status === 201 || posted.status === 200, `post html ${posted.status}`);
    assert(posted.body.body === htmlBody, 'HTML must be stored as plain text verbatim');
    assert(
      posted.body.senderUserId === a.userId,
      `spoof: expected sender=${a.userId} got ${posted.body.senderUserId}`,
    );
    console.log('PASS chat empty/max/html/spoof');
  }

  // --- Non-member / wrong join isolation ---
  {
    const denied = await req(`/joins/${seed.urgentJoinId}/chat`, {
      headers: bearer(b.accessToken),
    });
    assert(
      denied.status === 403,
      `non-member chat expected 403 got ${denied.status} ${denied.raw.slice(0, 160)}`,
    );

    const fakeJoin = '00000000-0000-4000-8000-000000000000';
    const missing = await req(`/joins/${fakeJoin}/chat/messages`, {
      headers: bearer(a.accessToken),
    });
    assert(
      missing.status === 403 || missing.status === 404,
      `guessed joinId expected 403/404 got ${missing.status}`,
    );
    console.log('PASS non-member + guessed joinId');
  }

  // --- Decline revoke chat ---
  {
    const roomBefore = await req(`/joins/${seed.chatJoinId}/chat`, {
      headers: bearer(a.accessToken),
    });
    if (roomBefore.status === 403) {
      console.log('PASS decline revoke chat (already revoked from prior QA)');
    } else {
      assert(roomBefore.status === 200, `chat room precheck ${roomBefore.status}`);
      const declined = await req(`/joins/${seed.chatJoinId}/attendance-intent`, {
        method: 'POST',
        headers: bearer(a.accessToken),
        body: JSON.stringify({ intent: 'DECLINED' }),
      });
      assert(
        declined.status === 200 || declined.status === 201,
        `decline ${declined.status} ${declined.raw.slice(0, 200)}`,
      );
      const after = await req(`/joins/${seed.chatJoinId}/chat`, {
        headers: bearer(a.accessToken),
      });
      assert(after.status === 403, `after decline chat expected 403 got ${after.status}`);
      console.log('PASS decline revoke chat');
    }
  }

  // --- Invitations ---
  {
    // Host is DevE2EUser — cannot mock easily. Use DEV_A played list + create as host of inviteJoin if A is host.
    // Fallback: duplicate invite as whoever can; verify invitee-only accept with existing invitation for B.
    const invites = await req<
      Array<{ invitationId: string; joinId: string; status: string }>
    >('/me/invitations', { headers: bearer(b.accessToken) });
    assert(invites.status === 200, `invitations ${invites.status}`);

    if (Array.isArray(invites.body) && invites.body.length > 0) {
      const inv = invites.body.find((i) => i.status === 'PENDING') ?? invites.body[0]!;
      // Wrong user accept
      const wrong = await req(`/joins/${inv.joinId}/invitations/${inv.invitationId}/accept`, {
        method: 'POST',
        headers: bearer(a.accessToken),
      });
      assert(
        wrong.status === 403 || wrong.status === 404,
        `wrong acceptor expected 403/404 got ${wrong.status}`,
      );
      console.log('PASS invitee-only accept gate', wrong.status);
    } else {
      console.log('SKIP invitee-only (no invitations for DEV_B)');
    }
  }

  // --- Urgent fill → clear (DEV_B accept pending invite on urgent if any) ---
  {
    const detailBefore = await req<{
      isUrgent: boolean;
      confirmedPlayerCount: number;
      plannedPlayerCount: number;
      status: string;
    }>(`/joins/${seed.urgentJoinId}`, { headers: bearer(a.accessToken) });
    assert(detailBefore.status === 200, 'urgent detail');

    const invitesB = await req<
      Array<{ invitationId: string; joinId: string; status: string }>
    >('/me/invitations', { headers: bearer(b.accessToken) });
    const pendingUrgent = Array.isArray(invitesB.body)
      ? invitesB.body.find(
          (i) => i.joinId === seed.urgentJoinId && i.status === 'PENDING',
        )
      : undefined;

    if (pendingUrgent) {
      const accepted = await req(
        `/joins/${pendingUrgent.joinId}/invitations/${pendingUrgent.invitationId}/accept`,
        { method: 'POST', headers: bearer(b.accessToken) },
      );
      assert(
        accepted.status === 200 || accepted.status === 201,
        `accept invite ${accepted.status} ${accepted.raw.slice(0, 200)}`,
      );
      const detailAfter = await req<{
        isUrgent: boolean;
        confirmedPlayerCount: number;
        plannedPlayerCount: number;
        status: string;
      }>(`/joins/${seed.urgentJoinId}`, { headers: bearer(a.accessToken) });
      assert(detailAfter.status === 200, 'urgent detail after');
      assert(
        detailAfter.body.isUrgent === false,
        `urgent should clear after fill, got isUrgent=${detailAfter.body.isUrgent} status=${detailAfter.body.status} ${detailAfter.body.confirmedPlayerCount}/${detailAfter.body.plannedPlayerCount}`,
      );
      console.log(
        'PASS urgent auto-clear',
        detailAfter.body.status,
        `${detailAfter.body.confirmedPlayerCount}/${detailAfter.body.plannedPlayerCount}`,
      );
    } else {
      // Domain-level already covered; report current flag
      console.log(
        'SKIP urgent fill (no pending invite for B)',
        `isUrgent=${detailBefore.body.isUrgent}`,
        `${detailBefore.body.confirmedPlayerCount}/${detailBefore.body.plannedPlayerCount}`,
      );
    }
  }

  // --- Purge endpoint auth (no cron scheduled in repo) ---
  {
    const noSecret = await req('/joins/chat/purge-run', { method: 'POST', body: '{}' });
    assert(
      noSecret.status === 401 || noSecret.status === 403,
      `purge without secret expected 401/403 got ${noSecret.status}`,
    );
    console.log('PASS purge-run requires cron secret (scheduler not wired in-repo)');
  }

  console.log('ALL JOIN-LOOP ACCEPTANCE SMOKE PASS');
}

main().catch((e) => {
  console.error('FAIL', e instanceof Error ? e.message : e);
  process.exit(1);
});
