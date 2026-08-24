/**
 * Phase R — Android tray push E2E (requires physical device + FCM).
 *
 * Start with device logged in as DEV_A (active PushDevice).
 * When prompted, switch device login to DEV_B for Approve/Reward trays.
 *
 *   $env:API_BASE='https://api-production-2d67e.up.railway.app'
 *   pnpm exec tsx scripts/phase-r-android-tray-e2e.ts
 */
import { execFileSync } from 'node:child_process';
import {
  JoinMethod,
  MockAuthPersona,
  SocialProvider,
  SCREEN_GOLF_CODE,
} from '../packages/types/src/index.ts';

const API_BASE = process.env.API_BASE ?? 'https://api-production-2d67e.up.railway.app';
const ADB =
  process.env.ADB_PATH ??
  `${process.env.LOCALAPPDATA ?? ''}\\Android\\Sdk\\platform-tools\\adb.exe`;
const DEVICE = process.env.ADB_DEVICE ?? 'R3KL202KGHF';
const PKG = 'com.jjoin.app';

function adb(args: string[]): string {
  return execFileSync(ADB, ['-s', DEVICE, ...args], {
    encoding: 'utf8',
    maxBuffer: 12 * 1024 * 1024,
  });
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
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
  if (!res.ok) throw new Error(`${path} -> ${res.status} ${text.slice(0, 240)}`);
  return JSON.parse(text) as T;
}

async function signIn(persona: MockAuthPersona) {
  return json<{ session: { accessToken: string; userId: string } }>(
    '/auth/social/mock-sign-in',
    {
      method: 'POST',
      body: JSON.stringify({ provider: SocialProvider.KAKAO, persona }),
    },
  );
}

function backgroundApp() {
  adb(['shell', 'input', 'keyevent', 'KEYCODE_HOME']);
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

function trayHit(dump: string, needles: string[]): boolean {
  const blocks = dump
    .split(/\n(?=\s*NotificationRecord\{)/)
    .filter((b) => b.includes(PKG));
  const hay = blocks.length > 0 ? blocks.join('\n') : dump;
  return needles.some((n) => hay.includes(n));
}

async function waitTray(needles: string[], label: string, timeoutMs = 55000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    if (trayHit(dumpNotifs(), needles)) {
      console.log('TRAY_HIT', label);
      return;
    }
    await sleep(2500);
  }
  const snippet = dumpNotifs()
    .split(/\n/)
    .filter((l) => l.includes(PKG) || /신청|승인|리워드|보상|참가|지급|알림/.test(l))
    .slice(0, 60)
    .join('\n');
  throw new Error(`TRAY_MISS ${label}\n${snippet.slice(0, 1800)}`);
}

async function activePushCount(token: string) {
  const devices = await json<Array<{ active: boolean }>>('/me/push-devices', {
    headers: { Authorization: `Bearer ${token}` },
  });
  return devices.filter((d) => d.active).length;
}

async function waitPush(token: string, label: string, timeoutMs: number) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    const n = await activePushCount(token);
    if (n > 0) {
      console.log('PUSH_DEVICE', label, n);
      return;
    }
    console.log('waiting PushDevice', label);
    await sleep(5000);
  }
  throw new Error(`no PushDevice ${label}`);
}

async function main() {
  console.log('API_BASE=', API_BASE, 'DEVICE=', DEVICE);
  adb(['get-state']);

  const a = await signIn(MockAuthPersona.DEV_A);
  const b = await signIn(MockAuthPersona.DEV_B);
  await waitPush(a.session.accessToken, 'DEV_A', 20000);

  clearNotifs();
  backgroundApp();
  await sleep(1500);

  const startAt = new Date(Date.now() + 4 * 60 * 60_000).toISOString();
  const created = await json<{ joinId: string }>('/joins', {
    method: 'POST',
    headers: { Authorization: `Bearer ${a.session.accessToken}` },
    body: JSON.stringify({
      sportCode: SCREEN_GOLF_CODE,
      venue: {
        provider: 'MOCK',
        providerPlaceId: `venue_pr_tray_${Date.now()}`,
        name: 'Phase R Tray E2E',
        address: '거제시 고현동',
        regionLabel: '거제',
        latitude: 34.8805,
        longitude: 128.6211,
      },
      startAt,
      plannedPlayerCount: 4,
      joinMethod: JoinMethod.APPROVAL,
      title: `Phase R Tray ${Date.now()}`,
      rewardPerParticipant: '20',
    }),
  });
  console.log('joinId=', created.joinId);

  const applied = await json<{
    myParticipation: { participantId: string } | null;
    participants: Array<{ participantId: string; userId: string }>;
  }>(`/joins/${created.joinId}/apply`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${b.session.accessToken}` },
  });
  const applicant =
    applied.myParticipation ??
    applied.participants.find((p) => p.userId === b.session.userId);
  if (!applicant?.participantId) throw new Error('apply missing participant');
  console.log('participantId=', applicant.participantId.slice(0, 8));

  await waitTray(['신청', '참가 신청', '새 참가', 'APPLICATION'], 'Apply→Host');

  const centerA = await json<{
    items?: Array<{ type: string; title: string }>;
  }>('/me/notifications?limit=20', {
    headers: { Authorization: `Bearer ${a.session.accessToken}` },
  });
  const hostItem = (centerA.items ?? []).find((n) =>
    String(n.type).includes('APPLICATION_RECEIVED'),
  );
  console.log('host_center=', hostItem ? 'HIT' : 'MISS', hostItem?.title ?? '');

  console.log(
    '>>> DEVICE ACTION: MY → 로그아웃 → DEV USER B → 카카오로 시작하기 (Push 재등록)',
  );
  await waitPush(b.session.accessToken, 'DEV_B', 180000);

  clearNotifs();
  backgroundApp();
  await sleep(1500);

  await json(
    `/joins/${created.joinId}/participants/${applicant.participantId}/approve`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${a.session.accessToken}` },
    },
  );
  await waitTray(['승인', '참가 확정', '수락', 'APPROVED'], 'Approve→Participant');

  await json(`/joins/${created.joinId}/settlements/_qa/advance-clock`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${a.session.accessToken}` },
    body: JSON.stringify({ mode: 'open' }),
  });

  clearNotifs();
  backgroundApp();
  await sleep(1000);

  await json(
    `/joins/${created.joinId}/settlements/${applicant.participantId}/pay`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${a.session.accessToken}` },
    },
  );
  await waitTray(['리워드', '보상', '지급', 'REWARD'], 'ManualReward→Participant');

  let secondPay = 'accepted';
  try {
    await json(
      `/joins/${created.joinId}/settlements/${applicant.participantId}/pay`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${a.session.accessToken}` },
      },
    );
  } catch (e) {
    secondPay = e instanceof Error ? e.message.slice(0, 120) : 'err';
  }
  console.log('second_manual_pay=', secondPay);

  const centerB = await json<{ items?: Array<{ type: string }> }>(
    '/me/notifications?limit=50',
    { headers: { Authorization: `Bearer ${b.session.accessToken}` } },
  );
  const rewards = (centerB.items ?? []).filter((n) => String(n.type).includes('REWARD'));
  console.log('reward_notifications=', rewards.length);
  if (rewards.length !== 1) {
    throw new Error(`expected 1 reward notification, got ${rewards.length}`);
  }

  console.log(
    JSON.stringify({
      ok: true,
      joinId: created.joinId,
      applyHostTray: true,
      approveParticipantTray: true,
      manualRewardTray: true,
      hostNotificationCenter: Boolean(hostItem),
      rewardNotificationCount: rewards.length,
      secondManualPay: secondPay,
    }),
  );
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
