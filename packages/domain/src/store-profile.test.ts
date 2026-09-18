import assert from 'node:assert/strict';
import test from 'node:test';
import {
  canEditStoreProfile,
  canPublishStoreProfile,
  formatStoreScreenBrandLabel,
  validateStoreScreenBrand,
} from './store-profile';

test('only active owner or admin can edit store profile', () => {
  assert.equal(
    canEditStoreProfile({
      ownershipStatus: 'ACTIVE',
      ownerUserId: 'o1',
      actorUserId: 'o1',
      isAdmin: false,
    }),
    true,
  );
  assert.equal(
    canEditStoreProfile({
      ownershipStatus: 'ACTIVE',
      ownerUserId: 'o1',
      actorUserId: 'x',
      isAdmin: false,
    }),
    false,
  );
  assert.equal(
    canEditStoreProfile({
      ownershipStatus: 'REVOKED',
      ownerUserId: 'o1',
      actorUserId: 'o1',
      isAdmin: false,
    }),
    false,
  );
  assert.equal(
    canEditStoreProfile({
      ownershipStatus: 'REVOKED',
      ownerUserId: 'o1',
      actorUserId: 'admin',
      isAdmin: true,
    }),
    true,
  );
});

test('OTHER brand requires text; public list only ACTIVE+PUBLIC', () => {
  assert.equal(validateStoreScreenBrand({ screenBrand: 'OTHER', screenBrandOther: '' }).ok, false);
  assert.deepEqual(validateStoreScreenBrand({ screenBrand: 'GOLFZON' }), {
    ok: true,
    screenBrandOther: null,
  });
  assert.equal(formatStoreScreenBrandLabel('KAKAO_VX'), '카카오 VX');
  assert.equal(
    canPublishStoreProfile({ visibility: 'PUBLIC', ownershipStatus: 'ACTIVE' }),
    true,
  );
  assert.equal(
    canPublishStoreProfile({ visibility: 'PRIVATE', ownershipStatus: 'ACTIVE' }),
    false,
  );
});
