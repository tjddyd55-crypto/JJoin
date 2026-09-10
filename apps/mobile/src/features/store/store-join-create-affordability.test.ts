import assert from 'node:assert/strict';
import { test } from 'node:test';
import { canSubmitStoreMatchingJoinCreate } from './store-join-create-affordability';

test('reward 0 + available 0 is creatable', () => {
  assert.equal(
    canSubmitStoreMatchingJoinCreate({ walletAvailable: '0', totalRequiredCoin: '0' }),
    true,
  );
});

test('missing wallet + required 0 is creatable', () => {
  assert.equal(
    canSubmitStoreMatchingJoinCreate({ walletAvailable: null, totalRequiredCoin: '0' }),
    true,
  );
});

test('available 0 + HOLD required is not creatable', () => {
  assert.equal(
    canSubmitStoreMatchingJoinCreate({ walletAvailable: '0', totalRequiredCoin: '10000' }),
    false,
  );
});

test('enough available covers HOLD', () => {
  assert.equal(
    canSubmitStoreMatchingJoinCreate({ walletAvailable: '10000', totalRequiredCoin: '10000' }),
    true,
  );
});
