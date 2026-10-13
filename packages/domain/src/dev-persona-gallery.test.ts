import assert from 'node:assert/strict';
import test from 'node:test';
import { MAX_PROFILE_GALLERY_PHOTOS } from './profile-photos';
import {
  assertDevPersonaGallerySeedAllowed,
  buildDevPersonaGalleryObjectKeys,
  isDevPersonaAvatarObjectKey,
} from './dev-persona-gallery';

const HAJUN = 'development/investor-demo/v2/avatars/hajun.jpg';

test('demo avatar keys stay on the development investor-demo prefix', () => {
  assert.equal(isDevPersonaAvatarObjectKey(HAJUN), true);
  assert.equal(isDevPersonaAvatarObjectKey('production/investor-demo/v2/avatars/hajun.jpg'), false);
  assert.equal(isDevPersonaAvatarObjectKey('development/investor-demo/v2/field/field.jpg'), false);
});

test('each demo persona gallery has the avatar plus several distinct photos', () => {
  const hajun = buildDevPersonaGalleryObjectKeys(HAJUN);
  const seoa = buildDevPersonaGalleryObjectKeys('development/investor-demo/v2/avatars/seoa.jpg');

  assert.equal(hajun.length, 4);
  assert.ok(hajun.length <= MAX_PROFILE_GALLERY_PHOTOS);
  assert.equal(hajun[0], HAJUN);
  assert.equal(new Set(hajun).size, hajun.length);
  assert.ok(hajun.every((key) => key.startsWith('development/investor-demo/v2/')));
  assert.notDeepEqual(hajun.slice(1), seoa.slice(1));
});

test('gallery seed refuses production and unlabeled environments', () => {
  assert.throws(
    () => assertDevPersonaGallerySeedAllowed({ appVariant: 'production', railwayEnvironment: 'development' }),
    /refuses_production/,
  );
  assert.throws(
    () => assertDevPersonaGallerySeedAllowed({ appVariant: 'development', railwayEnvironment: 'production' }),
    /refuses_production/,
  );
  assert.throws(
    () => assertDevPersonaGallerySeedAllowed({ appVariant: '', railwayEnvironment: '' }),
    /requires_explicit_development/,
  );
  assert.doesNotThrow(() =>
    assertDevPersonaGallerySeedAllowed({ appVariant: 'development', railwayEnvironment: null }),
  );
});
