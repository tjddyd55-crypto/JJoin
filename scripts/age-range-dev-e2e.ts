/**
 * Age range selector DEV API readback.
 *   API_BASE=https://api-development-e387.up.railway.app pnpm exec tsx scripts/age-range-dev-e2e.ts
 */
import { MockAuthPersona, SocialProvider } from '../packages/types/src/index.ts';

const API_BASE = process.env.API_BASE ?? 'https://api-development-e387.up.railway.app';

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
    throw new Error(`${path} -> ${res.status} ${raw.slice(0, 300)}`);
  }
  return JSON.parse(raw) as T;
}

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

async function signIn(persona: MockAuthPersona) {
  return json<{ session: { accessToken: string } }>('/auth/social/mock-sign-in', {
    method: 'POST',
    body: JSON.stringify({ provider: SocialProvider.KAKAO, persona }),
  });
}

async function main() {
  const health = await json<{ ok?: boolean; appVariant?: string }>('/health');
  assert(health.appVariant === 'development', `expected development, got ${health.appVariant}`);

  const { session } = await signIn(MockAuthPersona.DEV_A);
  const token = session.accessToken;
  const tag = `age-range-e2e-${Date.now()}`;

  const ranged = await json<{ id: string; minAge: number | null; maxAge: number | null }>('/clubs', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      name: `[${tag}] ranged`,
      intro: 'age range e2e',
      activityRegions: [{ sido: '경기', sigungu: '고양시', displayName: '경기 고양시' }],
      activityType: 'SCREEN',
      joinMode: 'APPROVAL',
      visibility: 'PUBLIC',
      minAge: 31,
      maxAge: 55,
      primaryAgeGroup: null,
    }),
  });
  assert(ranged.minAge === 31 && ranged.maxAge === 55, `ranged readback ${ranged.minAge}/${ranged.maxAge}`);

  const detail = await json<{ minAge: number | null; maxAge: number | null }>(`/clubs/${ranged.id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert(detail.minAge === 31 && detail.maxAge === 55, `detail readback ${detail.minAge}/${detail.maxAge}`);

  const unrestricted = await json<{ id: string; minAge: number | null; maxAge: number | null }>('/clubs', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      name: `[${tag}] open`,
      intro: 'age range e2e unrestricted',
      activityRegions: [{ sido: '경기', sigungu: '고양시', displayName: '경기 고양시' }],
      activityType: 'SCREEN',
      joinMode: 'APPROVAL',
      visibility: 'PUBLIC',
      minAge: null,
      maxAge: null,
    }),
  });
  assert(unrestricted.minAge == null && unrestricted.maxAge == null, 'unrestricted readback');

  console.log('AGE_RANGE_DEV_E2E_PASS');
  console.log(JSON.stringify({ rangedClubId: ranged.id, unrestrictedClubId: unrestricted.id }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
