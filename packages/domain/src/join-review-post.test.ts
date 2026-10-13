import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  buildJoinReviewPostContentPreview,
  buildJoinReviewPostPhotoObjectKey,
  isJoinReviewPostPhotoObjectKey,
  normalizeJoinReviewPostContent,
  normalizeJoinReviewPostTitle,
} from './join-review-post';

test('join review post normalize title and content', () => {
  assert.equal(normalizeJoinReviewPostTitle(' hello '), 'hello');
  assert.throws(() => normalizeJoinReviewPostTitle(''), /invalid_join_review_post_title/);
  assert.equal(normalizeJoinReviewPostContent(' body '), 'body');
});

test('join review post content preview truncates', () => {
  const long = '가'.repeat(200);
  const preview = buildJoinReviewPostContentPreview(long);
  assert.ok(preview.length <= 120);
  assert.match(preview, /…$/);
});

test('join review post photo object key is separate from session review keys', () => {
  const key = buildJoinReviewPostPhotoObjectKey({
    environmentPrefix: 'development',
    postId: 'post-1',
    fileId: 'file-1',
    extension: 'jpg',
  });
  assert.equal(key, 'development/join-review-posts/post-1/file-1.jpg');
  assert.equal(
    isJoinReviewPostPhotoObjectKey({ objectKey: key, environmentPrefix: 'development' }),
    true,
  );
  assert.equal(
    isJoinReviewPostPhotoObjectKey({
      objectKey: 'development/join-reviews/x/y.jpg',
      environmentPrefix: 'development',
    }),
    false,
  );
});
