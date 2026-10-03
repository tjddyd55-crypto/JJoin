import assert from 'node:assert/strict';
import test from 'node:test';
import { createJoinReviewPostSchema, updateJoinReviewPostSchema } from '@jjoin/validation';

test('create join review post requires title and content without joinId', () => {
  const parsed = createJoinReviewPostSchema.safeParse({
    title: '오늘 라운드',
    content: '재미있었습니다',
  });
  assert.equal(parsed.success, true);
  assert.equal(Object.hasOwn(parsed.data ?? {}, 'joinId'), false);
});

test('update join review post rejects empty patch', () => {
  assert.equal(updateJoinReviewPostSchema.safeParse({}).success, false);
  assert.equal(updateJoinReviewPostSchema.safeParse({ title: '수정' }).success, true);
});
