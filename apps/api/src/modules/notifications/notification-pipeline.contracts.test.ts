import assert from 'node:assert/strict';
import test from 'node:test';
import {
  JOIN_CREATED_RATE_LIMIT,
  NOTIFICATION_OUTBOX_MAX_ATTEMPTS,
  buildAndroidCollapseKey,
  buildNotificationContent,
  buildNotificationEventKey,
  isRecommendationNotificationType,
  resolveDefaultFieldNotificationRegions,
  resolveNotificationRoute,
  shouldRateLimitJoinCreated,
} from '@jjoin/domain';

test('pipeline never uses FCM from feature handlers', () => {
  assert.equal(typeof buildNotificationEventKey, 'function');
  assert.equal(typeof buildNotificationContent, 'function');
  assert.equal(NOTIFICATION_OUTBOX_MAX_ATTEMPTS, 5);
});

test('JOIN_CREATED is the only rate-limited recommendation type', () => {
  assert.equal(isRecommendationNotificationType('JOIN_CREATED'), true);
  assert.equal(shouldRateLimitJoinCreated(JOIN_CREATED_RATE_LIMIT.maxPerRecipient), true);
  assert.equal(isRecommendationNotificationType('DIRECT_MESSAGE_RECEIVED'), false);
});

test('idempotency keys stay unique per recipient + entity', () => {
  const a = buildNotificationEventKey({
    type: 'JOIN_APPLICATION_RECEIVED',
    recipientUserId: 'host',
    targetEntityId: 'join-1',
  });
  const b = buildNotificationEventKey({
    type: 'JOIN_APPLICATION_RECEIVED',
    recipientUserId: 'other',
    targetEntityId: 'join-1',
  });
  assert.notEqual(a, b);
});

test('message grouping collapse key is conversation-scoped', () => {
  assert.equal(buildAndroidCollapseKey('DIRECT_MESSAGE_RECEIVED', 'c1'), 'dm:c1');
});

test('FIELD AUTO default is metro mapping', () => {
  assert.deepEqual(resolveDefaultFieldNotificationRegions('서울 송파구'), [
    { province: '서울특별시', cityCounty: null },
  ]);
});

test('deleted join tap without joinId stays in inbox', () => {
  assert.deepEqual(resolveNotificationRoute({ type: 'JOIN_UPDATED', data: {} }), {
    kind: 'notifications',
  });
});
