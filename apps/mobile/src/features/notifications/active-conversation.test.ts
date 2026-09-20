import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getActiveConversationForPush,
  setActiveConversationForPush,
  shouldSuppressOsPushForActiveChat,
} from './active-conversation';

test('active chat suppresses only matching DM push', () => {
  setActiveConversationForPush('conv-1');
  assert.equal(getActiveConversationForPush(), 'conv-1');
  assert.equal(
    shouldSuppressOsPushForActiveChat({
      type: 'DIRECT_MESSAGE_RECEIVED',
      conversationId: 'conv-1',
    }),
    true,
  );
  assert.equal(
    shouldSuppressOsPushForActiveChat({
      type: 'DIRECT_MESSAGE_RECEIVED',
      conversationId: 'conv-2',
    }),
    false,
  );
  assert.equal(
    shouldSuppressOsPushForActiveChat({ type: 'JOIN_CREATED', joinId: 'j1' }),
    false,
  );
  setActiveConversationForPush(null);
});
