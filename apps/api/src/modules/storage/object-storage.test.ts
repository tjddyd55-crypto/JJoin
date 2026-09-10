import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  buildProfileAvatarObjectKey,
  buildPublicObjectUrl,
  isAllowedProfileImageMime,
  MAX_PROFILE_GALLERY_PHOTOS,
  resolveStorageEnvironmentPrefix,
} from '@jjoin/domain';
import {
  resolveObjectStorageConfig,
  resolvePublicMediaApiBase,
  resolvePublicObjectUrl,
} from '../storage/object-storage.service';

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

test('resolvePublicMediaApiBase prefers PUBLIC_API_BASE_URL', () => {
  const prevPublic = process.env.PUBLIC_API_BASE_URL;
  const prevRailway = process.env.RAILWAY_PUBLIC_DOMAIN;
  process.env.PUBLIC_API_BASE_URL = 'https://api.example.com/';
  delete process.env.RAILWAY_PUBLIC_DOMAIN;
  assert.equal(resolvePublicMediaApiBase(), 'https://api.example.com');
  process.env.PUBLIC_API_BASE_URL = prevPublic;
  process.env.RAILWAY_PUBLIC_DOMAIN = prevRailway;
});

test('resolvePublicObjectUrl uses api proxy when MEDIA_PUBLIC_DELIVERY=api', () => {
  const prevMode = process.env.MEDIA_PUBLIC_DELIVERY;
  const prevPublic = process.env.PUBLIC_API_BASE_URL;
  const prevRailway = process.env.RAILWAY_PUBLIC_DOMAIN;
  process.env.MEDIA_PUBLIC_DELIVERY = 'api';
  delete process.env.PUBLIC_API_BASE_URL;
  process.env.RAILWAY_PUBLIC_DOMAIN = 'api-production-2d67e.up.railway.app';
  const key = 'production/mall/products/p1/cover/a.jpg';
  const url = resolvePublicObjectUrl({
    objectKey: key,
    publicBaseUrl: 'https://jjoinzone.r2.dev',
  });
  assert.equal(
    url,
    'https://api-production-2d67e.up.railway.app/media/objects?key=production%2Fmall%2Fproducts%2Fp1%2Fcover%2Fa.jpg',
  );
  process.env.MEDIA_PUBLIC_DELIVERY = prevMode;
  process.env.PUBLIC_API_BASE_URL = prevPublic;
  process.env.RAILWAY_PUBLIC_DOMAIN = prevRailway;
});
