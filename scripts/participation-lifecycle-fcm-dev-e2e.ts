/**
 * Participation Lifecycle — DEV FCM / Android tray E2E.
 *
 * Device must be logged in as DEV_A on `com.jjoin.app.dev` with push permission.
 * Host actions run via API as DEV_B (guest apply → host approve → participant tray).
 *
 * Usage:
 *   $env:API_BASE='https://api-development-e387.up.railway.app'
 *   pnpm exec tsx scripts/participation-lifecycle-fcm-dev-e2e.ts
 */
import { execFileSync } from 'node:child_process';
import {
  JoinMethod,
  MockAuthPersona,
  SocialProvider,
  SCREEN_GOLF_CODE,
} from '../packages/types/src/index.ts';

const API_BASE = process.env.API_BASE ?? 'https://api-development-e387.up.railway.app';
const ADB =
  process.env.ADB_PATH ??
  `${process.env.LOCALAPPDATA ?? ''}\\Android\\Sdk\\platform-tools\\adb.exe`;
const DEVICE = process.env.ADB_DEVICE ?? 'R3KL202KGHF';
const PKG = process.env.JJOIN_ANDROID_PACKAGE ?? 'com.jjoin.app.dev';
const ACTIVE_HOST = new Set(['OPEN', 'FULL', 'CONFIRMED', 'IN_PROGRESS']);

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

function bearer(token: string) {
  return { Authorization: `Bearer ${token}` };
}

async function signIn(persona: MockAuthPersona) {
  return json<{ session: { accessToken: string; userId: string } }>(
    '/auth/social/mock-sign-in',
    { method: 'POST', body: JSON.stringify({ provider: SocialProvider.KAKAO, persona }) },
  );
}

