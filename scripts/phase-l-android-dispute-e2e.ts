/**
 * Phase L Android dispute E2E — API setup + adb deep link + admin resolve + screenshots.
 * Usage:
 *   $env:API_BASE='https://api-production-2d67e.up.railway.app'
 *   pnpm exec tsx scripts/phase-l-android-dispute-e2e.ts
 */
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  DisputeResolution,
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

async function setupDispute(tokenA: string, tokenB: string, label: string) {
  const idem = `phase-l-android-${label}-${Date.now()}`;
  const created = await json<{ joinId: string }>('/joins', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
    body: JSON.stringify({
      sportCode: SCREEN_GOLF_CODE,
      venue: {
        provider: 'MOCK',
        providerPlaceId: `venue_l_android_${label}_${Date.now()}`,
        name: `Phase L Android ${label}`,
        address: '거제',
        regionLabel: '거제',
        latitude: 34.8805,
        longitude: 128.6211,
      },
      startAt: new Date(Date.now() + 2 * 60 * 60_000).toISOString(),
      plannedPlayerCount: 4,
      joinMethod: JoinMethod.APPROVAL,
      title: `Phase L Android ${label}`,
      idempotencyKey: idem,
    }),
  });

  const applied = await json<{ myParticipation: { participantId: string } | null }>(
    `/joins/${created.joinId}/apply`,
    { method: 'POST', headers: { Authorization: `Bearer ${tokenB}` } },
  );
  const participantId = applied.myParticipation?.participantId;
  if (!participantId) throw new Error('participant missing');

  await json(`/joins/${created.joinId}/participants/${participantId}/approve`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
  });

  await json(`/joins/${created.joinId}/settlements/_qa/advance-clock`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
    body: JSON.stringify({ mode: 'open' }),
  });

  await json(`/joins/${created.joinId}/settlements/${participantId}/issue`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
    body: JSON.stringify({ issueType: 'DISPUTE', statement: '참가 문제 신고' }),
  });

  const detail = await json<{
    settlement?: { settlements: Array<{ dispute?: { disputeId: string } | null }> };
  }>(`/joins/${created.joinId}`, {
    headers: { Authorization: `Bearer ${tokenB}` },
  });
  const disputeId = detail.settlement?.settlements[0]?.dispute?.disputeId;
  if (!disputeId) throw new Error('disputeId missing');

  await json(`/me/disputes/${disputeId}/statement`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenB}` },
    body: JSON.stringify({ statement: '정상 참석했습니다.' }),
  });

  return { joinId: created.joinId, participantId, disputeId };
}

async function main() {
  const devices = adb('devices').trim().split('\n').slice(1).filter((l) => l.includes('\tdevice'));
  if (devices.length === 0) throw new Error('no adb device');

  const a = await signIn(MockAuthPersona.DEV_A);
  const b = await signIn(MockAuthPersona.DEV_B);
  const admin = await signIn(MockAuthPersona.DEV_ADMIN);

  const payCase = await setupDispute(a.session.accessToken, b.session.accessToken, 'pay');

  adb(`shell am start -a android.intent.action.VIEW -d "jjoin://join/${payCase.joinId}"`);
  await new Promise((r) => setTimeout(r, 4500));
  screenshot('phase-l-android-participant-disputed.png');

  const beforeB = await json<{ availableCoin: string }>('/me/wallet', {
    headers: { Authorization: `Bearer ${b.session.accessToken}` },
  });

  await json(`/admin/disputes/${payCase.disputeId}/resolve`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${admin.session.accessToken}` },
    body: JSON.stringify({
      resolution: DisputeResolution.PAY_PARTICIPANT,
      adminNote: 'Android E2E PAY',
    }),
  });

  adb(`shell am start -a android.intent.action.VIEW -d "jjoin://join/${payCase.joinId}"`);
  await new Promise((r) => setTimeout(r, 4500));
  screenshot('phase-l-android-participant-paid.png');

  const afterB = await json<{ availableCoin: string }>('/me/wallet', {
    headers: { Authorization: `Bearer ${b.session.accessToken}` },
  });
  if (Number(afterB.availableCoin) - Number(beforeB.availableCoin) !== 20) {
    throw new Error('wallet +20 FAIL');
  }

  const paid = await json<{
    settlement?: { settlements: Array<{ rewardStatus: string }> };
  }>(`/joins/${payCase.joinId}`, {
    headers: { Authorization: `Bearer ${b.session.accessToken}` },
  });
  const status = paid.settlement?.settlements[0]?.rewardStatus;
  if (status !== RewardStatus.PAID) throw new Error(`expected PAID got ${status}`);

  const refundCase = await setupDispute(a.session.accessToken, b.session.accessToken, 'refund');
  adb(`shell am start -a android.intent.action.VIEW -d "jjoin://join/${refundCase.joinId}"`);
  await new Promise((r) => setTimeout(r, 4500));
  screenshot('phase-l-android-host-disputed.png');

  const beforeA = await json<{ availableCoin: string; heldCoin: string }>('/me/wallet', {
    headers: { Authorization: `Bearer ${a.session.accessToken}` },
  });

  await json(`/admin/disputes/${refundCase.disputeId}/resolve`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${admin.session.accessToken}` },
    body: JSON.stringify({
      resolution: DisputeResolution.REFUND_HOST,
      adminNote: 'Android E2E REFUND',
    }),
  });

  adb(`shell am start -a android.intent.action.VIEW -d "jjoin://join/${refundCase.joinId}"`);
  await new Promise((r) => setTimeout(r, 4500));
  screenshot('phase-l-android-host-refunded.png');

  const afterA = await json<{ availableCoin: string }>('/me/wallet', {
    headers: { Authorization: `Bearer ${a.session.accessToken}` },
  });
  if (Number(afterA.availableCoin) <= Number(beforeA.availableCoin)) {
    throw new Error('host refund available FAIL');
  }

  console.log('Phase L Android dispute E2E PASS');
  console.log('payJoinId=', payCase.joinId, 'refundJoinId=', refundCase.joinId);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
