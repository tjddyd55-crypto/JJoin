/**
 * Phase O Naver Android E2E — server-side verification helpers.
 * Complements manual device walkthrough; never logs tokens.
 */
import { MockAuthPersona, SocialProvider } from '../packages/types/src/index.ts';

const API_BASE = process.env.API_BASE ?? 'https://api-production-2d67e.up.railway.app';

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
    throw new Error(`${path} -> ${res.status} ${raw.slice(0, 200)}`);
  }
  return JSON.parse(raw) as T;
}

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

async function main() {
  console.log('Phase O Naver E2E server checks');
  console.log('API_BASE=', API_BASE);

  const health = await json<{ status: string; database: string }>('/health');
  assert(health.status === 'ok', 'health');

  const bad = await request('/auth/social/exchange', {
    method: 'POST',
    body: JSON.stringify({
      provider: SocialProvider.NAVER,
      credential: 'invalid-naver-access-token-phase-o',
    }),
  });
  assert(bad.status === 401, `invalid naver token expected 401 got ${bad.status}`);

  // DEV_A persona may already exist under another provider (nickname unique) — use KAKAO for hybrid persona smoke.
  const devA = await json<{ session: { accessToken: string; userId: string } }>(
    '/auth/social/mock-sign-in',
    {
      method: 'POST',
      body: JSON.stringify({ provider: SocialProvider.KAKAO, persona: MockAuthPersona.DEV_A }),
    },
  );
  assert(Boolean(devA.session.accessToken), 'DEV_A mock sign-in (KAKAO)');

  const subject = `phase-o-naver-e2e-${Date.now()}`;
  const mockExchange = await json<{ session: { userId: string } }>('/auth/social/exchange', {
    method: 'POST',
    body: JSON.stringify({
      provider: SocialProvider.NAVER,
      credential: `mock:NAVER:${subject}`,
    }),
  });
  const again = await json<{ session: { userId: string } }>('/auth/social/exchange', {
    method: 'POST',
    body: JSON.stringify({
      provider: SocialProvider.NAVER,
      credential: `mock:NAVER:${subject}`,
    }),
  });
  assert(mockExchange.session.userId === again.session.userId, 'duplicate callback same user');

  const capUser = await json<{ session: { accessToken: string } }>('/auth/social/exchange', {
    method: 'POST',
    body: JSON.stringify({
      provider: SocialProvider.NAVER,
      credential: `mock:NAVER:cap-check-${Date.now()}`,
    }),
  });
  const cap = await json<{ status: string; canStart: boolean }>('/me/identity/capability', {
    headers: { Authorization: `Bearer ${capUser.session.accessToken}` },
  });
  assert(cap.status === 'UNAVAILABLE', 'non-dev user identity UNAVAILABLE on hybrid');

  const scenarioOnly = await request('/auth/social/mock-sign-in', {
    method: 'POST',
    body: JSON.stringify({ provider: SocialProvider.NAVER, scenario: 'NEW_USER' }),
  });
  assert(scenarioOnly.status === 403, `scenario-only mock expected 403 got ${scenarioOnly.status}`);

  console.log('PASS — Phase O Naver E2E server checks');
}

main().catch((e) => {
  console.error('FAIL', e instanceof Error ? e.message : e);
  process.exit(1);
});