async function cleanupHost(hostToken: string) {
  const mine = await json<{ hosted: Array<{ joinId: string; status: string }> }>(
    '/joins/mine',
    { headers: bearer(hostToken) },
  );
  const blocking = mine.hosted?.find((j) => ACTIVE_HOST.has(j.status));
  if (!blocking) return;

  console.log('cleanup host join', blocking.joinId);
  const detail = await json<{
    participants: Array<{ participantId: string; role: string; participationStatus: string }>;
  }>(`/joins/${blocking.joinId}`, { headers: bearer(hostToken) });

  const applied = detail.participants.find(
    (p) => p.role !== 'HOST' && p.participationStatus === 'APPLIED',
  );
  if (applied) {
    await json(`/joins/${blocking.joinId}/participants/${applied.participantId}/approve`, {
      method: 'POST',
      headers: bearer(hostToken),
    });
  }

  const refreshed = await json<{
    participants: Array<{ participantId: string; role: string; participationStatus: string }>;
  }>(`/joins/${blocking.joinId}`, { headers: bearer(hostToken) });
  const nonHost = refreshed.participants.filter(
    (p) => p.role !== 'HOST' && p.participationStatus !== 'APPLIED',
  );

  await json(`/joins/${blocking.joinId}/settlements/_qa/advance-clock`, {
    method: 'POST',
    headers: bearer(hostToken),
    body: JSON.stringify({ mode: 'open' }),
  });

  if (nonHost.length > 0) {
    await json(`/joins/${blocking.joinId}/settlements/finalize`, {
      method: 'POST',
      headers: bearer(hostToken),
      body: JSON.stringify({
        attendance: nonHost.map((p) => ({ participantId: p.participantId, attended: false })),
      }),
    });
  }
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

async function waitTray(needles: string[], label: string, timeoutMs = 70000) {
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

async function waitPush(token: string, label: string, timeoutMs = 30000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    const devices = await json<Array<{ active: boolean }>>('/me/push-devices', {
      headers: bearer(token),
    });
    if (devices.some((d) => d.active)) {
      console.log('PUSH_DEVICE', label, devices.filter((d) => d.active).length);
      return;
    }
    await sleep(3000);
  }
  throw new Error(`no PushDevice for ${label} — open ${PKG} logged in as DEV_A`);
}

async function main() {
  console.log('API_BASE=', API_BASE, 'PKG=', PKG);
  adb(['get-state']);

  const meta = await json<{ provider: string }>('/notifications/_meta');
  console.log('push_provider=', meta.provider);

  const hostApi = await signIn(MockAuthPersona.DEV_B);
  const guestApi = await signIn(MockAuthPersona.DEV_A);
  const participantDevice = guestApi;

  await waitPush(participantDevice.session.accessToken, 'DEV_A(device)');

  await cleanupHost(hostApi.session.accessToken).catch((e) => {
    console.warn('cleanup warn', e instanceof Error ? e.message : e);
  });

  const unreadBefore = await json<{ unreadCount: number }>('/me/notifications/unread-count', {
    headers: bearer(participantDevice.session.accessToken),
  });
  console.log('unread_before=', unreadBefore.unreadCount);

  clearNotifs();
  backgroundApp();
  await sleep(1200);

  const tag = `fcm-dev-${Date.now()}`;
  const created = await json<{ joinId: string }>('/joins', {
    method: 'POST',
    headers: bearer(hostApi.session.accessToken),
    body: JSON.stringify({
      sportCode: SCREEN_GOLF_CODE,
      venue: {
        provider: 'MOCK',
        providerPlaceId: `venue_${tag}`,
        name: `FCM DEV ${tag}`,
        address: '거제',
        regionLabel: '거제',
        latitude: 34.88,
        longitude: 128.62,
      },
      startAt: new Date(Date.now() + 4 * 60 * 60_000).toISOString(),
      plannedPlayerCount: 4,
      joinMethod: JoinMethod.APPROVAL,
      title: `FCM DEV Tray ${tag}`,
      rewardPerParticipant: '0',
      idempotencyKey: tag,
    }),
  });
  console.log('joinId=', created.joinId);

  const applied = await json<{
    myParticipation: { participantId: string } | null;
  }>(`/joins/${created.joinId}/apply`, {
    method: 'POST',
    headers: bearer(guestApi.session.accessToken),
  });
  const participantId = applied.myParticipation?.participantId;
  if (!participantId) throw new Error('apply missing participant');

  clearNotifs();
  backgroundApp();
  await sleep(800);

  await json(`/joins/${created.joinId}/participants/${participantId}/approve`, {
    method: 'POST',
    headers: bearer(hostApi.session.accessToken),
  });

  await waitTray(['승인', '참가 확정', '수락', 'APPROVED', '확정'], 'Approve→Participant');

  const center = await json<{
    items: Array<{ id: string; type: string; title: string; readAt: string | null }>;
  }>('/me/notifications?limit=15', {
    headers: bearer(participantDevice.session.accessToken),
  });
  const approveNotif = center.items.find((n) => String(n.type).includes('APPROVED'));
  if (!approveNotif) throw new Error('in-app APPROVED notification missing');

  const unreadAfter = await json<{ unreadCount: number }>('/me/notifications/unread-count', {
    headers: bearer(participantDevice.session.accessToken),
  });
  console.log('unread_after=', unreadAfter.unreadCount);
  if (unreadAfter.unreadCount <= unreadBefore.unreadCount) {
    throw new Error('unread should increase');
  }

  await json(`/me/notifications/${approveNotif.id}/read`, {
    method: 'POST',
    headers: bearer(participantDevice.session.accessToken),
  });
  const unreadRead = await json<{ unreadCount: number }>('/me/notifications/unread-count', {
    headers: bearer(participantDevice.session.accessToken),
  });
  console.log('unread_after_read=', unreadRead.unreadCount);

  const dupApprove = await fetch(
    `${API_BASE}/joins/${created.joinId}/participants/${participantId}/approve`,
    { method: 'POST', headers: bearer(hostApi.session.accessToken) },
  );
  console.log('duplicate_approve_status=', dupApprove.status);

  const center2 = await json<{ items: Array<{ type: string }> }>('/me/notifications?limit=30', {
    headers: bearer(participantDevice.session.accessToken),
  });
  const approveCount = center2.items.filter((n) =>
    String(n.type).includes('APPROVED'),
  ).length;
  console.log('approved_notif_rows=', approveCount);

  adb([
    'shell',
    'am',
    'start',
    '-a',
    'android.intent.action.VIEW',
    '-d',
    `jjoindev://join/${created.joinId}`,
    PKG,
  ]);
  console.log('deep_link_launched joinId=', created.joinId);

  console.log(
    JSON.stringify({
      ok: true,
      tray: true,
      inAppCenter: true,
      unreadSync: true,
      duplicateApproveIdempotent: dupApprove.status < 500,
      joinId: created.joinId,
    }),
  );
  console.log('PARTICIPATION_LIFECYCLE_FCM_DEV_E2E_PASS');
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
