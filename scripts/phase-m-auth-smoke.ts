/**
 * Phase M auth + identity smoke.
 * Usage:
 *   $env:API_BASE='https://api-production-2d67e.up.railway.app'
 *   pnpm exec tsx scripts/phase-m-auth-smoke.ts
 */
import {
  IdentityStatus,
  MockAuthPersona,
  SocialProvider,
} from '../packages/types/src/index.ts';

const API_BASE = process.env.API_BASE ?? 'http://127.0.0.1:3000';

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
    throw new Error(`${path} -> ${res.status} ${raw.slice(0, 200)}`);
  }
  return JSON.parse(raw) as T;
}

async function exchange(provider: SocialProvider, subject: string) {
  return json<{ session: { accessToken: string; userId: string }; me: { userId: string }; nextStep: string }>(
    '/auth/social/exchange',
    {
      method: 'POST',
      body: JSON.stringify({
        provider,
        credential: `mock:${provider}:${subject}`,
      }),
    },
  );
}

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

async function main() {
  console.log('API_BASE=', API_BASE);
  const health = await json<{ status: string; database: string }>('/health');
  assert(health.status === 'ok' && health.database === 'connected', 'health');

  const subject = `phase-m-${Date.now()}`;
  const first = await exchange(SocialProvider.KAKAO, subject);
  assert(first.nextStep === 'TERMS', 'new user needs terms');

  const second = await exchange(SocialProvider.KAKAO, subject);
  assert(second.session.userId === first.session.userId, 'same subject same user');
  assert(second.nextStep === 'TERMS', 'still needs terms');

  const token = first.session.accessToken;

  await json('/me/terms', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      termsOfService: true,
      privacy: true,
      identity: true,
      location: true,
      marketing: false,
    }),
  });

  const idStart = await json<{ sessionId: string }>('/me/identity/start', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });

  const afterIdentity = await json<{ identity: { verificationStatus: string } }>(
    '/me/identity/confirm',
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ sessionId: idStart.sessionId, outcome: 'success' }),
    },
  );
  assert(afterIdentity.identity.verificationStatus === IdentityStatus.VERIFIED, 'verified');

  await json('/me/profile/setup', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      nickname: `테스트${Date.now().toString().slice(-4)}`,
      gender: 'MALE',
      ageBand: 'TWENTIES',
      regionLabel: '거제',
      bio: '',
      sportCode: 'SCREEN_GOLF',
      skillLevel: 'BEGINNER',
    }),
  });

  await json('/me/profile/avatar', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ skip: true }),
  });

  await json('/me/onboarding/location', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });

  const me = await json<{ authAppHints: { locationOnboardingComplete: boolean } }>('/me', {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert(me.authAppHints.locationOnboardingComplete, 'location onboarding');

  const publicProfile = await json<Record<string, unknown>>(
    `/users/${first.session.userId}/public-profile`,
  );
  for (const denied of ['phone', 'birthDate', 'ci', 'di', 'providerSubject']) {
    assert(!(denied in publicProfile), `public leak ${denied}`);
  }

  const gate = await fetch(`${API_BASE}/joins`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ sportCode: 'x' }),
  });
  assert(gate.status === 400 || gate.status === 403, 'invalid join rejected');

  const devA = await json<{ session: { accessToken: string } }>('/auth/social/mock-sign-in', {
    method: 'POST',
    body: JSON.stringify({ provider: SocialProvider.KAKAO, persona: MockAuthPersona.DEV_A }),
  });
  assert(devA.session.accessToken, 'DEV_A regression');

  const invalid = await fetch(`${API_BASE}/auth/social/exchange`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ provider: SocialProvider.KAKAO, credential: 'not-a-mock-token' }),
  });
  assert(invalid.status === 401, 'invalid credential rejected');

  console.log('Phase M auth smoke PASS');
}

main().catch((e) => {
  console.error(e instanceof Error ? (e.stack ?? e.message) : e);
  process.exit(1);
});
