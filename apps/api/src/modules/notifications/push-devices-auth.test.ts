import assert from 'node:assert/strict';
import test from 'node:test';
import { ForbiddenException } from '@nestjs/common';

/** Mirrors PushDevicesService token ownership guard. */
function assertPushTokenOwnership(existingUserId: string | null, userId: string): void {
  if (existingUserId && existingUserId !== userId) {
    throw new ForbiddenException('push_token_conflict');
  }
}

test('push token registration allows new token', () => {
  assertPushTokenOwnership(null, 'user-a');
});

test('push token registration allows same owner refresh', () => {
  assertPushTokenOwnership('user-a', 'user-a');
});

test('push token registration rejects cross-user hijack', () => {
  assert.throws(
    () => assertPushTokenOwnership('user-a', 'user-b'),
    (e: ForbiddenException) => e.message === 'push_token_conflict',
  );
});
