/**
 * Age range selector device closeout.
 *   pnpm exec tsx scripts/age-range-device-closeout.ts
 */
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { MockAuthPersona, SocialProvider } from '../packages/types/src/index.ts';
import {
  assertDevelopmentTarget,
  createAndroidDevQaHelpers,
  resolveAndroidDevQaConfig,
} from './lib/android-dev-qa.ts';

const RANGED_CLUB_ID = process.env.AGE_RANGE_CLUB_ID ?? 'cc81ef83-875e-477e-8a70-52c56d1b6e04';

function pass(label: string) {
  console.log(`PASS: ${label}`);
}

async function apiJson<T>(apiBase: string, path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${apiBase}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  const raw = await res.text();
  if (!res.ok) throw new Error(`${path} -> ${res.status} ${raw.slice(0, 300)}`);
  return JSON.parse(raw) as T;
}

async function signIn(apiBase: string) {
  const body = await apiJson<{ session: { accessToken: string } }>(apiBase, '/auth/social/mock-sign-in', {
    method: 'POST',
    body: JSON.stringify({ provider: SocialProvider.KAKAO, persona: MockAuthPersona.DEV_A }),
  });
  return { Authorization: `Bearer ${body.session.accessToken}` };
}

async function prepareVenue(apiBase: string, auth: { Authorization: string }): Promise<string> {
  const facilities = await apiJson<{
    items: Array<{ id: string; selectable?: boolean }>;
  }>(apiBase, `/golf-facilities/search?q=${encodeURIComponent('골프존')}&limit=10`, { headers: auth });
  const facility = facilities.items.find((i) => i.selectable !== false) ?? facilities.items[0];
  if (!facility) throw new Error('golf facility required');
  const activated = await apiJson<{ venueId: string }>(
    apiBase,
    `/golf-facilities/${facility.id}/activate-venue`,
    { method: 'POST', headers: auth },
  );
  return activated.venueId;
}

async function main() {
  const config = resolveAndroidDevQaConfig({
    screenshotDir: join(process.cwd(), 'artifacts', 'age-range-device-closeout'),
  });
  await assertDevelopmentTarget(config);
  const qa = createAndroidDevQaHelpers(config);
  mkdirSync(config.screenshotDir, { recursive: true });

  const auth = await signIn(config.apiBase);
  const venueId = await prepareVenue(config.apiBase, auth);

  qa.ensureAdbReverse();
  await qa.ensureDevClientConnected({ retries: 3, forceStopOnRetry: true });
  await qa.waitForAppReady(120000);
  await qa.logoutIfNeeded();
  await qa.loginPersona('A 김진우');

  async function tapNext() {
    qa.scrollDown();
    let tapped = false;
    for (let i = 0; i < 8; i++) {
      if (qa.tapText('다음')) {
        tapped = true;
        break;
      }
      await qa.sleep(1500);
      qa.scrollDown();
    }
    qa.assert(tapped, 'next button missing');
    await qa.sleep(1500);
  }

  // Join Create Step3
  qa.deepLink(`create?venueId=${venueId}`);
  await qa.sleep(5000);
  qa.assert(qa.uiHas('조인 만들기'), 'create screen');
  qa.assert(
    qa.waitForUiHas('다음', 30000) || qa.waitForUiHas('골프', 15000),
    'create venue loaded',
  );
  await tapNext();
  qa.assert(qa.uiHas('모집 인원') || qa.uiHas('명'), 'create step2 capacity');
  await tapNext();
  qa.assert(qa.uiHas('연령대', '연령 제한 없음'), 'join step3 age section');
  qa.screenshot('01-join-age-default.png');
  pass('join-step3-visible');

  // Enable range via track tap (center-ish)
  qa.adb(['shell', 'input', 'tap', '540', '1280']);
  await qa.sleep(800);
  qa.assert(qa.uiHas('35세', '49세'), 'join default range label after track tap');
  pass('join-live-label-default');

  // Drag left handle right (+age) and right handle left (-age)
  qa.adb(['shell', 'input', 'swipe', '220', '1320', '320', '1320', '280']);
  await qa.sleep(500);
  qa.adb(['shell', 'input', 'swipe', '860', '1320', '760', '1320', '280']);
  await qa.sleep(600);
  qa.screenshot('02-join-age-adjusted.png');
  const xml = qa.dumpUiXml();
  qa.assert(xml.includes('세 ~') && xml.includes('세'), 'join adjusted range label present');
  pass('join-handle-drag');

  qa.tapText('연령 제한 없음');
  await qa.sleep(500);
  qa.assert(qa.uiHas('연령 무관'), 'join unrestricted label');
  pass('join-unrestricted');

  // Step5 summary
  await tapNext();
  await tapNext();
  qa.assert(qa.uiHas('원하는 멤버') && qa.uiHas('연령 무관'), 'join step5 member summary');
  qa.screenshot('03-join-step5-summary.png');
  pass('join-step5');

  // Club Create slider
  qa.deepLink('/my/clubs/create');
  await qa.sleep(2500);
  qa.scrollDown();
  qa.assert(qa.uiHas('가입 조건') || qa.uiHas('연령'), 'club create age section');
  qa.adb(['shell', 'input', 'tap', '540', '1500']);
  await qa.sleep(800);
  qa.adb(['shell', 'input', 'swipe', '240', '1540', '360', '1540', '300']);
  await qa.sleep(500);
  qa.screenshot('04-club-create-age.png');
  pass('club-create-slider');

  // Club Detail readback badge
  qa.deepLink(`/my/clubs/${RANGED_CLUB_ID}`);
  await qa.sleep(3000);
  qa.assert(qa.uiHas('31세', '55세'), 'club detail age badge');
  qa.screenshot('05-club-detail-age.png');
  pass('club-detail-readback');

  console.log('AGE_RANGE_DEVICE_SMOKE_PASS');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
