/**
 * Phase P Google Android E2E — server-side verification helpers.
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
  console.log('Phase P Google E2E server checks');
  console.log('API_BASE=', API_BASE);

  const health = await json<{ status: string }>('/health');
  assert(health.status === 'ok', 'health');

  const bad = await request('/auth/social/exchange', {
    method: 'POST',
    body: JSON.stringify({
      provider: SocialProvider.GOOGLE,
      credential: 'invalid-google-id-token-phase-p',
    }),
  });
  assert(bad.status === 401, `invalid google token expected 401 got ${bad.status}`);

  const jwtShaped = await request('/auth/social/exchange', {
    method: 'POST',
    body: JSON.stringify({
      provider: SocialProvider.GOOGLE,
      credential:
        'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwiYXVkIjoid3JvbmctYXVkaWVuY2UuYXBwcy5nb29nbGV1c2VyY29udGVudC5jb20iLCJpc3MiOiJodHRwczovL2FjY291bnRzLmdvb2dsZS5jb20iLCJleHAiOjk5OTk5OTk5OTl9.sig',
    }),
  });
  assert(jwtShaped.status === 401, `malformed jwt expected 401 got ${jwtShaped.status}`);

  const subject = `phase-p-google-e2e-${Date.now()}`;
  const mockExchange = await json<{ session: { userId: string; accessToken: string } }>(
    '/auth/social/exchange',
    {
      method: 'POST',
      body: JSON.stringify({
        provider: SocialProvider.GOOGLE,
        credential: `mock:GOOGLE:${subject}`,
      }),
    },
  );
  const again = await json<{ session: { userId: string } }>('/auth/social/exchange', {
    method: 'POST',
    body: JSON.stringify({
      provider: SocialProvider.GOOGLE,
      credential: `mock:GOOGLE:${subject}`,
    }),
  });
  assert(mockExchange.session.userId === again.session.userId, 'duplicate exchange same user');

  const cap = await json<{ status: string }>('/me/identity/capability', {
    headers: { Authorization: `Bearer ${mockExchange.session.accessToken}` },
  });
  assert(
    cap.status === 'UNAVAILABLE' ||
      cap.status === 'IDENTITY_REQUIRED' ||
      cap.status === 'REQUIRED',
    `identity capability got ${cap.status}`,
  );

  const scenarioOnly = await request('/auth/social/mock-sign-in', {
    method: 'POST',
    body: JSON.stringify({ provider: SocialProvider.GOOGLE, scenario: 'NEW_USER' }),
  });
  assert(scenarioOnly.status === 403, `scenario-only mock expected 403 got ${scenarioOnly.status}`);

  const devA = await json<{ session: { accessToken: string } }>('/auth/social/mock-sign-in', {
    method: 'POST',
    body: JSON.stringify({ provider: SocialProvider.KAKAO, persona: MockAuthPersona.DEV_A }),
  });
  assert(Boolean(devA.session.accessToken), 'DEV_A hybrid persona');

  console.log('PASS — Phase P Google E2E server checks');
}

main().catch((e) => {
  console.error('FAIL', e instanceof Error ? e.message : e);
  process.exit(1);
});
