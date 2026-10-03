/**
 * DEV API closeout for community join review board.
 *   pnpm exec tsx scripts/join-review-post-dev-api-closeout.ts
 */
import assert from 'node:assert/strict';

const TAG = '[join-review-post-api-closeout]';
const base = process.env.JJOIN_DEV_API_BASE_URL?.replace(/\/$/, '');
const token = process.env.JJOIN_DEV_BEARER_TOKEN;

if (!base || !token) {
  console.error(`${TAG} set JJOIN_DEV_API_BASE_URL and JJOIN_DEV_BEARER_TOKEN`);
  process.exit(1);
}

async function json<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  const body = await res.text();
  if (!res.ok) throw new Error(`${path} ${res.status} ${body}`);
  return JSON.parse(body) as T;
}

type Detail = {
  reviewId: string;
  title: string;
  content: string;
  isMine: boolean;
  photos: { photoId: string }[];
};

type List = { items: { reviewId: string }[]; nextCursor: string | null };

async function main() {
  const created = await json<Detail>('/join-reviews', {
    method: 'POST',
    body: JSON.stringify({
      title: '오늘 필드 쪼인 너무 재미있었습니다',
      content: '처음 만난 분들과 라운딩했는데 분위기도 좋았고\n다음에도 같이 치고 싶네요.',
    }),
  });
  assert.equal(created.isMine, true);
  assert.equal(Object.hasOwn(created as object, 'joinId'), false);

  const list = await json<List>('/join-reviews?limit=5');
  assert.ok(list.items.some((row) => row.reviewId === created.reviewId));

  const detail = await json<Detail>(`/join-reviews/${created.reviewId}`);
  assert.equal(detail.title, created.title);

  const updated = await json<Detail>(`/join-reviews/${created.reviewId}`, {
    method: 'PATCH',
    body: JSON.stringify({ title: '수정된 제목' }),
  });
  assert.equal(updated.title, '수정된 제목');

  await json(`/join-reviews/${created.reviewId}`, { method: 'DELETE' });
  console.log(`${TAG} PASS create/list/detail/patch/delete`);
}

main().catch((err) => {
  console.error(`${TAG} FAIL`, err);
  process.exit(1);
});
