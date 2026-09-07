/**
 * Recurring join DEV API E2E — Railway development only.
 *
 *   $env:API_BASE='https://api-development-e387.up.railway.app'
 *   $env:SETTLEMENT_CRON_SECRET='...'
 *   pnpm exec tsx scripts/recurring-join-dev-e2e.ts
 */
import {
  JoinMethod,
  MockAuthPersona,
  SCREEN_GOLF_CODE,
  SocialProvider,
  type RecurringJoinScheduleDto,
} from '../packages/types/src/index.ts';
import { kstDateKey, nextWeeklyOccurrenceStart } from '../packages/domain/src/recurring-join-schedule.ts';

const API_BASE = process.env.API_BASE ?? 'https://api-development-e387.up.railway.app';
const CRON_SECRET = process.env.SETTLEMENT_CRON_SECRET ?? '';
const TAG = '[recurring-e2e]';
const ACTIVE_HOST_STATUSES = new Set(['OPEN', 'FULL', 'CONFIRMED', 'IN_PROGRESS']);

type Auth = { Authorization: string; userId: string };

async function j<T>(path: string, init?: RequestInit) {
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

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

async function signIn(persona: MockAuthPersona): Promise<Auth> {
  const { status, body } = await j<{ session: { accessToken: string; userId: string } }>(
    '/auth/social/mock-sign-in',
    { method: 'POST', body: JSON.stringify({ provider: SocialProvider.KAKAO, persona }) },
  );
  assert(status >= 200 && status < 300, `signIn ${persona} ${status}`);
  return { Authorization: `Bearer ${body.session.accessToken}`, userId: body.session.userId };
}

async function mustOk<T>(path: string, init?: RequestInit): Promise<T> {
  const { status, body, raw } = await j<T>(path, init);
  assert(status >= 200 && status < 300, `${path} -> ${status} ${raw.slice(0, 400)}`);
  return body;
}

async function mustFail(path: string, init?: RequestInit, expectStatus = 400) {
  const { status, raw } = await j(path, init);
  assert(status === expectStatus, `${path} expected ${expectStatus} got ${status} ${raw.slice(0, 200)}`);
}

async function cleanupBlockingHostedJoin(host: Auth) {
  const mine = await mustOk<{
    hosted: Array<{ joinId: string; status: string }>;
  }>('/joins/mine', { headers: host });
  const blocking = mine.hosted?.find((j) => ACTIVE_HOST_STATUSES.has(j.status));
  if (!blocking) return;
  const detail = await mustOk<{
    participants: Array<{ participantId: string; role: string; participationStatus: string }>;
  }>(`/joins/${blocking.joinId}`, { headers: host });
  const applied = detail.participants.find(
    (p) => p.role !== 'HOST' && p.participationStatus === 'APPLIED',
  );
  if (applied) {
    await mustOk(`/joins/${blocking.joinId}/participants/${applied.participantId}/approve`, {
      method: 'POST',
      headers: host,
    });
  }
  await mustOk(`/joins/${blocking.joinId}/settlements/_qa/advance-clock`, {
    method: 'POST',
    headers: host,
    body: JSON.stringify({ mode: 'open' }),
  });
}

async function runWorker() {
  assert(CRON_SECRET, 'SETTLEMENT_CRON_SECRET required');
  const { status, body } = await j<{ created: number; skipped: number; failed: number }>(
    '/joins/recurring/run',
    {
      method: 'POST',
      headers: {
        'x-settlement-cron-secret': CRON_SECRET,
        Authorization: `Bearer ${CRON_SECRET}`,
      },
      body: '{}',
    },
  );
  assert(status === 201 || status === 200, `worker ${status}`);
  return body;
}

function nextSaturdayKey(): string {
  const now = new Date();
  const next = nextWeeklyOccurrenceStart({
    dayOfWeek: 6,
    startTimeLocal: '14:00',
    after: now,
  });
  return kstDateKey(next);
}

async function main() {
  const health = await j<{ appVariant?: string }>('/health');
  assert(health.status === 200, 'health failed');
  assert(health.body.appVariant === 'development', 'development guard');

  const devA = await signIn(MockAuthPersona.DEV_A);
  const devB = await signIn(MockAuthPersona.DEV_B);
  await cleanupBlockingHostedJoin(devA);

  const facilities = await mustOk<{
    items: Array<{ id: string; displayName: string; selectable?: boolean }>;
  }>(`/golf-facilities/search?q=${encodeURIComponent('골프존')}&limit=10`, {
    headers: devA,
  });
  const facility = facilities.items.find((i) => i.selectable !== false) ?? facilities.items[0];
  assert(facility, 'golf facility required');
  const activated = await mustOk<{ venueId: string }>(
    `/golf-facilities/${facility.id}/activate-venue`,
    { method: 'POST', headers: devA },
  );
  const venueId = activated.venueId;

  const startDate = nextSaturdayKey();
  const dayOfWeek = 6;

  const created = await mustOk<RecurringJoinScheduleDto>('/my/recurring-joins', {
    method: 'POST',
    headers: devA,
    body: JSON.stringify({
      dayOfWeek,
      startTimeLocal: '14:00',
      recurrenceStartDate: startDate,
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
  assert(created.kind === 'HOST_JOIN', 'host schedule');
  assert(created.status === 'ACTIVE', 'ACTIVE');
  assert(created.nextRunAt, 'nextRunAt');

  const run1 = await runWorker();
  console.log('worker1', run1);
  assert(run1.created >= 1, 'worker created join');

  const run2 = await runWorker();
  console.log('worker2 duplicate', run2);
  assert(run2.created === 0, 'duplicate run created 0');

  await mustFail(
    `/my/recurring-joins/${created.id}/pause`,
    { method: 'POST', headers: devB },
    404,
  );

  await mustOk(`/my/recurring-joins/${created.id}/pause`, {
    method: 'POST',
    headers: devA,
  });
  const pausedRun = await runWorker();
  assert(pausedRun.created === 0, 'paused creates 0');

  await mustOk(`/my/recurring-joins/${created.id}/resume`, {
    method: 'POST',
    headers: devA,
  });

  const skipDate = created.nextRunAt
    ? kstDateKey(new Date(created.nextRunAt))
    : startDate;
  await mustOk(`/my/recurring-joins/${created.id}/skip`, {
    method: 'POST',
    headers: devA,
    body: JSON.stringify({ occurrenceDate: skipDate }),
  });

  await mustOk(`/my/recurring-joins/${created.id}/end`, {
    method: 'POST',
    headers: devA,
  });
  const endedRun = await runWorker();
  assert(endedRun.created === 0, 'ended creates 0');

  await mustFail(
    '/my/recurring-joins',
    {
      method: 'POST',
      headers: devA,
      body: JSON.stringify({
        dayOfWeek: 6,
        startTimeLocal: '14:00',
        recurrenceStartDate: startDate,
        joinTemplate: {
          sportCode: SCREEN_GOLF_CODE,
          venueId,
          plannedPlayerCount: 2,
          joinMethod: JoinMethod.APPROVAL,
        },
      }),
    },
    400,
  );

  const normalJoin = await mustOk<{ joinId: string }>('/joins', {
    method: 'POST',
    headers: devA,
    body: JSON.stringify({
      sportCode: SCREEN_GOLF_CODE,
      venueId,
      startAt: new Date(Date.now() + 3 * 24 * 60 * 60_000).toISOString(),
      plannedPlayerCount: 2,
      joinMethod: JoinMethod.APPROVAL,
      title: `${TAG} normal`,
      rewardPerParticipant: '0',
      idempotencyKey: `${TAG}-normal-${Date.now()}`,
    }),
  });
  assert(normalJoin.joinId, 'normal join regression');

  console.log('RECURRING_JOIN_DEV_E2E_PASS');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
