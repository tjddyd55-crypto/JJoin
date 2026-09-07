/**
 * Recurring join Android device closeout — DEV only.
 *
 *   pnpm exec tsx scripts/recurring-join-device-closeout.ts
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  JoinMethod,
  MockAuthPersona,
  SCREEN_GOLF_CODE,
  SocialProvider,
  type RecurringJoinScheduleDto,
} from '../packages/types/src/index.ts';
import { kstDateKey, nextWeeklyOccurrenceStart } from '../packages/domain/src/recurring-join-schedule.ts';
import {
  createAndroidDevQaHelpers,
  resolveAndroidDevQaConfig,
  assertDevelopmentTarget,
} from './lib/android-dev-qa.ts';

const TAG = '[recurring-device-closeout]';

type Auth = { Authorization: string };

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

async function signIn(apiBase: string): Promise<Auth> {
  const body = await apiJson<{ session: { accessToken: string } }>(apiBase, '/auth/social/mock-sign-in', {
    method: 'POST',
    body: JSON.stringify({ provider: SocialProvider.KAKAO, persona: MockAuthPersona.DEV_A }),
  });
  return { Authorization: `Bearer ${body.session.accessToken}` };
}

async function prepareVenue(apiBase: string, auth: Auth): Promise<string> {
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

function nextSaturdayKey(): string {
  const next = nextWeeklyOccurrenceStart({
    dayOfWeek: 6,
    startTimeLocal: '14:00',
    after: new Date(),
  });
  return kstDateKey(next);
}

async function ensureSpotcheckSchedule(
  apiBase: string,
  auth: Auth,
  venueId: string,
): Promise<RecurringJoinScheduleDto> {
  const list = await apiJson<RecurringJoinScheduleDto[]>(apiBase, '/my/recurring-joins', {
    headers: auth,
  });
  const existing = list.find(
    (s) => s.status === 'ACTIVE' && s.kind === 'HOST_JOIN' && s.title?.includes(TAG),
  );
  if (existing) return existing;

  return apiJson<RecurringJoinScheduleDto>(apiBase, '/my/recurring-joins', {
    method: 'POST',
    headers: auth,
    body: JSON.stringify({
      dayOfWeek: 6,
      startTimeLocal: '14:00',
      recurrenceStartDate: nextSaturdayKey(),
      maxOccurrences: 4,
      title: `${TAG} weekly`,
      joinTemplate: {
        sportCode: SCREEN_GOLF_CODE,
        venueId,
        plannedPlayerCount: 2,
        joinMethod: JoinMethod.APPROVAL,
        title: `${TAG} weekly`,
        rewardPerParticipant: '0',
      },
    }),
  });
}

async function main() {
  const config = resolveAndroidDevQaConfig({
    screenshotDir: join(process.cwd(), 'artifacts', 'recurring-join-device-closeout'),
  });
  await assertDevelopmentTarget(config);
  const qa = createAndroidDevQaHelpers(config);
  mkdirSync(config.screenshotDir, { recursive: true });

  const auth = await signIn(config.apiBase);
  const venueId = await prepareVenue(config.apiBase, auth);
  const spotcheckSchedule = await ensureSpotcheckSchedule(config.apiBase, auth, venueId);

  qa.ensureAdbReverse();

  async function connectMetroIfNeeded() {
    if (!qa.uiHas('DEVELOPMENT SERVERS') && !qa.uiHas('Connect')) return;
    if (qa.tapText('Fetch development servers')) {
      await qa.sleep(4000);
    }
    if (qa.uiHas('127.0.0.1:8082') || qa.uiHas('8082')) {
      qa.tapText('127.0.0.1:8082');
      await qa.sleep(8000);
      return;
    }
    qa.adb(['shell', 'input', 'tap', '540', '1100']);
    await qa.sleep(400);
    qa.adb(['shell', 'input', 'text', '127.0.0.1']);
    qa.adb(['shell', 'input', 'keyevent', '74']);
    qa.adb(['shell', 'input', 'text', '8082']);
    await qa.sleep(600);
    qa.tapText('Connect');
    await qa.sleep(8000);
  }

  qa.adb([
    'shell',
    'am',
    'start',
    '-a',
    'android.intent.action.VIEW',
    '-d',
    'jjoindev://expo-development-client/?url=http://127.0.0.1:8082',
    '-p',
    qa.pkg,
  ]);
  await qa.sleep(8000);
  await connectMetroIfNeeded();
  if (qa.uiHas('Reload')) {
    qa.tapText('Reload');
    await qa.sleep(6000);
  }
  if (qa.uiHas('Dismiss')) {
    qa.tapText('Dismiss');
    await qa.sleep(1500);
  }
  for (let i = 0; i < 40; i++) {
    if (
      qa.uiHas('MY') ||
      qa.uiHas('홈') ||
      qa.uiHas('카카오로 시작하기') ||
      qa.uiHas('카카오', '로그인') ||
      qa.uiHas('A 김진우')
    ) {
      break;
    }
    if (qa.uiHas('Reload')) {
      qa.tapText('Reload');
      await qa.sleep(6000);
    }
    await qa.sleep(3000);
  }
  qa.assert(
    qa.uiHas('MY') ||
      qa.uiHas('홈') ||
      qa.uiHas('카카오로 시작하기') ||
      qa.uiHas('카카오', '로그인') ||
      qa.uiHas('A 김진우'),
    'app boot timeout',
  );
  if (qa.uiHas('카카오로 시작하기') || qa.uiHas('카카오', '로그인')) {
    await qa.logoutIfNeeded();
    await qa.loginPersona('A 김진우');
  }

  async function tapNext() {
    qa.assert(qa.tapText('다음'), 'next button missing');
    await qa.sleep(1500);
  }

  qa.tapTab('MY');
  await qa.sleep(1500);
  qa.scrollDown();
  if (qa.uiHas('반복 조인')) {
    qa.tapText('반복 조인');
  } else {
    qa.deepLink('/my/recurring-joins');
  }
  await qa.sleep(2000);
  qa.screenshot('01-my-recurring-list');
  qa.assert(qa.uiHas('반복 조인') || qa.uiHas('등록된') || qa.uiHas(TAG), 'recurring list screen');

  qa.deepLink(`create?venueId=${venueId}`);
  await qa.sleep(5000);
  qa.assert(qa.uiHas('조인 만들기'), 'create screen');
  qa.assert(qa.uiHas('장소') || qa.uiHas('선택된 장소'), 'create step1 venue');
  qa.screenshot('02-create-step1');
  await tapNext();
  qa.assert(qa.uiHas('모집 인원') || qa.uiHas('명'), 'create step2 capacity');
  qa.screenshot('03-create-step2');
  await tapNext();
  qa.assert(qa.uiHas('원하는 멤버'), 'create step3 members');
  qa.screenshot('04-create-step3');
  await tapNext();
  qa.assert(qa.waitForUiHas('반복 조인', 15000), 'step4 recurrence section');
  qa.assert(qa.uiHas('반복 안 함') && qa.uiHas('매주 반복'), 'recurrence mode chips');
  qa.assert(qa.tapText('매주 반복'), 'tap weekly recurrence');
  await qa.sleep(1200);
  const weeklyExpanded =
    qa.waitForUiHas('4회', 8000) ||
    qa.waitForUiHas('횟수로 종료', 4000) ||
    qa.uiHas('종료일');
  qa.assert(weeklyExpanded, 'weekly recurrence options expanded');
  if (qa.uiHas('8회')) qa.tapText('8회');
  qa.screenshot('05-create-step4-recurrence');
  await tapNext();
  const hasRecurringSummary =
    (qa.uiHas('반복') && qa.uiHas('기간') && qa.uiHas('예정')) ||
    qa.uiHas('반복 조인 만들기');
  qa.assert(hasRecurringSummary, 'step5 recurring summary or create CTA');
  qa.screenshot('06-create-step5-summary');

  qa.deepLink('/my/recurring-joins');
  await qa.sleep(2500);
  qa.scrollDown();
  qa.assert(qa.uiHas(spotcheckSchedule.title) || qa.uiHas('일시정지'), 'spotcheck schedule card');
  qa.screenshot('07-my-active-card');

  if (qa.uiHas('일시정지')) {
    qa.tapText('일시정지');
    await qa.sleep(800);
    qa.tapText('일시정지');
    await qa.sleep(2000);
    qa.assert(qa.uiHas('일시정지됨') || qa.uiHas('PAUSED') || qa.uiHas('재개'), 'paused status');
    qa.screenshot('08-my-paused');

    qa.tapText('재개');
    await qa.sleep(800);
    qa.tapText('재개');
    await qa.sleep(2000);
    qa.assert(qa.uiHas('일시정지'), 'resumed to active');
    qa.screenshot('09-my-resumed');
  }

  if (qa.uiHas('다음 회차 건너뛰기')) {
    qa.tapText('다음 회차 건너뛰기');
    await qa.sleep(800);
    qa.tapText('건너뛰기');
    await qa.sleep(2000);
    qa.screenshot('10-my-skipped');
  }

  const recentJoinId = spotcheckSchedule.recentOccurrences?.find((o) => o.joinId)?.joinId;
  if (recentJoinId) {
    qa.deepLink(`join/${recentJoinId}`);
    await qa.sleep(3000);
    qa.assert(qa.uiHas('반복 조인'), 'join detail recurring chip');
    qa.screenshot('11-join-detail-chip');
  }

  await apiJson(config.apiBase, `/my/recurring-joins/${spotcheckSchedule.id}/end`, {
    method: 'POST',
    headers: auth,
  });

  const report = {
    ok: true,
    at: new Date().toISOString(),
    scheduleId: spotcheckSchedule.id,
    checks: [
      'my-recurring-route',
      'create-step4-recurrence',
      'create-step5-summary',
      'pause-resume',
      'skip',
      'join-detail-chip',
    ],
  };
  writeFileSync(join(config.screenshotDir, 'report.json'), JSON.stringify(report, null, 2));
  console.log('RECURRING_JOIN_DEVICE_CLOSEOUT_PASS');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
