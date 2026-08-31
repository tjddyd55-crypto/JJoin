/**
 * Contract tests for join-loop request/response shapes and domain gates
 * used by chat / invite / urgent (no Nest DI / Prisma).
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CHAT_MESSAGE_MAX_LENGTH,
  canAccessJoinChat,
  isJoinChatVisibleInUi,
  normalizeChatMessageBody,
  resolveChatRoomLifecycleStatus,
  shouldClearUrgent,
} from '@jjoin/domain';
import type { PostJoinChatMessageRequest } from '@jjoin/types';

test('PostJoinChatMessageRequest only carries body (no client senderUserId)', () => {
  const req: PostJoinChatMessageRequest = { body: 'hello' };
  assert.deepEqual(Object.keys(req).sort(), ['body']);
  assert.equal(typeof req.body, 'string');
  // Runtime: even if a client sends extra fields, server must ignore them and use auth userId.
  const dirty = { body: 'hello', senderUserId: 'attacker-id' } as PostJoinChatMessageRequest & {
    senderUserId?: string;
  };
  assert.equal(dirty.body, 'hello');
  assert.equal(dirty.senderUserId, 'attacker-id');
});

test('leave / decline revoke chat access via canAccessJoinChat', () => {
  assert.equal(
    canAccessJoinChat({
      role: 'PARTICIPANT',
      participationStatus: 'APPROVED',
      attendanceIntent: 'DECLINED',
    }),
    false,
  );
  assert.equal(
    canAccessJoinChat({
      role: 'PARTICIPANT',
      participationStatus: 'CANCELLED',
      attendanceIntent: 'CONFIRMED',
    }),
    false,
  );
});

test('empty / max / plain HTML message gates', () => {
  assert.throws(() => normalizeChatMessageBody(''), /chat_message_empty/);
  assert.throws(
    () => normalizeChatMessageBody('a'.repeat(CHAT_MESSAGE_MAX_LENGTH + 1)),
    /chat_message_too_long/,
  );
  assert.equal(normalizeChatMessageBody('<b>ok</b>'), '<b>ok</b>');
});

test('urgent clears when roster fills', () => {
  assert.equal(
    shouldClearUrgent({
      isUrgent: true,
      status: 'OPEN',
      planned: 4,
      confirmed: 4,
      startAt: new Date('2099-01-01T00:00:00.000Z'),
      now: new Date('2026-08-31T00:00:00.000Z'),
    }),
    true,
  );
});

test('lifecycle: active → read-only → closed', () => {
  const end = new Date('2026-08-31T10:00:00.000Z');
  assert.equal(resolveChatRoomLifecycleStatus('OPEN', new Date('2026-08-31T09:00:00Z'), end), 'ACTIVE');
  assert.equal(
    resolveChatRoomLifecycleStatus('COMPLETED', new Date('2026-08-31T10:01:00Z'), end),
    'READ_ONLY',
  );
  assert.equal(
    resolveChatRoomLifecycleStatus('COMPLETED', new Date('2026-09-03T10:00:00Z'), end),
    'CLOSED',
  );
});

test('isJoinChatVisibleInUi grace gate', () => {
  assert.equal(
    isJoinChatVisibleInUi({
      hasRoom: true,
      roomStatus: 'READ_ONLY',
      hideAfter: new Date('2020-01-01T00:00:00.000Z'),
    }),
    false,
  );
  assert.equal(
    isJoinChatVisibleInUi({
      hasRoom: true,
      roomStatus: 'CLOSED',
      hideAfter: null,
    }),
    false,
  );
});
