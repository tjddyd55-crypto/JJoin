/**
 * DEV API closeout: join session review hub + CRUD + photo R2 + auth (no Production).
 *
 *   pnpm exec tsx scripts/join-session-review-dev-api-closeout.ts
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  MockAuthPersona,
  SocialProvider,
  type JoinSessionReviewDto,
  type MyJoinSessionReviewsHubDto,
} from '../packages/types/src/index.ts';

const API = (process.env.API_BASE ?? 'https://api-development-e387.up.railway.app').replace(
  /\/$/,
  '',
);
const TAG = '[join-session-review-api-closeout]';
const FIELD_JOIN = process.env.QA_FIELD_JOIN_ID ?? '77154a6b-a806-406e-afde-4cb75986b6e1';
const GOLF_IMAGE = join(
  process.cwd(),
  'apps/mobile/assets/images/골프_코스의_하트_포즈_커플.png',
);

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`${TAG} ${msg}`);
}

async function json<T>(path: string, init?: RequestInit): Promise<{ status: number; body: T }> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
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
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: SocialProvider.KAKAO, persona }),
    },
  );
  assert(status === 200 || status === 201, `mock sign-in ${status}`);
  return body.session.accessToken;
}

async function main() {
  if (/production|api-production/i.test(API)) {
    throw new Error(`${TAG} production API forbidden`);
  }

  const devA = await signIn(MockAuthPersona.DEV_A);
  const devB = await signIn(MockAuthPersona.DEV_B);

  const hub = await json<MyJoinSessionReviewsHubDto>('/me/join-session-reviews', {
    headers: { Authorization: `Bearer ${devA}` },
  });
  assert(hub.status === 200, `hub ${hub.status}`);
  assert(hub.body.eligible.length >= 2, `eligible=${hub.body.eligible.length}`);
  assert(hub.body.mine.length === 0, `mine should be empty before write`);

  const fieldEligible = hub.body.eligible.find((e) => e.venueType === 'FIELD');
  assert(fieldEligible?.joinId, 'FIELD eligible missing');
  const joinId = fieldEligible.joinId;

  const upsert = await json<JoinSessionReviewDto>(`/joins/${joinId}/session-reviews`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${devA}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: '즐거운 쪼인이었습니다',
      content: '처음 만난 분들과 편하게 라운딩했습니다.',
    }),
  });
  assert(upsert.status === 200 || upsert.status === 201, `upsert ${upsert.status}`);

  const form = new FormData();
  const bytes = readFileSync(GOLF_IMAGE);
  form.append('file', new Blob([bytes], { type: 'image/png' }), 'golf.png');
  const photoRes = await fetch(`${API}/joins/${joinId}/session-reviews/me/photos`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${devA}` },
    body: form,
  });
  const photoBody = (await photoRes.json()) as JoinSessionReviewDto;
  assert(photoRes.ok, `photo upload ${photoRes.status}`);
  assert(photoBody.photos.length >= 1, 'photo missing after upload');
  const photoId = photoBody.photos[0]!.photoId;
  const objectUrl = photoBody.photos[0]!.imageUrl;
  assert(objectUrl.startsWith('http'), 'imageUrl missing');

  const headBefore = await fetch(objectUrl, { method: 'HEAD' });
  assert(headBefore.ok, `R2 public HEAD before delete ${headBefore.status}`);

  const hubAfterWrite = await json<MyJoinSessionReviewsHubDto>('/me/join-session-reviews', {
    headers: { Authorization: `Bearer ${devA}` },
  });
  assert(
    !hubAfterWrite.body.eligible.some((e) => e.joinId === joinId),
    'eligible should drop join after review',
  );
  assert(hubAfterWrite.body.mine.some((m) => m.joinId === joinId), 'mine should include review');

  const edit = await json<JoinSessionReviewDto>(`/joins/${joinId}/session-reviews`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${devA}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: '즐거운 쪼인이었습니다 (수정)',
      content: '처음 만난 분들과 편하게 라운딩했습니다. 다음에 또 만나요.',
    }),
  });
  assert(edit.status === 200 || edit.status === 201, `edit ${edit.status}`);

  const delPhoto = await json<JoinSessionReviewDto>(
    `/joins/${joinId}/session-reviews/me/photos/${photoId}`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${devA}` },
    },
  );
  assert(delPhoto.status === 200, `delete photo ${delPhoto.status}`);
  assert(delPhoto.body.photos.length === 0, 'photo row should be gone');

  const headAfter = await fetch(objectUrl, { method: 'HEAD' });
  assert(!headAfter.ok, `R2 object should be deleted (got ${headAfter.status})`);

  const forbiddenEdit = await json(`/joins/${joinId}/session-reviews`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${devB}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ title: 'x', content: 'y' }),
  });
  assert(forbiddenEdit.status === 403, `non-participant upsert ${forbiddenEdit.status}`);

  const reviewId = upsert.body.reviewId;
  const delReview = await json(`/joins/${joinId}/session-reviews/${reviewId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${devA}` },
  });
  assert(delReview.status === 200 || delReview.status === 204, `delete review ${delReview.status}`);

  const hubAfterDelete = await json<MyJoinSessionReviewsHubDto>('/me/join-session-reviews', {
    headers: { Authorization: `Bearer ${devA}` },
  });
  assert(
    hubAfterDelete.body.eligible.some((e) => e.joinId === joinId),
    'eligible should return join after delete',
  );
  assert(
    !hubAfterDelete.body.mine.some((m) => m.joinId === joinId),
    'mine should be empty after delete',
  );

  console.log(`${TAG} PASS joinId=${joinId}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
