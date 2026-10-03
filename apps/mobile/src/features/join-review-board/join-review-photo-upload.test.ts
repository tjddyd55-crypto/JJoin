import assert from 'node:assert/strict';
import test from 'node:test';
import { JOIN_REVIEW_POST_PHOTO_MAX } from '@jjoin/domain';
import {
  buildReviewPhotoFileName,
  cacheExtensionForMime,
  remainingJoinReviewPhotoSlots,
  resolveReviewPhotoMimeType,
  uriScheme,
} from './join-review-photo-helpers';
import {
  createPendingReviewPhoto,
  pendingPhotosToUpload,
} from './join-review-pending-photos';

test('remainingJoinReviewPhotoSlots respects JOIN_REVIEW_POST_PHOTO_MAX', () => {
  assert.equal(JOIN_REVIEW_POST_PHOTO_MAX, 5);
  assert.equal(remainingJoinReviewPhotoSlots(0), 5);
  assert.equal(remainingJoinReviewPhotoSlots(2), 3);
  assert.equal(remainingJoinReviewPhotoSlots(5), 0);
});

test('buildReviewPhotoFileName uses asset fileName when present', () => {
  assert.equal(buildReviewPhotoFileName('image/png', 'shot.png'), 'shot.png');
});

test('buildReviewPhotoFileName falls back to mime extension', () => {
  const name = buildReviewPhotoFileName('image/heic', null);
  assert.match(name, /\.heic$/);
});

test('resolveReviewPhotoMimeType preserves heic/heif and normalizes jpg', () => {
  assert.equal(resolveReviewPhotoMimeType('image/jpg'), 'image/jpeg');
  assert.equal(resolveReviewPhotoMimeType('image/heic'), 'image/heic');
  assert.equal(resolveReviewPhotoMimeType('image/heif'), 'image/heif');
});

test('cacheExtensionForMime does not force heic to jpg', () => {
  assert.equal(cacheExtensionForMime('image/heic'), 'heic');
});

test('uriScheme detects content and file', () => {
  assert.equal(uriScheme('content://media/external/images/media/1'), 'content');
  assert.equal(uriScheme('file:///cache/x.jpg'), 'file');
});

test('pendingPhotosToUpload skips uploaded items', () => {
  const a = createPendingReviewPhoto({
    uri: 'file:///a.jpg',
    mimeType: 'image/jpeg',
    fileName: 'a.jpg',
  });
  const b = createPendingReviewPhoto({
    uri: 'file:///b.jpg',
    mimeType: 'image/jpeg',
    fileName: 'b.jpg',
  });
  a.uploaded = true;
  assert.deepEqual(pendingPhotosToUpload([a, b]).map((p) => p.picked.fileName), ['b.jpg']);
});
