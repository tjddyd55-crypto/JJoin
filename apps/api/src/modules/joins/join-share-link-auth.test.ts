import assert from 'node:assert/strict';
import test from 'node:test';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

/** Mirrors JoinsService.assertJoinHost ownership rule for regression tests. */
function assertJoinHost(
  join: { hostUserId: string } | null,
  userId: string,
): void {
  if (!join) throw new NotFoundException('join_not_found');
  if (join.hostUserId !== userId) throw new ForbiddenException('not_join_host');
}

test('assertJoinHost allows host', () => {
  assertJoinHost({ hostUserId: 'user-a' }, 'user-a');
});

test('assertJoinHost rejects non-host', () => {
  assert.throws(
    () => assertJoinHost({ hostUserId: 'user-a' }, 'user-b'),
    (e: ForbiddenException) => e.message === 'not_join_host',
  );
});

test('assertJoinHost rejects missing join', () => {
  assert.throws(
    () => assertJoinHost(null, 'user-a'),
    (e: NotFoundException) => e.message === 'join_not_found',
  );
});
