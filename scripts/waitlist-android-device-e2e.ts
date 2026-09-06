/**
 * Waitlist Android tray + deep link E2E (DEV API + physical device).
 *
 * Prerequisite: Dev Client logged in as DEV_A with active PushDevice.
 *
 *   $env:API_BASE='https://api-development-e387.up.railway.app'
 *   pnpm exec tsx scripts/waitlist-android-device-e2e.ts
 */
import { execFileSync } from 'node:child_process';
import {
  JoinMethod,
  MockAuthPersona,
  SCREEN_GOLF_CODE,
  SocialProvider,
} from '../packages/types/src/index.ts';

const API_BASE = process.env.API_BASE ?? 'https://api-development-e387.up.railway.app';
const ADB =
  process.env.ADB_PATH ??
  `${process.env.LOCALAPPDATA ?? ''}\\Android\\Sdk\\platform-tools\\adb.exe`;
const DEVICE = process.env.ADB_DEVICE ?? 'R3KL202KGHF';
const PKG = process.env.ANDROID_PKG ?? 'com.jjoin.app';
const TAG = 'waitlist-device';
const REWARD = '20';
const ACTIVE_HOST_STATUSES = new Set(['OPEN', 'FULL', 'CONFIRMED', 'IN_PROGRESS']);

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
  if (!res.ok) throw new Error(`${path} -> ${res.status} ${text.slice(0, 300)}`);
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

async function waitTray(needles: string[], label: string, timeoutMs = 60000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    if (trayHit(dumpNotifs(), needles)) {
      console.log('TRAY_HIT', label);
      return;
    }
    await sleep(2500);
  }
  throw new Error(`TRAY_MISS ${label}`);
}

async function activePushCount(token: string) {
  const devices = await json<Array<{ active: boolean }>>('/me/push-devices', {
    headers: { Authorization: `Bearer ${token}` },
  });
  return devices.filter((d) => d.active).length;
}

async function applyApprove(
  hostToken: string,
  guestToken: string,
  joinId: string,
) {
  await json(`/joins/${joinId}/apply`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${guestToken}` },
  });
  const detail = await json<{
    participants: Array<{ participantId: string; userId: string; participationStatus: string }>;
  }>(`/joins/${joinId}`, { headers: { Authorization: `Bearer ${hostToken}` } });
  const applied = detail.participants.find((p) => p.participationStatus === 'APPLIED');
  if (!applied) throw new Error('applied row missing');
  await json(`/joins/${joinId}/participants/${applied.participantId}/approve`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${hostToken}` },
  });
}

async function cleanupBlockingHostedJoin(hostToken: string) {
  const mine = await json<{ hosted: Array<{ joinId: string; status: string }> }>(
    '/joins/mine',
    { headers: { Authorization: `Bearer ${hostToken}` } },
  );
  const blocking = mine.hosted?.find((j) => ACTIVE_HOST_STATUSES.has(j.status));
  if (!blocking) return;
  console.log('cleanup hosted join', blocking.joinId);
  try {
    const detail = await json<{
      participants: Array<{ participantId: string; role: string; participationStatus: string }>;
    }>(`/joins/${blocking.joinId}`, { headers: { Authorization: `Bearer ${hostToken}` } });
    const nonHost = detail.participants.filter(
      (p) => p.role !== 'HOST' && p.participationStatus !== 'APPLIED',
    );
    await json(`/joins/${blocking.joinId}/settlements/_qa/advance-clock`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${hostToken}` },
      body: JSON.stringify({ mode: 'open' }),
    });
    if (nonHost.length > 0) {
      await json(`/joins/${blocking.joinId}/settlements/finalize`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${hostToken}` },
        body: JSON.stringify({
          attendance: nonHost.map((p) => ({ participantId: p.participantId, attended: false })),
        }),
      });
    }
  } catch (err) {
    console.warn('cleanup skip', err instanceof Error ? err.message : err);
  }
}

