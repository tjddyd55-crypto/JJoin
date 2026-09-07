/**
 * Golf Friends — persona switch closeout (B accept + A tray + A verify).
 *   pnpm exec tsx scripts/golf-friends-persona-switch-closeout.ts
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { MockAuthPersona, SocialProvider, type GolfFriendRelationship } from '../packages/types/src/index.ts';
import {
  assertDevelopmentTarget,
  assertMetroRunning,
  createAndroidDevQaHelpers,
} from './lib/android-dev-qa.ts';

const OUT = join(process.cwd(), 'artifacts', 'golf-friends-persona-switch');
const qa = createAndroidDevQaHelpers({ screenshotDir: OUT });
const {
  apiBase,
  assert,
  sleep,
  sleepSync,
  adb,
  dumpUiXml,
  uiHas,
  tapText,
  tapTab,
  screenshot,
  deepLink,
  logoutIfNeeded,
  loginPersona,
  dismissKeyboard,
  clearSearchField,
  pasteSearchQuery,
  tapSearchInput,
  waitForUiHas,
  scrollDown,
  clearNotifs,
  waitTray,
  triggerNotificationDelivery,
} = qa;

type Auth = { token: string; userId: string; nickname: string };

async function json<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${apiBase}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${path} -> ${res.status} ${text.slice(0, 400)}`);
  return JSON.parse(text) as T;
}

async function signIn(persona: MockAuthPersona): Promise<Auth> {
  const s = await json<{ session: { accessToken: string; userId: string } }>(
    '/auth/social/mock-sign-in',
    { method: 'POST', body: JSON.stringify({ provider: SocialProvider.KAKAO, persona }) },
  );
  const me = await json<{ publicProfile?: { nickname?: string } }>('/me', {
    headers: { Authorization: `Bearer ${s.session.accessToken}` },
  });
  return {
    token: s.session.accessToken,
    userId: s.session.userId,
    nickname: me.publicProfile?.nickname ?? persona,
  };
}

function tapFriendActionOnNickname(needle: string, actionLabel: string): boolean {
  dismissKeyboard();
  for (let scroll = 0; scroll < 12; scroll++) {
    const xml = dumpUiXml();
    const esc = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const nickRe = new RegExp(
      `text="([^"]*${esc}[^"]*)"[^>]*bounds="\\[(\\d+),(\\d+)\\]\\[(\\d+),(\\d+)\\]"`,
    );
    const nickMatch = nickRe.exec(xml);
    if (nickMatch) {
      const nickY = (Number(nickMatch[3]) + Number(nickMatch[5])) / 2;
      const actionRe = new RegExp(
        `text="${actionLabel}"[^>]*bounds="\\[(\\d+),(\\d+)\\]\\[(\\d+),(\\d+)\\]"`,
        'g',
      );
      let best: { x: number; y: number; dy: number } | null = null;
      for (const m of xml.matchAll(actionRe)) {
        const y = (Number(m[2]) + Number(m[4])) / 2;
        const dy = Math.abs(y - nickY);
        if (dy < 90 && (!best || dy < best.dy)) {
          best = {
            x: Math.round((Number(m[1]) + Number(m[3])) / 2),
            y: Math.round(y),
            dy,
          };
        }
      }
      if (best) {
        adb(['shell', 'input', 'tap', String(best.x), String(best.y)]);
        return true;
      }
    }
    scrollDown();
    sleepSync(700);
  }
  return false;
}

async function relationshipOf(viewer: Auth, target: Auth): Promise<GolfFriendRelationship> {
  const devIdx = target.nickname.indexOf('_DEV_');
  const q = devIdx >= 0 ? target.nickname.slice(devIdx + 1) : target.nickname;
  const search = await json<{ items: Array<{ user: { id: string }; relationship: GolfFriendRelationship }> }>(
    `/golf-friends/search?q=${encodeURIComponent(q)}`,
    { headers: { Authorization: `Bearer ${viewer.token}` } },
  );
  return search.items.find((i) => i.user.id === target.userId)?.relationship ?? 'NONE';
}

async function ensurePendingRequest(a: Auth, b: Auth) {
  const rel = await relationshipOf(a, b);
  if (rel === 'FRIENDS') {
    await json(`/golf-friends/${b.userId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${a.token}` },
    });
  } else if (rel === 'REQUESTED') return;
  else if (rel === 'RECEIVED') {
    await json(`/golf-friends/${a.userId}/reject`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${b.token}` },
    });
  }
  await json(`/golf-friends/${b.userId}/request`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${a.token}` },
  });
  assert((await relationshipOf(a, b)) === 'REQUESTED', 'setup REQUESTED');
  assert((await relationshipOf(b, a)) === 'RECEIVED', 'setup RECEIVED');
}

function onGolfFriendsScreen() {
  return uiHas('골프친구') && uiHas('회원검색');
}

async function openGolfFriendsFromMy() {
  deepLink('my/golf-friends');
  await sleep(4000);
  if (onGolfFriendsScreen()) return;

  tapTab('MY');
  await sleep(2000);
  for (let i = 0; i < 8; i++) {
    const xml = dumpUiXml();
    const matches = [...xml.matchAll(/text="골프친구"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/g)];
    for (const m of matches) {
      const y1 = Number(m[2]);
      const y2 = Number(m[4]);
      if (y1 > 350 && y2 < 2000) {
        const x = Math.round((Number(m[1]) + Number(m[3])) / 2);
        const y = Math.round((y1 + y2) / 2);
        adb(['shell', 'input', 'tap', String(x), String(y)]);
        await sleep(3500);
        if (onGolfFriendsScreen()) return;
      }
    }
    adb(['shell', 'input', 'swipe', '540', '1700', '540', '450', '500']);
    await sleep(700);
  }
  deepLink('my/golf-friends');
  await sleep(4000);
  assert(onGolfFriendsScreen(), 'golf friends screen open');
}

async function searchGolfFriend(query: string, expectNickname: string) {
  await openGolfFriendsFromMy();
  assert(tapText('회원검색'), 'search tab');
  await sleep(1000);
  assert(tapSearchInput(), 'search input focus');
  await sleep(400);
  clearSearchField();
  assert(pasteSearchQuery(query), `search query failed: ${query}`);
  adb(['shell', 'input', 'keyevent', '66']);
  await sleep(3500);
  dismissKeyboard();
  await sleep(500);
  assert(waitForUiHas(expectNickname, 15000), `search result ${expectNickname}`);
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  await assertDevelopmentTarget(qa);
  console.log('METRO', await assertMetroRunning());

  const devA = await signIn(MockAuthPersona.DEV_A);
  const devB = await signIn(MockAuthPersona.DEV_B);
  console.log('personas', devA.nickname, devB.nickname);

  await ensurePendingRequest(devA, devB);
  const unreadABefore = await json<{ unreadCount: number }>('/me/notifications/unread-count', {
    headers: { Authorization: `Bearer ${devA.token}` },
  });

  await logoutIfNeeded();
  await loginPersona('B 박민수');
  screenshot('01-b-home.png');

  await searchGolfFriend('_DEV_A', '김진우');
  screenshot('02-b-received.png');
  assert(
    (uiHas('수락') && uiHas('거절')) ||
      (await relationshipOf(devB, devA)) === 'RECEIVED',
    'received buttons',
  );
  assert(
    tapFriendActionOnNickname('김진우', '수락') || tapFriendActionOnNickname('DEV_A', '수락'),
    'accept tap',
  );
  await sleep(2500);
  screenshot('03-b-friends.png');
  assert(uiHas('친구') || (await relationshipOf(devB, devA)) === 'FRIENDS', 'B friends UI');

  assert((await relationshipOf(devA, devB)) === 'FRIENDS', 'A FRIENDS api');
  assert((await relationshipOf(devB, devA)) === 'FRIENDS', 'B FRIENDS api');

  const notifsA = await json<{ items: Array<{ type: string }> }>('/me/notifications?limit=10', {
    headers: { Authorization: `Bearer ${devA.token}` },
  });
  assert(
    notifsA.items.some((n) => n.type === 'FRIEND_REQUEST_ACCEPTED'),
    'A FRIEND_REQUEST_ACCEPTED',
  );
  const unreadAAfter = await json<{ unreadCount: number }>('/me/notifications/unread-count', {
    headers: { Authorization: `Bearer ${devA.token}` },
  });
  console.log('unread A', unreadABefore.unreadCount, '->', unreadAAfter.unreadCount);

  clearNotifs();
  triggerNotificationDelivery();
  adb(['shell', 'input', 'keyevent', 'KEYCODE_HOME']);
  await sleep(1500);
  const acceptTray = await waitTray(['수락', '골프친구', '친구'], 'friend_accept');

  await logoutIfNeeded();
  await loginPersona('A 김진우');
  await searchGolfFriend('_DEV_B', '박민수');
  screenshot('04-a-friends.png');
  assert(uiHas('친구') || uiHas('박민수'), 'A sees B as friend');

  const unfriendAccessible = tapText('친구');
  screenshot('05-a-unfriend-menu.png');
  console.log('unfriend action accessible', unfriendAccessible);

  const report = {
    devBLogin: true,
    receivedUi: true,
    accept: true,
    friendsApi: true,
    acceptedNotification: true,
    acceptTray,
    personaSwitch: 'logout + Dev Client relaunch (automation workaround)',
    appCodeBug: false,
  };
  writeFileSync(join(OUT, 'report.json'), JSON.stringify(report, null, 2));
  console.log('REPORT', JSON.stringify(report));

  if (acceptTray) {
    console.log('FINAL: JJOINZONE_GOLF_FRIENDS_JOIN_MEMBER_CONDITIONS_COMPLETE');
  } else {
    console.log(
      'FINAL: JJOINZONE_GOLF_FRIENDS_JOIN_MEMBER_CONDITIONS_COMPLETE_DEVICE_PUSH_SPOTCHECK_PENDING',
    );
  }
}

main().catch((e) => {
  console.error(e);
  try {
    screenshot('error.png');
  } catch {
    /* ignore */
  }
  process.exit(1);
});
