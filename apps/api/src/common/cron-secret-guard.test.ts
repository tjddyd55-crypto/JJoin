import assert from 'node:assert/strict';
import test from 'node:test';
import { assertCronAuthorized, matchesCronSecret } from './cron-secret';

test('assertCronAuthorized rejects when secret not configured', () => {
  const prev = process.env.SETTLEMENT_CRON_SECRET;
  delete process.env.SETTLEMENT_CRON_SECRET;
  try {
    assert.throws(
      () => assertCronAuthorized('anything', [undefined, '']),
      (e: Error) => e.message.includes('cron_secret_not_configured'),
    );
  } finally {
    if (prev) process.env.SETTLEMENT_CRON_SECRET = prev;
  }
});

test('assertCronAuthorized rejects wrong secret', () => {
  assert.throws(
    () => assertCronAuthorized('wrong', ['expected-secret']),
    (e: Error) => e.message.includes('cron_forbidden'),
  );
});

test('assertCronAuthorized accepts matching secret', () => {
  assertCronAuthorized('expected-secret', ['expected-secret']);
  assert.equal(matchesCronSecret('expected-secret', 'expected-secret'), true);
});
