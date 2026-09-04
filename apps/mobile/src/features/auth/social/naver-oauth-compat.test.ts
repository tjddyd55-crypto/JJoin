import assert from 'node:assert/strict';
import test from 'node:test';
import { naverLoginCallbackSchemeFor } from '../../../../app-variant-identity.cjs';

test('Naver OAuth redirect URI uses production callback scheme by default', () => {
  const scheme = naverLoginCallbackSchemeFor('production');
  assert.equal(scheme, 'jjoinnaverlogin');
  assert.equal(`${scheme}://oauth`, 'jjoinnaverlogin://oauth');
});

test('Naver OAuth redirect URI uses development callback scheme for DEV variant', () => {
  const scheme = naverLoginCallbackSchemeFor('development');
  assert.equal(scheme, 'jjoindevnaverlogin');
  assert.equal(`${scheme}://oauth`, 'jjoindevnaverlogin://oauth');
});
