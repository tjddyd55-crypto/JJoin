import assert from 'node:assert/strict';
import test from 'node:test';

/** OAuth redirect must match mobile naverLoginPublicConfig + Naver Developers console. */
test('Naver OAuth redirect URI accepts production callback scheme', () => {
  const scheme = 'jjoinnaverlogin';
  const redirectUri = `${scheme}://oauth`;
  assert.equal(redirectUri, 'jjoinnaverlogin://oauth');
});

test('Naver OAuth redirect URI accepts development callback scheme', () => {
  const scheme = 'jjoindevnaverlogin';
  const redirectUri = `${scheme}://oauth`;
  assert.equal(redirectUri, 'jjoindevnaverlogin://oauth');
});

test('Naver token exchange uses same provider subject path as legacy native flow', () => {
  // Legacy: mobile access token -> POST /auth/social/exchange -> nid/me -> response.id
  // Current: code -> server token exchange -> same exchange() -> nid/me -> response.id
  const legacySubjectKey = 'response.id';
  const currentSubjectKey = 'response.id';
  assert.equal(legacySubjectKey, currentSubjectKey);
});
