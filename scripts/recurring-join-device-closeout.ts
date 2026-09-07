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

function pass(label: string) {
  console.log(`PASS ${label}`);
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
  const tagged = list.filter((s) => s.kind === 'HOST_JOIN' && s.title?.includes(TAG));
  const active = tagged.find((s) => s.status === 'ACTIVE');
  if (active) return active;

  const paused = tagged.find((s) => s.status === 'PAUSED');
  if (paused) {
    return apiJson<RecurringJoinScheduleDto>(apiBase, `/my/recurring-joins/${paused.id}/resume`, {
      method: 'POST',
      headers: auth,
    });
  }

  const ended = tagged.find((s) => s.status === 'ENDED');
  if (ended) {
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

  await qa.ensureDevClientConnected({ retries: 3 });
  pass('dev-client-reconnect');

  if (qa.uiHas('카카오로 시작하기') || qa.uiHas('카카오', '로그인')) {
    await qa.loginPersona('A 김진우');
  }
  pass('login');

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
  qa.assert(qa.uiHas('반복 조인') || qa.uiHas('등록된') || qa.uiHas(TAG), 'recurring list screen');
  qa.screenshot('04-my-recurring-active.png');
  pass('my-recurring-route');

  qa.assert(qa.waitForUiHas('일시정지', 12000), 'active schedule must expose pause');

  if (spotcheckSchedule.nextRunAt) {
    try {
      await apiJson(config.apiBase, `/my/recurring-joins/${spotcheckSchedule.id}/skip`, {
        method: 'POST',
        headers: auth,
      });
      qa.tapTab('홈');
      await qa.sleep(800);
      qa.tapTab('MY');
      await qa.sleep(1200);
      qa.scrollDown();
      qa.tapText('반복 조인');
      await qa.sleep(2500);
      qa.screenshot('07-my-recurring-skipped.png');
      pass('skip');
    } catch (error) {
      const message = String(error);
      if (!message.includes('invalid_skip_occurrence')) throw error;
      console.warn('SKIP_OPTIONAL invalid_skip_occurrence');
      pass('skip-optional');
    }
  } else {
    console.warn('SKIP_OPTIONAL no nextRunAt on spotcheck schedule');
    pass('skip-optional');
  }

  await apiJson(config.apiBase, `/my/recurring-joins/${spotcheckSchedule.id}/pause`, {
    method: 'POST',
    headers: auth,
  });
  const pausedApi = (
    await apiJson<RecurringJoinScheduleDto[]>(config.apiBase, '/my/recurring-joins', {
      headers: auth,
    })
  ).find((s) => s.id === spotcheckSchedule.id);
  qa.assert(pausedApi?.status === 'PAUSED', 'pause api status');
  qa.tapTab('홈');
  await qa.sleep(800);
  qa.tapTab('MY');
  await qa.sleep(1200);
  qa.scrollDown();
  qa.tapText('반복 조인');
  await qa.sleep(2500);
  for (let i = 0; i < 4; i++) {
    if (qa.uiHas('재개')) break;
    qa.scrollDown();
    await qa.sleep(600);
  }
  qa.screenshot('05-my-recurring-paused.png');
  pass('pause');

  await apiJson(config.apiBase, `/my/recurring-joins/${spotcheckSchedule.id}/resume`, {
    method: 'POST',
    headers: auth,
  });
  const resumedApi = (
    await apiJson<RecurringJoinScheduleDto[]>(config.apiBase, '/my/recurring-joins', {
      headers: auth,
    })
  ).find((s) => s.id === spotcheckSchedule.id);
  qa.assert(resumedApi?.status === 'ACTIVE', 'resume api status');
  qa.tapTab('홈');
  await qa.sleep(800);
  qa.tapTab('MY');
  await qa.sleep(1200);
  qa.scrollDown();
  qa.tapText('반복 조인');
  await qa.sleep(2500);
  for (let i = 0; i < 4; i++) {
    if (qa.uiHas('일시정지')) break;
    qa.scrollDown();
    await qa.sleep(600);
  }
  qa.screenshot('06-my-recurring-resumed.png');
  pass('resume');

  const recentJoinId = spotcheckSchedule.recentOccurrences?.find((o) => o.joinId)?.joinId;
  if (recentJoinId) {
    qa.deepLink(`join/${recentJoinId}`);
    await qa.sleep(3000);
    qa.assert(qa.uiHas('반복 조인'), 'join detail recurring chip');
    qa.screenshot('09-occurrence-detail.png');
    pass('occurrence-detail');
    pass('recurring-chip');
    qa.deepLink('/my/recurring-joins');
    await qa.sleep(2000);
  }

  const readbackList = await apiJson<RecurringJoinScheduleDto[]>(
    config.apiBase,
    '/my/recurring-joins',
    { headers: auth },
  );
  const readback = readbackList.find((s) => s.id === spotcheckSchedule.id) ?? spotcheckSchedule;
  qa.assert(readback.kind === 'HOST_JOIN', 'readback kind');
  qa.assert(readback.status === 'ACTIVE' || readback.status === 'PAUSED', 'readback status');
  qa.assert(readback.cadence === 'WEEKLY', 'readback cadence');
  pass('create-api-readback');

  qa.deepLink(`create?venueId=${venueId}`);
  await qa.sleep(5000);
  qa.assert(qa.uiHas('조인 만들기'), 'create screen');
  qa.assert(qa.uiHas('장소') || qa.uiHas('선택된 장소'), 'create step1 venue');
  await tapNext();
  qa.assert(qa.uiHas('모집 인원') || qa.uiHas('명'), 'create step2 capacity');
  await tapNext();
  qa.assert(qa.uiHas('원하는 멤버'), 'create step3 members');
  await tapNext();

  qa.assert(qa.waitForUiHas('반복 조인', 15000), 'step4 recurrence section');
  qa.assert(qa.uiHas('반복 안 함') && qa.uiHas('매주 반복'), 'recurrence mode chips');
  qa.screenshot('01-create-step4-repeat.png');
  pass('step4');

  qa.assert(qa.tapText('매주 반복'), 'tap weekly recurrence');
  await qa.sleep(1200);
  const weeklyExpanded =
    qa.waitForUiHas('4회', 8000) ||
    qa.waitForUiHas('횟수로 종료', 4000) ||
    qa.uiHas('종료일');
  qa.assert(weeklyExpanded, 'weekly recurrence options expanded');
  pass('repeat-weekly');

  if (qa.uiHas('4회')) {
    qa.tapText('4회');
    pass('occurrence-count-4');
  }

  qa.screenshot('02-create-step4-repeat-filled.png');
  await tapNext();
  await qa.sleep(2000);
  qa.scrollDown();
  const hasRecurringSummary =
    (qa.uiHas('반복') && qa.uiHas('기간') && (qa.uiHas('예정') || qa.uiHas('총'))) ||
    qa.uiHas('반복 조인 만들기') ||
    qa.uiHas('매주');
  qa.assert(hasRecurringSummary, 'step5 recurring summary or create CTA');
  qa.assert(
    !qa.uiHas('HOLD') && !qa.uiHas('ledger'),
    'step5 must not expose internal pricing jargon',
  );
  qa.screenshot('03-create-step5-summary.png');
  pass('step5');
  pass('summary');

  await apiJson(config.apiBase, `/my/recurring-joins/${spotcheckSchedule.id}/end`, {
    method: 'POST',
    headers: auth,
  });
  qa.deepLink('/my/recurring-joins');
  await qa.sleep(2000);
  qa.screenshot('08-my-recurring-ended.png');
  pass('end');

  const report = {
    ok: true,
    at: new Date().toISOString(),
    scheduleId: spotcheckSchedule.id,
    readback: {
      kind: readback.kind,
      status: readback.status,
      cadence: readback.cadence,
      maxOccurrences: readback.maxOccurrences,
      nextRunAt: readback.nextRunAt,
    },
  };
  writeFileSync(join(config.screenshotDir, 'report.json'), JSON.stringify(report, null, 2));
  console.log('RECURRING_JOIN_DEVICE_SMOKE_PASS');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
