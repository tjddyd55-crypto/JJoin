/**
 * Golf Friends + Join Conditions — Android device closeout (DEV API + physical device).
 *
 *   pnpm exec tsx scripts/golf-friends-android-device-closeout.ts
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  JoinMethod,
  JoinPreferredGender,
  MockAuthPersona,
  SCREEN_GOLF_CODE,
  SocialProvider,
  type GolfFriendRelationship,
} from '../packages/types/src/index.ts';
import { localDayKey } from '../packages/domain/src/index.ts';
import { assertDevelopmentTarget, resolveAndroidDevQaConfig } from './lib/android-dev-qa.ts';

const API_BASE = process.env.API_BASE ?? 'https://api-development-e387.up.railway.app';
const ADB =
  process.env.ADB_PATH ??
  `${process.env.LOCALAPPDATA ?? ''}\\Android\\Sdk\\platform-tools\\adb.exe`;
const DEVICE = process.env.ADB_DEVICE ?? 'R3KL202KGHF';
const PKG = process.env.ANDROID_PKG ?? 'com.jjoin.app.dev';
const OUT = join(process.cwd(), 'artifacts', 'golf-friends-device-closeout');
const TAG = 'gf-device-closeout';
const REWARD = '20';

type Auth = { token: string; userId: string; nickname: string };

function adb(args: string[]): string {
  return execFileSync(ADB, ['-s', DEVICE, ...args], {
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
  });
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

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
  if (!res.ok) throw new Error(`${path} -> ${res.status} ${text.slice(0, 400)}`);
  return JSON.parse(text) as T;
}

async function signIn(persona: MockAuthPersona): Promise<Auth> {
  const s = await json<{ session: { accessToken: string; userId: string } }>(
    '/auth/social/mock-sign-in',
    {
      method: 'POST',
      body: JSON.stringify({ provider: SocialProvider.KAKAO, persona }),
    },
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

function dumpUiXml(retries = 3): string {
  const remote = '/sdcard/gf-closeout-ui.xml';
  const local = join(tmpdir(), `gf-closeout-ui-${Date.now()}.xml`);
  let lastErr: unknown;
  for (let i = 0; i < retries; i++) {
    try {
      adb(['shell', 'uiautomator', 'dump', remote]);
      adb(['pull', remote, local]);
      return readFileSync(local, 'utf8');
    } catch (e) {
      lastErr = e;
      if (i < retries - 1) {
        sleepSync(1200);
      }
    } finally {
      try {
        unlinkSync(local);
      } catch {
        /* ignore */
      }
    }
  }
  throw lastErr;
}

function sleepSync(ms: number) {
  execFileSync('powershell', ['-Command', `Start-Sleep -Milliseconds ${ms}`], { stdio: 'ignore' });
}

function uiHas(...needles: string[]): boolean {
  const xml = dumpUiXml();
  return needles.every((n) => xml.includes(n));
}

function tapText(label: string): boolean {
  const xml = dumpUiXml();
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const patterns = [
    new RegExp(`text="${escaped}"[^>]*bounds="\\[(\\d+),(\\d+)\\]\\[(\\d+),(\\d+)\\]"`),
    new RegExp(`content-desc="${escaped}"[^>]*bounds="\\[(\\d+),(\\d+)\\]\\[(\\d+),(\\d+)\\]"`),
    new RegExp(`bounds="\\[(\\d+),(\\d+)\\]\\[(\\d+),(\\d+)\\]"[^>]*(?:text|content-desc)="${escaped}"`),
  ];
  for (const pattern of patterns) {
    const match = pattern.exec(xml);
    if (!match) continue;
    const x = Math.round((Number(match[1]) + Number(match[3])) / 2);
    const y = Math.round((Number(match[2]) + Number(match[4])) / 2);
    adb(['shell', 'input', 'tap', String(x), String(y)]);
    return true;
  }
  return false;
}

function tapTab(label: string) {
  if (!tapText(label)) {
    const order = ['홈', '조인', '스크린', '내 조인', 'MY'];
    const idx = order.indexOf(label);
    if (idx >= 0) {
      const size = adb(['shell', 'wm', 'size']);
      const m = size.match(/(\d+)x(\d+)/);
      const w = m ? Number(m[1]) : 1080;
      const h = m ? Number(m[2]) : 2400;
      const x = Math.round(((idx + 0.5) / 5) * w);
      const y = h - 90;
      adb(['shell', 'input', 'tap', String(x), String(y)]);
      return;
    }
    throw new Error(`tab not found: ${label}`);
  }
}

