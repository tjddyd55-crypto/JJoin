import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveNotificationRoute } from './push-routing';

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
