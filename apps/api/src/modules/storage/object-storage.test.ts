import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  buildProfileAvatarObjectKey,
  buildPublicObjectUrl,
  isAllowedProfileImageMime,
  MAX_PROFILE_GALLERY_PHOTOS,
  resolveStorageEnvironmentPrefix,
} from '@jjoin/domain';
import { resolveObjectStorageConfig } from '../storage/object-storage.service';

test('resolveObjectStorageConfig uses development prefix on development variant', () => {
  const prevVariant = process.env.JJOIN_APP_VARIANT;
  const prevMode = process.env.MEDIA_STORAGE_MODE;
  process.env.JJOIN_APP_VARIANT = 'development';
  process.env.MEDIA_STORAGE_MODE = 'mock';
  const config = resolveObjectStorageConfig();
  assert.equal(config.environmentPrefix, 'development');
  process.env.JJOIN_APP_VARIANT = prevVariant;
  process.env.MEDIA_STORAGE_MODE = prevMode;
});

test('avatar object key and public url stay object-key based', () => {
  const key = buildProfileAvatarObjectKey({
    environmentPrefix: resolveStorageEnvironmentPrefix('production'),
    userId: 'user-1',
    fileId: 'file-1',
    extension: 'jpg',
  });
  const url = buildPublicObjectUrl('https://pub-example.r2.dev', key);
  assert.match(key, /^production\/profiles\/user-1\/avatar\//);
  assert.equal(url, `https://pub-example.r2.dev/${key}`);
});

test('gallery max constant is 5', () => {
  assert.equal(MAX_PROFILE_GALLERY_PHOTOS, 5);
});

test('mime guard rejects gif', () => {
  assert.equal(isAllowedProfileImageMime('image/gif'), false);
  assert.equal(isAllowedProfileImageMime('image/jpeg'), true);
});
