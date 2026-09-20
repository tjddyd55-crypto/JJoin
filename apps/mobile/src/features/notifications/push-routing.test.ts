import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveNotificationRoute } from './push-routing';

test('attendance and achievement rewards route to activity rewards', () => {
  assert.deepEqual(
    resolveNotificationRoute({ type: 'ATTENDANCE_REWARD', data: {} }),
    { kind: 'rewards' },
  );
  assert.deepEqual(
    resolveNotificationRoute({ type: 'ACHIEVEMENT_REWARD', data: {} }),
    { kind: 'rewards' },
  );
});

test('reward paid routes to wallet', () => {
  assert.deepEqual(
    resolveNotificationRoute({
      type: 'REWARD_PAID',
      data: { joinId: '11111111-1111-4111-8111-111111111111' },
    }),
    { kind: 'wallet' },
  );
});

test('club notice routes to club notices', () => {
  assert.deepEqual(
    resolveNotificationRoute({
      type: 'CLUB_NOTICE',
      data: {
        clubId: '22222222-2222-4222-8222-222222222222',
        noticeId: '33333333-3333-4333-8333-333333333333',
      },
    }),
    {
      kind: 'club-notice',
      clubId: '22222222-2222-4222-8222-222222222222',
      noticeId: '33333333-3333-4333-8333-333333333333',
    },
  );
});

test('friend request routes to user profile when userId present', () => {
  assert.deepEqual(
    resolveNotificationRoute({
      type: 'FRIEND_REQUEST_RECEIVED',
      data: { userId: '44444444-4444-4444-8444-444444444444' },
    }),
    { kind: 'user', userId: '44444444-4444-4444-8444-444444444444' },
  );
});

test('club routes stay mapped so the UI gate can send them to unavailable', () => {
  assert.deepEqual(
    resolveNotificationRoute({
      type: 'CLUB_JOIN_APPROVED',
      data: { clubId: '22222222-2222-4222-8222-222222222222' },
    }),
    { kind: 'club', clubId: '22222222-2222-4222-8222-222222222222' },
  );
});

test('direct message routes to conversation thread', () => {
  assert.deepEqual(
    resolveNotificationRoute({
      type: 'DIRECT_MESSAGE_RECEIVED',
      data: { conversationId: '55555555-5555-4555-8555-555555555555' },
    }),
    { kind: 'conversation', conversationId: '55555555-5555-4555-8555-555555555555' },
  );
});

test('friend accepted falls back to golf friends list', () => {
  assert.deepEqual(
    resolveNotificationRoute({
      type: 'FRIEND_REQUEST_ACCEPTED',
      data: {},
    }),
    { kind: 'golf-friends' },
  );
});

test('JOIN_CREATED routes to join detail', () => {
  assert.deepEqual(
    resolveNotificationRoute({
      type: 'JOIN_CREATED',
      data: { joinId: '11111111-1111-4111-8111-111111111111' },
    }),
    { kind: 'join', joinId: '11111111-1111-4111-8111-111111111111' },
  );
});

test('deleted target without ids falls back to inbox', () => {
  assert.deepEqual(
    resolveNotificationRoute({ type: 'JOIN_CREATED', data: {} }),
    { kind: 'notifications' },
  );
});
