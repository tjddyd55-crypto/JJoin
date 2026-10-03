/**
 * DEV API closeout for community join review board.
 *   pnpm exec tsx scripts/join-review-post-dev-api-closeout.ts
 */
import assert from 'node:assert/strict';
import { MockAuthPersona } from '../packages/types/src/index.ts';

const TAG = '[join-review-post-api-closeout]';
const API = (process.env.API_BASE ?? 'https://api-development-e387.up.railway.app').replace(
  /\/$/,
  '',
);

async function json<T>(
  path: string,
  init?: RequestInit,
): Promise<{ status: number; body: T }> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  const text = await res.text();
  let body: T;
  try {
    body = text ? (JSON.parse(text) as T) : ({} as T);
  } catch {
    throw new Error(`${path} -> ${res.status} non-json: ${text.slice(0, 200)}`);
  }
  return { status: res.status, body };
}

async function signIn(persona: MockAuthPersona): Promise<string> {
  const { status, body } = await json<{ session: { accessToken: string } }>(
    '/auth/social/mock-sign-in',
    {
      method: 'POST',
      body: JSON.stringify({ provider: 'KAKAO', persona }),
    },
  );
  if (status !== 201 && status !== 200) throw new Error(`sign_in_failed:${status}`);
  return body.session.accessToken;
}

type Detail = {
  reviewId: string;
  title: string;
  content: string;
  isMine: boolean;
  photos: { photoId: string }[];
};

type List = { items: { reviewId: string }[]; nextCursor: string | null };

async function authed<T>(token: string, path: string, init?: RequestInit) {
  return json<T>(path, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  });
}

async function main() {
  const tokenA = await signIn(MockAuthPersona.DEV_A);
  const tokenB = await signIn(MockAuthPersona.DEV_B);

  const { status: createStatus, body: created } = await authed<Detail>(tokenA, '/join-reviews', {
    method: 'POST',
    body: JSON.stringify({
      title: '오늘 필드 쪼인 너무 재미있었습니다',
      content: '처음 만난 분들과 라운딩했는데 분위기도 좋았고\n다음에도 같이 치고 싶네요.',
    }),
  });
  assert.ok(createStatus === 200 || createStatus === 201);
  assert.equal(created.isMine, true);
  assert.equal(Object.hasOwn(created as object, 'joinId'), false);

  const { body: list } = await authed<List>(tokenB, '/join-reviews?limit=5');
  assert.ok(list.items.some((row) => row.reviewId === created.reviewId));

  const { body: detail } = await authed<Detail>(tokenB, `/join-reviews/${created.reviewId}`);
  assert.equal(detail.title, created.title);

  const { body: updated } = await authed<Detail>(tokenA, `/join-reviews/${created.reviewId}`, {
    method: 'PATCH',
    body: JSON.stringify({ title: '수정된 제목' }),
  });
  assert.equal(updated.title, '수정된 제목');

  const forbidden = await authed<unknown>(tokenB, `/join-reviews/${created.reviewId}`, {
    method: 'PATCH',
    body: JSON.stringify({ title: '해킹' }),
  });
  assert.equal(forbidden.status, 403);

  await authed(tokenA, `/join-reviews/${created.reviewId}`, { method: 'DELETE' });
  console.log(`${TAG} PASS create/list/detail/patch/delete/forbidden`);
}

main().catch((err) => {
  console.error(`${TAG} FAIL`, err);
  process.exit(1);
});
