/**
 * Phase N Kakao Android E2E — server-side verification helpers.
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
  console.log('Phase N Kakao E2E server checks');
  console.log('API_BASE=', API_BASE);

  const health = await json<{ status: string; database: string }>('/health');
  assert(health.status === 'ok', 'health');

  // Invalid Kakao token must reject without creating session
  const bad = await request('/auth/social/exchange', {
    method: 'POST',
    body: JSON.stringify({
      provider: SocialProvider.KAKAO,
      credential: 'invalid-kakao-access-token-phase-n',
    }),
  });
  assert(bad.status === 401, `invalid kakao token expected 401 got ${bad.status}`);

  // Hybrid: DEV persona mock allowed
  const devA = await json<{ session: { accessToken: string; userId: string } }>(
    '/auth/social/mock-sign-in',
    {
      method: 'POST',
      body: JSON.stringify({ provider: SocialProvider.KAKAO, persona: MockAuthPersona.DEV_A }),
    },
  );
  assert(Boolean(devA.session.accessToken), 'DEV_A mock sign-in');

  // Hybrid: arbitrary mock exchange still works for smoke subjects
  const subject = `phase-n-kakao-e2e-${Date.now()}`;
  const mockExchange = await json<{ session: { userId: string } }>('/auth/social/exchange', {
    method: 'POST',
    body: JSON.stringify({
      provider: SocialProvider.KAKAO,
      credential: `mock:KAKAO:${subject}`,
    }),
  });
  const again = await json<{ session: { userId: string } }>('/auth/social/exchange', {
    method: 'POST',
    body: JSON.stringify({
      provider: SocialProvider.KAKAO,
      credential: `mock:KAKAO:${subject}`,
    }),
  });
  assert(mockExchange.session.userId === again.session.userId, 'duplicate callback same user');

  // Production real user identity capability (non-dev mock exchange user)
  const capUser = await json<{ session: { accessToken: string } }>('/auth/social/exchange', {
    method: 'POST',
    body: JSON.stringify({
      provider: SocialProvider.KAKAO,
      credential: `mock:KAKAO:cap-check-${Date.now()}`,
    }),
  });
  const cap = await json<{ status: string; canStart: boolean }>('/me/identity/capability', {
    headers: { Authorization: `Bearer ${capUser.session.accessToken}` },
  });
  assert(cap.status === 'UNAVAILABLE', 'non-dev user identity UNAVAILABLE on hybrid');

  // Arbitrary mock sign-in without persona in production hybrid should fail for scenario-only
  const scenarioOnly = await request('/auth/social/mock-sign-in', {
    method: 'POST',
    body: JSON.stringify({ provider: SocialProvider.KAKAO, scenario: 'NEW_USER' }),
  });
  assert(scenarioOnly.status === 403, `scenario-only mock expected 403 got ${scenarioOnly.status}`);

  console.log('PASS — Phase N Kakao E2E server checks');
}

main().catch((e) => {
  console.error('FAIL', e instanceof Error ? e.message : e);
  process.exit(1);
});
