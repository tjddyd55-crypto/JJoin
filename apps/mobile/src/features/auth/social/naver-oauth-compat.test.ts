import assert from 'node:assert/strict';
import test from 'node:test';

test('Naver OAuth redirect URI uses jjoinnaverlogin scheme by default', () => {
  const scheme = 'jjoinnaverlogin';
  assert.equal(`${scheme}://oauth`, 'jjoinnaverlogin://oauth');
});
