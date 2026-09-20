import assert from 'node:assert/strict';
import test from 'node:test';
import {
  claimNotificationResponseOnce,
  resetConsumedNotificationResponsesForTest,
  takeInitialNotificationResponse,
} from './push-response-consume';

test('cold-start tap navigates once', () => {
  resetConsumedNotificationResponsesForTest();
  const initial = takeInitialNotificationResponse({
    identifier: 'resp-cold',
    data: { type: 'JOIN_CREATED', joinId: 'j1' },
  });
  assert.equal(initial?.identifier, 'resp-cold');
  assert.equal(claimNotificationResponseOnce('resp-cold'), false);
});

test('home-icon launch after consume/clear does not replay the old tap', () => {
  resetConsumedNotificationResponsesForTest();
  const consumed = takeInitialNotificationResponse({
    identifier: 'resp-old',
    data: { type: 'JOIN_UPDATED', joinId: 'j1' },
  });
  assert.ok(consumed);
  const afterClear = takeInitialNotificationResponse(null);
  assert.equal(afterClear, null);
});

test('live listener plus initial consume of the same response navigates once', () => {
  resetConsumedNotificationResponsesForTest();
  const navigations: string[] = [];
  const response = { identifier: 'resp-same', data: { type: 'JOIN_CREATED' } };
  const initial = takeInitialNotificationResponse(response);
  if (initial) navigations.push('initial');
  if (claimNotificationResponseOnce(response.identifier)) navigations.push('listener');
  assert.deepEqual(navigations, ['initial']);
});