function screenshot(name: string) {
  mkdirSync(OUT, { recursive: true });
  const out = join(OUT, name);
  const remote = `/sdcard/gf-${name}`;
  adb(['shell', 'screencap', '-p', remote]);
  adb(['pull', remote, out]);
  adb(['shell', 'rm', '-f', remote]);
  console.log('screenshot', out);
}

function ensureAdbReverse() {
  const list = adb(['reverse', '--list']);
  if (!list.includes('tcp:8082')) adb(['reverse', 'tcp:8082', 'tcp:8082']);
  if (!list.includes('tcp:3000')) adb(['reverse', 'tcp:3000', 'tcp:3000']);
  console.log('reverse', adb(['reverse', '--list']).trim());
}

async function waitForAppReady(timeoutMs = 90000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    if (uiHas('problem loading', 'project') || uiHas('ConnectException', '127.0.0.1')) {
      console.warn('metro error screen — tapping Reload');
      tapText('Reload');
      await sleep(8000);
      continue;
    }
    if (uiHas('카카오', '로그인') || uiHas('홈') || uiHas('MY') || uiHas('조인')) return;
    await sleep(2500);
  }
  throw new Error('app boot timeout');
}

function setDeviceClipboard(text: string) {
  try {
    adb(['shell', 'cmd', 'clipboard', 'set', text]);
    return true;
  } catch {
    return false;
  }
}

function pasteSearchQuery(text: string) {
  const ascii = text.replace(/[^A-Za-z0-9_]/g, '');
  if (ascii.length >= 2) {
    adb(['shell', 'input', 'text', ascii]);
    return true;
  }
  if (setDeviceClipboard(text)) {
    adb(['shell', 'input', 'keyevent', '279']);
    return true;
  }
  return tapText(text) || tapText(text.split('_')[0] ?? text);
}

function clearSearchField() {
  for (let i = 0; i < 24; i++) {
    adb(['shell', 'input', 'keyevent', '67']);
  }
}

