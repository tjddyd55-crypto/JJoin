import assert from 'node:assert/strict';
import { createHmac } from 'crypto';
import { test } from 'node:test';
import { issueSessionToken, SESSION_TTL_MS, verifySessionToken } from './session-token';

const SECRET = 'unit-test-session-secret';

function withJwtSecret(value: string | undefined, fn: () => void): void {
  const prev = process.env.JWT_SECRET;
  if (value === undefined) delete process.env.JWT_SECRET;
  else process.env.JWT_SECRET = value;
  try {
    fn();
  } finally {
    if (prev === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = prev;
  }
}

test('issueSessionToken refuses to run without JWT_SECRET (no fallback)', () => {
  withJwtSecret(undefined, () => {
    assert.throws(() => issueSessionToken('user-1'), /JWT_SECRET_REQUIRED/);
    assert.equal(verifySessionToken('jjoin.payload.sig'), null);
  });
});

test('issueSessionToken never uses the removed dev-only-change-me fallback', () => {
  withJwtSecret(undefined, () => {
    assert.throws(() => issueSessionToken('user-1'), /JWT_SECRET_REQUIRED/);
  });
  withJwtSecret(SECRET, () => {
    const token = issueSessionToken('user-1');
    assert.equal(verifySessionToken(token), 'user-1');
    process.env.JWT_SECRET = 'dev-only-change-me';
    assert.equal(verifySessionToken(token), null);
  });
});

test('verifySessionToken accepts a live token and rejects an expired one', () => {
  withJwtSecret(SECRET, () => {
    const issuedAt = 1_700_000_000_000;
    const token = issueSessionToken('user-exp', issuedAt);
    assert.equal(verifySessionToken(token, issuedAt + 1_000), 'user-exp');
    assert.equal(verifySessionToken(token, issuedAt + SESSION_TTL_MS), null);
    assert.equal(verifySessionToken(token, issuedAt + SESSION_TTL_MS + 1), null);
  });
});

test('verifySessionToken rejects tokens that omit exp', () => {
  withJwtSecret(SECRET, () => {
    const payload = Buffer.from(
      JSON.stringify({ sub: 'user-no-exp', iat: Date.now() }),
      'utf8',
    ).toString('base64url');
    const sig = createHmac('sha256', SECRET).update(payload).digest('base64url');
    const token = `jjoin.${payload}.${sig}`;
    assert.equal(verifySessionToken(token), null);
  });
});
