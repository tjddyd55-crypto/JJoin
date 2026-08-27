import assert from 'node:assert/strict';
import test from 'node:test';
import { hashPassword, readAdminBootstrapEnv, verifyPassword } from './password';

test('hash/verify password roundtrip', async () => {
  const hash = await hashPassword('test-password-value');
  assert.equal(await verifyPassword('test-password-value', hash), true);
  assert.equal(await verifyPassword('wrong-password', hash), false);
  assert.match(hash, /^scrypt\$/);
});

test('readAdminBootstrapEnv missing both', () => {
  const r = readAdminBootstrapEnv({});
  assert.equal(r.ready, false);
  assert.equal(r.incomplete, false);
  assert.equal(r.loginId, null);
  assert.equal(r.password, null);
});

test('readAdminBootstrapEnv incomplete when only id', () => {
  const r = readAdminBootstrapEnv({ JJOIN_ADMIN_LOGIN_ID: 'admin@example.com' });
  assert.equal(r.ready, false);
  assert.equal(r.incomplete, true);
});

test('readAdminBootstrapEnv ready when both set', () => {
  const r = readAdminBootstrapEnv({
    JJOIN_ADMIN_LOGIN_ID: 'admin@example.com',
    JJOIN_ADMIN_LOGIN_PASSWORD: 'secret',
  });
  assert.equal(r.ready, true);
  assert.equal(r.incomplete, false);
  assert.equal(r.loginId, 'admin@example.com');
});
