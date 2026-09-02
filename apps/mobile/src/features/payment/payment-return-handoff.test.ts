import assert from 'node:assert/strict';
import test from 'node:test';
import {
  consumeCoinChargePaymentHandoff,
  setCoinChargePaymentHandoff,
} from './payment-return-handoff';

test('coin charge handoff is single-consume', () => {
  setCoinChargePaymentHandoff({ credited: '10000', balance: '10200' });
  const first = consumeCoinChargePaymentHandoff();
  assert.deepEqual(first, { credited: '10000', balance: '10200' });
  assert.equal(consumeCoinChargePaymentHandoff(), null);
});
