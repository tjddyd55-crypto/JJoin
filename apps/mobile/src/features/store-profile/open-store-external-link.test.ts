import assert from 'node:assert/strict';
import test from 'node:test';
import { isSafeExternalUrl } from './store-external-url-safety';

test('isSafeExternalUrl allows http/https only', () => {
  assert.equal(isSafeExternalUrl('https://booking.naver.com/foo'), true);
  assert.equal(isSafeExternalUrl('http://example.com'), true);
  assert.equal(isSafeExternalUrl('javascript:alert(1)'), false);
  assert.equal(isSafeExternalUrl('data:text/html,hi'), false);
  assert.equal(isSafeExternalUrl('tel:01012345678'), false);
});
