import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mockUserStore } from '../mock/mock-user.store';
import { resolveAuthenticatedUserId } from './resolve-session-user';
import { issueSessionToken, SESSION_TTL_MS } from './session-token';

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

test('cached signed token is still rejected after expiry', () => {
  withJwtSecret(SECRET, () => {
    const issuedAt = 1_700_000_000_000;
    const token = issueSessionToken('user-cached', issuedAt);
    mockUserStore.bindToken(token, 'user-cached');
    assert.equal(resolveAuthenticatedUserId(token, issuedAt + 1_000), 'user-cached');
    assert.equal(resolveAuthenticatedUserId(token, issuedAt + SESSION_TTL_MS), null);
    assert.equal(mockUserStore.getUserIdByToken(token), null);
  });
});

test('in-memory mock tokens are still accepted without a signed payload', () => {
  mockUserStore.bindToken('mock_in_memory_token', 'user-mock');
  try {
    assert.equal(resolveAuthenticatedUserId('mock_in_memory_token'), 'user-mock');
  } finally {
    mockUserStore.logout('mock_in_memory_token');
  }
});