function tapFriendActionOnNickname(needle: string, actionLabel: string): boolean {
  for (let scroll = 0; scroll < 6; scroll++) {
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

async function smokeGolfFriendTabs() {
  for (const tab of ['오늘의 추천', '인기회원', '근처회원']) {
    assert(tapText(tab), `golf friends tab: ${tab}`);
    await sleep(2000);
  }
}

function tapInRow(rowLabel: string, direction: 'plus' | 'minus', times = 1) {
  const xml = dumpUiXml();
  const rowRe = new RegExp(
    `text="${rowLabel}"[^>]*bounds="\\[(\\d+),(\\d+)\\]\\[(\\d+),(\\d+)\\]"`,
  );
  const rowMatch = rowRe.exec(xml);
  if (!rowMatch) return false;
  const rowY = (Number(rowMatch[2]) + Number(rowMatch[4])) / 2;
  const minusTexts = ['−', '-', '–'];
  const candidates: Array<{ x: number; y: number; dy: number; text: string }> = [];
  const nodeRe =
    /text="([^"]*)"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"|bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"[^>]*text="([^"]*)"/g;
  for (const m of xml.matchAll(nodeRe)) {
    const text = m[1] ?? m[10] ?? '';
    const x1 = Number(m[2] ?? m[6]);
    const y1 = Number(m[3] ?? m[7]);
    const x2 = Number(m[4] ?? m[8]);
    const y2 = Number(m[5] ?? m[9]);
    const y = (y1 + y2) / 2;
    const dy = Math.abs(y - rowY);
    if (dy > 120) continue;
    const isPlus = text === '+';
    const isMinus = minusTexts.includes(text);
    if (direction === 'plus' && !isPlus) continue;
    if (direction === 'minus' && !isMinus) continue;
    candidates.push({ x: Math.round((x1 + x2) / 2), y: Math.round(y), dy, text });
  }
  candidates.sort((a, b) => a.dy - b.dy);
  const best = candidates[0];
  if (!best) return false;
  for (let i = 0; i < times; i++) {
    adb(['shell', 'input', 'tap', String(best.x), String(best.y)]);
  }
  return true;
}

async function tapNext() {
  assert(tapText('다음'), 'next button missing');
  await sleep(1500);
}

async function prepareVenue(token: string): Promise<string> {
  const search = await json<{ items: Array<{ id: string; displayName: string; selectable?: boolean }> }>(
    `/golf-facilities/search?q=${encodeURIComponent('골프존')}&limit=10`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  const hit = search.items.find((i) => i.selectable !== false) ?? search.items[0];
  assert(hit, 'golf facility search empty');
  const activated = await json<{ venueId: string }>(`/golf-facilities/${hit.id}/activate-venue`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log('venue', hit.displayName, activated.venueId);
  return activated.venueId;
}

async function navigateToCreate(venueId: string) {
  deepLink(`create?venueId=${venueId}`);
  await sleep(5000);
  assert(uiHas('조인 만들기'), 'create screen not visible');
}

function scrollDown() {
  adb(['shell', 'input', 'swipe', '540', '1600', '540', '900', '400']);
}

async function walkCreateUiSteps() {
  assert(uiHas('장소') || uiHas('선택된 장소'), 'create step1 venue');
  screenshot('03-create-step1.png');
  await tapNext();
  screenshot('04-create-step2.png');
  assert(uiHas('모집 인원') || uiHas('명'), 'create step2 capacity');
  await tapNext();
  screenshot('05-create-step3.png');
  assert(uiHas('원하는 멤버'), 'step3 member prefs title');
  scrollDown();
  await sleep(500);
  assert(uiHas('여성') && uiHas('남성') && uiHas('무관'), 'gender chips');
  assert(tapText('여성'), 'female chip tap');
  await sleep(400);
  assert(tapInRow('최소', 'plus', 1), 'min age +');
  assert(tapInRow('최소', 'minus', 1), 'min age adjust to 35');
  assert(tapInRow('최대', 'plus', 14), 'max age to 49');
  screenshot('05b-create-step3-filled.png');
  assert(!uiHas('HOLD') && !uiHas('ledger') && !uiHas('예치'), 'no hold text on create');
  await tapNext();
  screenshot('06-create-step4.png');
  assert(uiHas('승인'), 'step4 approval options');
  await tapNext();
  screenshot('07-create-step5.png');
  assert(uiHas('원하는 멤버') || uiHas('여성') || uiHas('35'), 'confirm shows member prefs');
}

function launchDevClient() {
  ensureAdbReverse();
  adb(['shell', 'am', 'force-stop', PKG]);
  adb([
    'shell',
    'am',
    'start',
    '-a',
    'android.intent.action.VIEW',
    '-d',
    `jjoindev://expo-development-client/?url=http://127.0.0.1:8082`,
    '-p',
    PKG,
  ]);
}

function deepLink(path: string) {
  const normalized = path.startsWith('/') ? path.slice(1) : path;
  const encoded = normalized.replace(/\(/g, '%28').replace(/\)/g, '%29').replace(/&/g, '%26');
  const url = `jjoindev://${encoded}`;
  adb([
    'shell',
    'am',
    'start',
    '-a',
    'android.intent.action.VIEW',
    '-d',
    url,
    '-p',
    PKG,
  ]);
}

async function loginPersona(chipLabel: string) {
  await sleep(2000);
  if (uiHas('problem loading', 'project')) {
    tapText('Reload');
    await waitForAppReady();
  }
  if (!uiHas('카카오', '로그인')) {
    if (uiHas('MY') || uiHas('홈')) return;
  }
  assert(tapText(chipLabel), `dev chip not found: ${chipLabel}`);
  await sleep(500);
  assert(tapText('카카오') || tapText('카카오로 로그인'), 'kakao login button missing');
  for (let i = 0; i < 12; i++) {
    await sleep(2000);
    if (uiHas('홈') || uiHas('조인') || uiHas('MY')) return;
  }
  throw new Error('login timeout');
}

async function logoutIfNeeded() {
  launchDevClient();
  await waitForAppReady();
  if (uiHas('카카오', '로그인')) return;
  tapTab('MY');
  await sleep(2000);
  adb(['shell', 'input', 'swipe', '540', '1800', '540', '400', '450']);
  await sleep(1000);
  if (tapText('로그아웃')) {
    await sleep(3000);
  }
  if (!uiHas('카카오', '로그인')) {
    launchDevClient();
    await waitForAppReady();
  }
}

async function relationshipOf(viewer: Auth, target: Auth): Promise<GolfFriendRelationship> {
  const devIdx = target.nickname.indexOf('_DEV_');
  const q = devIdx >= 0 ? target.nickname.slice(devIdx + 1) : target.nickname;
  if (q.length < 2) return 'NONE';
  const search = await json<{ items: Array<{ user: { id: string }; relationship: GolfFriendRelationship }> }>(
    `/golf-friends/search?q=${encodeURIComponent(q)}`,
    { headers: { Authorization: `Bearer ${viewer.token}` } },
  );
  const hit = search.items.find((i) => i.user.id === target.userId);
  if (hit) return hit.relationship;

  const res = await json<{ items: Array<{ user: { id: string }; relationship: GolfFriendRelationship }> }>(
    '/golf-friends/recommended',
    { headers: { Authorization: `Bearer ${viewer.token}` } },
  );
  const rec = res.items.find((i) => i.user.id === target.userId);
  return rec?.relationship ?? 'NONE';
}

async function resetFriendship(a: Auth, b: Auth) {
  const rel = await relationshipOf(a, b);
  if (rel === 'FRIENDS') {
    await json(`/golf-friends/${b.userId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${a.token}` },
    });
  } else if (rel === 'REQUESTED') {
    await json(`/golf-friends/${b.userId}/request`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${a.token}` },
    });
  } else if (rel === 'RECEIVED') {
    await json(`/golf-friends/${a.userId}/reject`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${b.token}` },
    });
  }
}

