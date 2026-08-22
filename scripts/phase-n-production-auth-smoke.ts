/**
 * Phase N — production social auth smoke (server-side).
 *
 * Validates mock/hybrid guards, exchange contract, and invalid credential rejection.
 * Does NOT require real provider tokens (console USER_ACTION_REQUIRED is OK).
 *
 * Usage:
 *   $env:API_BASE='https://api-production-2d67e.up.railway.app'
 *   pnpm exec tsx scripts/phase-n-production-auth-smoke.ts
 */
import { MockAuthPersona, SocialProvider } from '../packages/types/src/index.ts';

const API_BASE = process.env.API_BASE ?? 'http://127.0.0.1:3000';

async function request(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(init?.headers ?? {}),
    },
  });
}

async function json<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await request(path, init);
  const raw = await res.text();
  if (res.status < 200 || res.status >= 300) {
    throw new Error(`${path} -> ${res.status} ${raw.slice(0, 240)}`);
  }
  return JSON.parse(raw) as T;
}

async function expectStatus(path: string, status: number, init?: RequestInit): Promise<void> {
  const res = await request(path, init);
  if (res.status !== status) {
    const raw = await res.text();
    throw new Error(`expected ${status} for ${path}, got ${res.status}: ${raw.slice(0, 240)}`);
  }
}

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

async function main() {
  console.log('Phase N production auth smoke');
  console.log('API_BASE=', API_BASE);

  const health = await json<{ status: string; database: string }>('/health');
  assert(health.status === 'ok' && health.database === 'connected', 'health/database');

  const subject = `phase-n-${Date.now()}`;
  const first = await json<{
    session: { accessToken: string; userId: string };
    nextStep: string;
  }>('/auth/social/exchange', {
    method: 'POST',
    body: JSON.stringify({
      provider: SocialProvider.KAKAO,
      credential: `mock:KAKAO:${subject}`,
    }),
  });
  assert(first.nextStep === 'TERMS', 'new mock user -> TERMS');

  const second = await json<{ session: { userId: string } }>('/auth/social/exchange', {
    method: 'POST',
    body: JSON.stringify({
      provider: SocialProvider.KAKAO,
      credential: `mock:KAKAO:${subject}`,
    }),
  });
  assert(second.session.userId === first.session.userId, 'same subject -> same user');

  await expectStatus('/auth/social/exchange', 401, {
    method: 'POST',
    body: JSON.stringify({
      provider: SocialProvider.KAKAO,
      credential: 'not-a-real-kakao-access-token',
    }),
  });

  await expectStatus('/auth/social/exchange', 401, {
    method: 'POST',
    body: JSON.stringify({
      provider: SocialProvider.GOOGLE,
      credential: 'not.a.valid.id.token',
    }),
  });

  await expectStatus('/auth/social/exchange', 401, {
    method: 'POST',
    body: JSON.stringify({
      provider: SocialProvider.NAVER,
      credential: 'not-a-real-naver-access-token',
    }),
  });

  const devToken = (
    await json<{ session: { accessToken: string } }>('/auth/social/mock-sign-in', {
      method: 'POST',
      body: JSON.stringify({
        provider: SocialProvider.KAKAO,
        persona: MockAuthPersona.DEV_A,
      }),
    })
  ).session.accessToken;

  const capRes = await request('/me/identity/capability', {
    headers: { Authorization: `Bearer ${devToken}` },
  });
  if (capRes.status === 404) {
    throw new Error('/me/identity/capability -> 404 (Phase N API not deployed)');
  }
  if (capRes.status >= 200 && capRes.status < 300) {
    const capability = JSON.parse(await capRes.text()) as { status: string; canStart: boolean };
    assert(capability.status === 'MOCK' && capability.canStart, 'dev persona identity MOCK');
  } else {
    throw new Error(`/me/identity/capability -> ${capRes.status}`);
  }

  console.log('PASS — Phase N server smoke (mock path + invalid credential rejection)');
}

main().catch((e) => {
  console.error('FAIL', e instanceof Error ? e.message : e);
  process.exit(1);
});
