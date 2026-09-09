import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  ALLOWED_PROFILE_IMAGE_MIMES,
  buildProfileAvatarObjectKey,
  buildProfileGalleryObjectKey,
  buildPublicObjectUrl,
  isAllowedProfileImageMime,
  isOwnedProfileObjectKey,
  isPublicReadableObjectKey,
  MAX_PROFILE_GALLERY_PHOTOS,
  resolveStorageEnvironmentPrefix,
} from './profile-photos';

test('resolveStorageEnvironmentPrefix maps app variants', () => {
  assert.equal(resolveStorageEnvironmentPrefix('development'), 'development');
  assert.equal(resolveStorageEnvironmentPrefix('production'), 'production');
});

test('buildProfileAvatarObjectKey uses environment and uuid segments', () => {
  const key = buildProfileAvatarObjectKey({
    environmentPrefix: 'development',
    userId: 'user-1',
    fileId: 'abc123',
    extension: 'jpg',
  });
  assert.equal(key, 'development/profiles/user-1/avatar/abc123.jpg');
});

test('buildProfileGalleryObjectKey uses gallery path', () => {
  const key = buildProfileGalleryObjectKey({
    environmentPrefix: 'production',
    userId: 'user-2',
    fileId: 'photo-9',
    extension: 'webp',
  });
  assert.equal(key, 'production/profiles/user-2/gallery/photo-9.webp');
});

test('buildPublicObjectUrl joins base and object key', () => {
  assert.equal(
    buildPublicObjectUrl('https://pub-example.r2.dev/', 'development/profiles/u1/avatar/a.jpg'),
    'https://pub-example.r2.dev/development/profiles/u1/avatar/a.jpg',
  );
  assert.equal(buildPublicObjectUrl('http://cdn.example.com', 'a/b.jpg'), 'https://cdn.example.com/a/b.jpg');
});

test('isAllowedProfileImageMime accepts supported mimes only', () => {
  for (const mime of ALLOWED_PROFILE_IMAGE_MIMES) {
    assert.equal(isAllowedProfileImageMime(mime), true);
  }
  assert.equal(isAllowedProfileImageMime('image/gif'), false);
});

test('isOwnedProfileObjectKey validates ownership prefix', () => {
  assert.equal(
    isOwnedProfileObjectKey({
      objectKey: 'development/profiles/u1/gallery/x.jpg',
      environmentPrefix: 'development',
      userId: 'u1',
    }),
    true,
  );
  assert.equal(
    isOwnedProfileObjectKey({
      objectKey: 'development/profiles/u2/gallery/x.jpg',
      environmentPrefix: 'development',
      userId: 'u1',
    }),
    false,
  );
});

test('MAX_PROFILE_GALLERY_PHOTOS is 5', () => {
  assert.equal(MAX_PROFILE_GALLERY_PHOTOS, 5);
});

test('isPublicReadableObjectKey allows mall and profile media only', () => {
  assert.equal(
    isPublicReadableObjectKey({
      objectKey: 'development/mall/products/p1/cover/a.png',
      environmentPrefix: 'development',
    }),
    true,
  );
  assert.equal(
    isPublicReadableObjectKey({
      objectKey: 'development/profiles/u1/gallery/a.webp',
      environmentPrefix: 'development',
    }),
    true,
  );
  assert.equal(
    isPublicReadableObjectKey({
      objectKey: 'production/mall/products/p1/cover/a.png',
      environmentPrefix: 'development',
    }),
    false,
  );
  assert.equal(
    isPublicReadableObjectKey({
      objectKey: 'development/mall/products/p1/secret/a.png',
      environmentPrefix: 'development',
    }),
    false,
  );
});