async function pickHostToken(): Promise<string> {
  for (const persona of [
    MockAuthPersona.DEV_ADMIN,
    MockAuthPersona.DEV_B,
    MockAuthPersona.DEV_C,
    MockAuthPersona.DEV_BILLING_RETRY,
  ]) {
    const session = await signIn(persona);
    await cleanupBlockingHostedJoin(session.session.accessToken).catch(() => undefined);
    const mine = await json<{ hosted: Array<{ status: string }> }>('/joins/mine', {
      headers: { Authorization: `Bearer ${session.session.accessToken}` },
    });
    const active =
      mine.hosted?.filter((j) => ACTIVE_HOST_STATUSES.has(j.status)).length ?? 0;
    const preview = await json<{ canCreate: boolean }>('/joins/coin-preview', {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.session.accessToken}` },
      body: JSON.stringify({ plannedPlayerCount: 3, rewardPerParticipant: REWARD }),
    });
    if (active < 1 && preview.canCreate) return session.session.accessToken;
  }
  throw new Error('no eligible host persona for device E2E');
}

async function main() {
  console.log('API_BASE=', API_BASE, 'DEVICE=', DEVICE);
  adb(['get-state']);

  const waitlistUser = await signIn(MockAuthPersona.DEV_A);
  const hostToken = await pickHostToken();
  const guestC = await signIn(MockAuthPersona.DEV_C);
  const guestLow = await signIn(MockAuthPersona.DEV_BILLING_LOW);

  const pushN = await activePushCount(waitlistUser.session.accessToken);
  if (pushN < 1) {
    throw new Error(
      'no active PushDevice for DEV_A — log in on device first, then retry',
    );
  }
  console.log('PushDevice active', pushN);

  clearNotifs();
  adb(['shell', 'input', 'keyevent', 'KEYCODE_HOME']);
  await sleep(1200);

  const created = await json<{ joinId: string }>('/joins', {
    method: 'POST',
    headers: { Authorization: `Bearer ${hostToken}` },
    body: JSON.stringify({
      sportCode: SCREEN_GOLF_CODE,
      venue: {
        provider: 'MOCK',
        providerPlaceId: `venue_${TAG}_${Date.now()}`,
        name: 'Waitlist Device E2E',
        address: '거제시',
        regionLabel: '거제',
        latitude: 34.88,
        longitude: 128.62,
      },
      startAt: new Date(Date.now() + 5 * 60 * 60_000).toISOString(),
      plannedPlayerCount: 3,
      joinMethod: JoinMethod.APPROVAL,
      title: `[${TAG}] push`,
      rewardPerParticipant: '20',
      idempotencyKey: `${TAG}-${Date.now()}`,
    }),
  });
  const joinId = created.joinId;
  console.log('joinId', joinId);

  await applyApprove(hostToken, guestC.session.accessToken, joinId);
  await applyApprove(hostToken, guestLow.session.accessToken, joinId);

  await json(`/joins/${joinId}/waitlist`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${waitlistUser.session.accessToken}` },
  });

  const before = await json<{
    myParticipation: { participationStatus: string } | null;
  }>(`/joins/${joinId}`, {
    headers: { Authorization: `Bearer ${waitlistUser.session.accessToken}` },
  });
  if (before.myParticipation?.participationStatus !== 'WAITLISTED') {
    throw new Error(`expected WAITLISTED got ${before.myParticipation?.participationStatus}`);
  }
  console.log('WAITLISTED OK');

  await json(`/joins/${joinId}/attendance-intent`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${guestC.session.accessToken}` },
    body: JSON.stringify({ intent: 'DECLINED' }),
  });

  const offered = await json<{
    myParticipation: { participationStatus: string; offerExpiresAt?: string | null } | null;
  }>(`/joins/${joinId}`, {
    headers: { Authorization: `Bearer ${waitlistUser.session.accessToken}` },
  });
  if (offered.myParticipation?.participationStatus !== 'OFFERED') {
    throw new Error(`expected OFFERED got ${offered.myParticipation?.participationStatus}`);
  }
  console.log('OFFERED API OK');

  const notifs = await json<{ items: Array<{ type: string; title: string }> }>(
    '/me/notifications?limit=10',
    { headers: { Authorization: `Bearer ${waitlistUser.session.accessToken}` } },
  );
  const offerNotif = notifs.items?.find((n) => n.type === 'WAITLIST_OFFERED');
  if (!offerNotif) throw new Error('WAITLIST_OFFERED notification missing in center');
  console.log('notification center OK', offerNotif.title);

  await waitTray(['자리가 났어요', 'WAITLIST_OFFERED'], 'WaitlistOffer');

  console.log('WAITLIST_ANDROID_DEVICE_E2E_PASS');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