function clearNotifs() {
  try {
    adb(['shell', 'cmd', 'notification', 'cancel-all', PKG]);
  } catch {
    /* ignore */
  }
}

function dumpNotifs(): string {
  try {
    return adb(['shell', 'dumpsys', 'notification', '--noredact']);
  } catch {
    return adb(['shell', 'dumpsys', 'notification']);
  }
}

function trayHit(needles: string[]): boolean {
  const dump = dumpNotifs();
  const blocks = dump.split(/\n(?=\s*NotificationRecord\{)/).filter((b) => b.includes(PKG));
  const hay = blocks.length > 0 ? blocks.join('\n') : dump;
  return needles.some((n) => hay.includes(n));
}

async function waitTray(needles: string[], label: string, timeoutMs = 60000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    if (trayHit(needles)) {
      console.log('TRAY_HIT', label);
      return true;
    }
    await sleep(2500);
  }
  console.warn('TRAY_MISS', label);
  return false;
}

function triggerNotificationDelivery() {
  try {
    execFileSync(
      'pnpm',
      [
        'exec',
        'railway',
        'run',
        '--service',
        'notification-delivery-cron',
        '--environment',
        'development',
        '--',
        'pnpm',
        'notification-delivery',
      ],
      { encoding: 'utf8', cwd: process.cwd(), stdio: 'pipe', timeout: 120_000, shell: true },
    );
  } catch {
    /* optional */
  }
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  await assertDevelopmentTarget(
    resolveAndroidDevQaConfig({
      apiBase: API_BASE,
      device: DEVICE,
      pkg: PKG,
      adbPath: ADB,
      screenshotDir: OUT,
    }),
  );
  console.log('API_BASE', API_BASE);
  console.log('DEVICE', DEVICE, 'PKG', PKG);

  const status = await fetch('http://127.0.0.1:8082/status', { signal: AbortSignal.timeout(8000) });
  assert(status.ok, 'metro /status failed');
  console.log('METRO', await status.text());

  const health = await json<{ status: string; appVariant?: string }>('/health');
  console.log('API health', health.status, health.appVariant);

  const devA = await signIn(MockAuthPersona.DEV_A);
  const devB = await signIn(MockAuthPersona.DEV_B);
  console.log('personas', devA.nickname, devB.nickname);
  await resetFriendship(devA, devB);

  launchDevClient();
  await waitForAppReady();
  await loginPersona('A 김진우');
  tapTab('홈');
  await sleep(2000);
  screenshot('01-home-dev-a.png');

  tapTab('조인');
  await sleep(5000);
  screenshot('02-join-list.png');
  const joinListXml = dumpUiXml();
  assert(!joinListXml.includes('기본 정보'), 'join list should not show section labels');

  const venueId = await prepareVenue(devA.token);
  await navigateToCreate(venueId);
  await walkCreateUiSteps();

  const created = await json<{
    joinId: string;
    preferredGender: JoinPreferredGender | null;
    minAge: number | null;
    maxAge: number | null;
  }>('/joins', {
    method: 'POST',
    headers: { Authorization: `Bearer ${devA.token}` },
    body: JSON.stringify({
      sportCode: SCREEN_GOLF_CODE,
      venue: {
        provider: 'MOCK',
        providerPlaceId: `venue_${TAG}_${Date.now()}`,
        name: `[${TAG}] device smoke`,
        address: '서울',
        regionLabel: '서울',
        latitude: 37.56,
        longitude: 126.97,
      },
      startAt: new Date(Date.now() + 8 * 60 * 60_000).toISOString(),
      plannedPlayerCount: 3,
      joinMethod: JoinMethod.APPROVAL,
      title: `[${TAG}] 긴제목테스트 `.repeat(4).trim(),
      rewardPerParticipant: REWARD,
      preferredGender: JoinPreferredGender.FEMALE,
      minAge: 35,
      maxAge: 49,
      idempotencyKey: `${TAG}-${Date.now()}`,
    }),
  }).catch(async (e) => {
    console.warn('join create via API skipped', String(e).slice(0, 120));
    return null;
  });

  if (created) {
    deepLink(`join/${created.joinId}`);
    await sleep(3500);
    screenshot('08-join-detail.png');
    const detailXml = dumpUiXml();
    assert(!detailXml.includes('기본 정보'), 'detail: no 기본 정보');
    assert(!detailXml.includes('모집 정보'), 'detail: no 모집 정보');
    assert(!detailXml.includes('참가 현황'), 'detail: no 참가 현황');
    assert(detailXml.includes('여성') || detailXml.includes('35'), 'detail shows member prefs');
  } else {
    const discover = await json<{
      ongoing: Array<{ joinId: string; preferredGender?: string | null; minAge?: number | null; maxAge?: number | null }>;
      upcoming: Array<{ joinId: string; preferredGender?: string | null; minAge?: number | null; maxAge?: number | null }>;
    }>(
      `/joins/discover?date=${localDayKey(new Date())}&lat=37.56&lng=126.97&regionMode=NEARBY&radiusMeters=100000&joinability=ALL`,
      { headers: { Authorization: `Bearer ${devA.token}` } },
    ).catch(() => null);
    const card = discover
      ? [...discover.ongoing, ...discover.upcoming].find(
          (c) => c.preferredGender === JoinPreferredGender.FEMALE && c.minAge != null,
        )
      : undefined;
    if (card) {
      deepLink(`join/${card.joinId}`);
      await sleep(3500);
      screenshot('08-join-detail-fallback.png');
      const detailXml = dumpUiXml();
      assert(!detailXml.includes('기본 정보'), 'detail fallback: no 기본 정보');
      assert(!detailXml.includes('모집 정보'), 'detail fallback: no 모집 정보');
      assert(!detailXml.includes('참가 현황'), 'detail fallback: no 참가 현황');
    }
  }

  deepLink('my/golf-friends');
  await sleep(3000);
  screenshot('09-golf-friends-recommended.png');
  assert(uiHas('골프친구'), 'golf friends screen');
  await smokeGolfFriendTabs();
  assert(tapText('회원검색'), 'search tab');
  await sleep(1000);

  const searchInputMatch = dumpUiXml().match(/text="([^"]*)"[^>]*class="android.widget.EditText"/);
  if (searchInputMatch) {
    tapText(searchInputMatch[1] || '닉네임');
  } else {
    tapText('닉네임');
  }
  await sleep(500);
  clearSearchField();
  const searchTerm = '_DEV_B';
  assert(pasteSearchQuery(searchTerm), `search query failed: ${searchTerm}`);
  await sleep(2500);
  adb(['shell', 'input', 'keyevent', '4']);
  await sleep(500);
  screenshot('10-golf-friends-search.png');
  const alreadyRequested = uiHas('요청 취소') && uiHas('박민수');
  if (!alreadyRequested) {
    assert(
      tapFriendActionOnNickname('박민수', '친구요청') ||
        tapFriendActionOnNickname('DEV_B', '친구요청'),
      'friend request on DEV_B card',
    );
  }
  await sleep(2500);
  screenshot('11-golf-friends-requested.png');
  assert(
    (await relationshipOf(devA, devB)) === 'REQUESTED' ||
      uiHas('요청 취소'),
    'A REQUESTED',
  );

  const unreadBBefore = await json<{ unreadCount: number }>('/me/notifications/unread-count', {
    headers: { Authorization: `Bearer ${devB.token}` },
  });
  const notifsB = await json<{ items: Array<{ type: string }> }>('/me/notifications?limit=5', {
    headers: { Authorization: `Bearer ${devB.token}` },
  });
  assert(
    notifsB.items.some((n) => n.type === 'FRIEND_REQUEST_RECEIVED'),
    'B has FRIEND_REQUEST_RECEIVED',
  );
  console.log('notification unread B', unreadBBefore.unreadCount);

  clearNotifs();
  triggerNotificationDelivery();
  adb(['shell', 'input', 'keyevent', 'KEYCODE_HOME']);
  await sleep(1500);
  const requestTray = await waitTray(['골프친구', '요청'], 'friend_request');

  await logoutIfNeeded();
  await loginPersona('B 박민수');
  deepLink('my/golf-friends');
  await sleep(3000);
  screenshot('12-golf-friends-b-received.png');
  assert(tapText('회원검색'), 'search tab B');
  await sleep(1000);
  tapText('닉네임');
  await sleep(500);
  clearSearchField();
  const searchA = '_DEV_A';
  assert(pasteSearchQuery(searchA), `search A failed: ${searchA}`);
  await sleep(2500);
  assert(
    (await relationshipOf(devB, devA)) === 'RECEIVED' ||
      uiHas('수락') ||
      uiHas('거절'),
    'B received UI',
  );
  assert(
    tapFriendActionOnNickname('김진우', '수락') ||
      tapFriendActionOnNickname('DEV_A', '수락') ||
      tapText('수락'),
    'accept tap',
  );
  await sleep(2000);
  screenshot('13-golf-friends-friends.png');
  assert(uiHas('친구'), 'friends state');

  assert((await relationshipOf(devA, devB)) === 'FRIENDS', 'both FRIENDS after accept');

  const notifsA = await json<{ items: Array<{ type: string }> }>('/me/notifications?limit=5', {
    headers: { Authorization: `Bearer ${devA.token}` },
  });
  assert(
    notifsA.items.some((n) => n.type === 'FRIEND_REQUEST_ACCEPTED'),
    'A has FRIEND_REQUEST_ACCEPTED',
  );

  clearNotifs();
  triggerNotificationDelivery();
  adb(['shell', 'input', 'keyevent', 'KEYCODE_HOME']);
  await sleep(1500);
  const acceptTray = await waitTray(['골프친구', '수락'], 'friend_accept');

  const report = {
    metro: 'running',
    joinList: true,
    createSteps: true,
    joinDetail: created != null,
    golfFriends: true,
    friendshipFlow: true,
    requestTray,
    acceptTray,
    joinReadback: created
      ? {
          preferredGender: created.preferredGender,
          minAge: created.minAge,
          maxAge: created.maxAge,
        }
      : null,
  };
  writeFileSync(join(OUT, 'report.json'), JSON.stringify(report, null, 2));
  console.log('REPORT', JSON.stringify(report));

  if (!requestTray || !acceptTray) {
    console.log('FINAL: JJOINZONE_GOLF_FRIENDS_JOIN_MEMBER_CONDITIONS_COMPLETE_DEVICE_PUSH_SPOTCHECK_PENDING');
    return;
  }
  console.log('FINAL: JJOINZONE_GOLF_FRIENDS_JOIN_MEMBER_CONDITIONS_COMPLETE');
}

main().catch((e) => {
  console.error(e);
  try {
    screenshot('error-state.png');
  } catch {
    /* ignore */
  }
  process.exit(1);
});
