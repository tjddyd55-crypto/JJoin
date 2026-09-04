import assert from 'node:assert/strict';
import test from 'node:test';
import { identityFor } from '../../../../app-variant-identity.cjs';

test('Naver native SDK uses variant app scheme for iOS return URL (not WebBrowser oauth redirect)', () => {
  assert.equal(identityFor('development').scheme, 'jjoindev');
  assert.equal(identityFor('production').scheme, 'jjoin');
});

test('Naver Android package identity matches Naver Developers console registration', () => {
  assert.equal(identityFor('development').androidPackage, 'com.jjoin.app.dev');
  assert.equal(identityFor('production').androidPackage, 'com.jjoin.app');
});
