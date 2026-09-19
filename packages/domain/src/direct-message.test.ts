import assert from 'node:assert/strict';
import test from 'node:test';
import {
  countUnreadDirectMessages,
  normalizeDirectMessageBody,
  normalizeDirectMessageIdempotencyKey,
  orderDirectConversationPair,
  peerUserIdFromPair,
  previewDirectMessage,
} from './direct-message';

test('pair order is unique regardless of caller direction', () => {
  const ab = orderDirectConversationPair('aaa', 'zzz');
  const ba = orderDirectConversationPair('zzz', 'aaa');
  assert.deepEqual(ab, ba);
  assert.equal(ab.userLowId, 'aaa');
  assert.equal(ab.userHighId, 'zzz');
  assert.equal(peerUserIdFromPair(ab, 'aaa'), 'zzz');
  assert.throws(() => orderDirectConversationPair('u1', 'u1'));
});

test('message body reuses join-chat normalization and unread is peer-only', () => {
  assert.equal(normalizeDirectMessageBody('  안녕  '), '안녕');
  assert.throws(() => normalizeDirectMessageBody('   '));
  assert.equal(previewDirectMessage('짧음'), '짧음');
  const unread = countUnreadDirectMessages({
    viewerUserId: 'u2',
    lastReadAt: '2026-01-01T00:00:00.000Z',
    messages: [
      { senderUserId: 'u1', createdAt: '2026-01-01T01:00:00.000Z' },
      { senderUserId: 'u2', createdAt: '2026-01-01T02:00:00.000Z' },
      { senderUserId: 'u1', createdAt: '2025-12-31T00:00:00.000Z' },
    ],
  });
  assert.equal(unread, 1);
  assert.equal(normalizeDirectMessageIdempotencyKey('k1', 'u1'), 'direct-message:u1:k1');
});
