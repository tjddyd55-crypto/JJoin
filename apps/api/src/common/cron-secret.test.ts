import assert from 'node:assert/strict';
import test from 'node:test';
import { extractCronSecret, matchesCronSecret } from './cron-secret';

test('matchesCronSecret rejects missing/wrong and accepts exact', () => {
  assert.equal(matchesCronSecret(undefined, 'secret-value'), false);
  assert.equal(matchesCronSecret('secret-value', undefined), false);
  assert.equal(matchesCronSecret('wrong', 'secret-value'), false);
  assert.equal(matchesCronSecret('secret-value', 'secret-value'), true);
});

test('extractCronSecret prefers dedicated header then Bearer', () => {
  assert.equal(
    extractCronSecret({ 'x-settlement-cron-secret': 'from-header', authorization: 'Bearer other' }),
    'from-header',
  );
  assert.equal(extractCronSecret({ authorization: 'Bearer only-bearer' }), 'only-bearer');
  assert.equal(extractCronSecret({}), undefined);
});
