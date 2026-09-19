import assert from 'node:assert/strict';
import test from 'node:test';
import type { DirectMessageDto } from '@jjoin/types';
import {
  giftAttemptFingerprint,
  mergeDirectMessages,
  resolveDirectMessageIdempotencyKey,
  resolveRetryIdempotencyKey,
} from './direct-message-thread';

function msg(id: string, createdAt: string): DirectMessageDto {
  return {
    id,
    conversationId: 'c1',
    senderUserId: 'u1',
    body: id,
    createdAt,
    readAt: null,
    mine: true,
  };
}

test('merge keeps locally appended send when poll returns a stale page', () => {
  const sent = msg('new', '2026-09-19T15:00:02.000Z');
  const stalePage = [msg('old', '2026-09-19T15:00:00.000Z')];
  const merged = mergeDirectMessages([sent], stalePage);
  assert.equal(merged.map((row) => row.id).join(','), 'old,new');
});

test('retry of the same body reuses the idempotency key', () => {
  const first = resolveDirectMessageIdempotencyKey({
    body: '안녕',
    previousBody: null,
    previousKey: null,
    mint: () => 'key-1',
  });
  const retry = resolveDirectMessageIdempotencyKey({
    body: '안녕',
    previousBody: first.body,
    previousKey: first.key,
    mint: () => 'key-2',
  });
  assert.equal(retry.key, 'key-1');
  const changed = resolveDirectMessageIdempotencyKey({
    body: '다른 말',
    previousBody: retry.body,
    previousKey: retry.key,
    mint: () => 'key-3',
  });
  assert.equal(changed.key, 'key-3');
});

test('gift retry of the same recipient/amount/message reuses the key', () => {
  const fingerprint = giftAttemptFingerprint({
    toUserId: 'u2',
    amount: '500',
    message: '고마워',
  });
  const first = resolveRetryIdempotencyKey({
    fingerprint,
    previousFingerprint: null,
    previousKey: null,
    mint: () => 'gift-1',
  });
  const retry = resolveRetryIdempotencyKey({
    fingerprint,
    previousFingerprint: first.fingerprint,
    previousKey: first.key,
    mint: () => 'gift-2',
  });
  assert.equal(retry.key, 'gift-1');
});
