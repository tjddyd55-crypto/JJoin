/**
 * Phase K Android settlement E2E helper — API setup + adb deep link + screenshots.
 * Usage:
 *   $env:API_BASE='https://api-production-2d67e.up.railway.app'
 *   pnpm exec tsx scripts/phase-k-android-settlement-e2e.ts
 */
import { execSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import {
  JoinMethod,
  MockAuthPersona,
  RewardStatus,
  SocialProvider,
  SCREEN_GOLF_CODE,
} from '../packages/types/src/index.ts';

const API_BASE = process.env.API_BASE ?? 'https://api-production-2d67e.up.railway.app';
const ADB =
  process.env.ADB_PATH ??
  `${process.env.LOCALAPPDATA ?? ''}\\Android\\Sdk\\platform-tools\\adb.exe`;
const DOCS = join(process.cwd(), 'docs');

async function json<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  const raw = await res.text();
  if (res.status < 200 || res.status >= 300) {
    throw new Error(`${path} -> ${res.status} ${raw.slice(0, 160)}`);
  }
  return JSON.parse(raw) as T;
}

async function signIn(persona: MockAuthPersona) {
  return json<{ session: { accessToken: string } }>('/auth/social/mock-sign-in', {
    method: 'POST',
    body: JSON.stringify({ provider: SocialProvider.KAKAO, persona }),
  });
}

function adb(args: string) {
  return execSync(`"${ADB}" ${args}`, { encoding: 'utf8' });
}

function screenshot(name: string) {
  mkdirSync(DOCS, { recursive: true });
  const out = join(DOCS, name);
  const buf = execSync(`"${ADB}" exec-out screencap -p`, { encoding: 'buffer' });
  writeFileSync(out, buf);
  console.log('screenshot', out);
}

async function main() {
  const devices = adb('devices').trim().split('\n').slice(1).filter((l) => l.includes('\tdevice'));
  if (devices.length === 0) throw new Error('no adb device');

  const a = await signIn(MockAuthPersona.DEV_A);
  const b = await signIn(MockAuthPersona.DEV_B);
  const idem = `phase-k-android-${Date.now()}`;
  const startAt = new Date(Date.now() + 2 * 60 * 60_000).toISOString();

  const created = await json<{ joinId: string }>('/joins', {
    method: 'POST',
    headers: { Authorization: `Bearer ${a.session.accessToken}` },
    body: JSON.stringify({
      sportCode: SCREEN_GOLF_CODE,
      venue: {
        provider: 'MOCK',
        providerPlaceId: `venue_pk_android_${Date.now()}`,
        name: 'Phase K Android E2E',
        address: '거제',
        regionLabel: '거제',
        latitude: 34.8805,
        longitude: 128.6211,
      },
      startAt,
      plannedPlayerCount: 4,
      joinMethod: JoinMethod.APPROVAL,
      title: 'Phase K Android E2E',
      idempotencyKey: idem,
    }),
  });

  const applied = await json<{ myParticipation: { participantId: string } | null }>(
    `/joins/${created.joinId}/apply`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${b.session.accessToken}` },
    },
  );
  const participantId = applied.myParticipation?.participantId;
  if (!participantId) throw new Error('participant missing');

  await json(`/joins/${created.joinId}/participants/${participantId}/approve`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${a.session.accessToken}` },
  });

  await json(`/joins/${created.joinId}/settlements/_qa/advance-clock`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${a.session.accessToken}` },
    body: JSON.stringify({ mode: 'open' }),
  });

  adb(`shell am start -a android.intent.action.VIEW -d "jjoin://join/${created.joinId}"`);
  await new Promise((r) => setTimeout(r, 4000));
  screenshot('phase-k-android-host-pending.png');

  const beforeB = await json<{ availableCoin: string }>('/me/wallet', {
    headers: { Authorization: `Bearer ${b.session.accessToken}` },
  });

  await json(`/joins/${created.joinId}/settlements/${participantId}/pay`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${a.session.accessToken}` },
  });

  const afterB = await json<{ availableCoin: string }>('/me/wallet', {
    headers: { Authorization: `Bearer ${b.session.accessToken}` },
  });
  if (Number(afterB.availableCoin) - Number(beforeB.availableCoin) !== 20) {
    throw new Error('wallet +20 FAIL');
  }

  const paid = await json<{
    settlement?: { settlements: Array<{ rewardStatus: string }> };
  }>(`/joins/${created.joinId}`, {
    headers: { Authorization: `Bearer ${b.session.accessToken}` },
  });
  const status = paid.settlement?.settlements[0]?.rewardStatus;
  if (status !== RewardStatus.PAID) throw new Error(`expected PAID got ${status}`);

  adb(`shell am start -a android.intent.action.VIEW -d "jjoin://join/${created.joinId}"`);
  await new Promise((r) => setTimeout(r, 4000));
  screenshot('phase-k-android-participant-paid.png');

  console.log('Phase K Android settlement E2E PASS joinId=', created.joinId);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
