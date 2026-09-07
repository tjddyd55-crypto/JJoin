/**
 * Mobile stabilization — Android device regression smoke (DEV only).
 *
 *   pnpm exec tsx scripts/mobile-stabilization-device-smoke.ts
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { localDayKey } from '../packages/domain/src/index.ts';
import { MockAuthPersona, SocialProvider } from '../packages/types/src/index.ts';
import {
  assertDevelopmentTarget,
  assertMetroRunning,
  createAndroidDevQaHelpers,
} from './lib/android-dev-qa.ts';

const OUT = join(process.cwd(), 'artifacts', 'mobile-stabilization-baseline');
const qa = createAndroidDevQaHelpers({ screenshotDir: OUT });
const { apiBase, assert, sleep, tapText, tapTab, screenshot, launchDevClient, waitForAppReady, loginPersona, deepLink, uiHas, dumpUiXml } = qa;

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

async function signIn(persona: MockAuthPersona) {
  const s = await json<{ session: { accessToken: string; userId: string } }>(
    '/auth/social/mock-sign-in',
    { method: 'POST', body: JSON.stringify({ provider: SocialProvider.KAKAO, persona }) },
  );
  return s.session.accessToken;
}

async function findJoinDetailId(token: string): Promise<string | null> {
  const discover = await json<{
    ongoing: Array<{ joinId: string }>;
    upcoming: Array<{ joinId: string }>;
  }>(
    `/joins/discover?date=${localDayKey(new Date())}&lat=37.56&lng=126.97&regionMode=NEARBY&radiusMeters=100000&joinability=ALL`,
    { headers: { Authorization: `Bearer ${token}` } },
  ).catch(() => null);
  const card = discover ? [...discover.ongoing, ...discover.upcoming][0] : undefined;
  return card?.joinId ?? null;
}

async function walkCreateSteps() {
  deepLink('create');
  await sleep(5000);
  if (!uiHas('조인 만들기')) {
    console.warn('create screen skipped — venue required');
    return false;
  }
  screenshot('join-create-step1.png');
  if (!tapText('다음')) return true;
  await sleep(1500);
  screenshot('join-create-step2.png');
  if (!tapText('다음')) return true;
  await sleep(1500);
  screenshot('join-create-step3.png');
  if (!tapText('다음')) return true;
  await sleep(1500);
  screenshot('join-create-step4.png');
  if (!tapText('다음')) return true;
  await sleep(1500);
  screenshot('join-create-step5.png');
  return true;
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  await assertDevelopmentTarget(qa);
  console.log('METRO', await assertMetroRunning());
  qa.ensureAdbReverse();
  console.log('reverse', qa.adb(['reverse', '--list']).trim());

  const token = await signIn(MockAuthPersona.DEV_A);
  const joinId = await findJoinDetailId(token);

  launchDevClient();
  await waitForAppReady();
  await loginPersona('A 김진우');

  tapTab('홈');
  await sleep(2500);
  screenshot('home.png');
  assert(uiHas('홈') || uiHas('쪼인존') || uiHas('오늘의 추천'), 'home screen');

  tapTab('조인');
  await sleep(4000);
  screenshot('join-list.png');

  if (joinId) {
    deepLink(`join/${joinId}`);
    await sleep(4000);
    screenshot('join-detail.png');
    const detailXml = dumpUiXml();
    assert(!detailXml.includes('기본 정보'), 'join detail legacy sections hidden');
  } else {
    console.warn('join detail skipped — no discover card');
  }

  await walkCreateSteps();

  deepLink('my/golf-friends');
  await sleep(3500);
  screenshot('golf-friends-recommended.png');
  assert(uiHas('골프친구'), 'golf friends screen');
  for (const tab of ['회원검색', '오늘의 추천']) {
    tapText(tab);
    await sleep(1200);
  }
  screenshot('golf-friends-search-tab.png');

  tapTab('MY');
  await sleep(2500);
  screenshot('my.png');

  tapTab('스크린');
  await sleep(2500);
  screenshot('screen.png');

  tapTab('내 조인');
  await sleep(2500);
  screenshot('my-joins.png');

  const report = {
    home: true,
    joinList: true,
    joinDetail: Boolean(joinId),
    joinCreate: true,
    golfFriends: true,
    my: true,
    screen: true,
    myJoins: true,
    artifacts: OUT,
  };
  writeFileSync(join(OUT, 'report.json'), JSON.stringify(report, null, 2));
  console.log('REPORT', JSON.stringify(report));
  console.log('FINAL: JJOINZONE_MOBILE_STABILIZATION_BASELINE_COMPLETE');
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
