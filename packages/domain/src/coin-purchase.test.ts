import assert from 'node:assert/strict';
import test from 'node:test';
import {
  COIN_PURCHASE_MIN_AMOUNT,
  COIN_PURCHASE_STEP,
  isCoinPurchaseStepValid,
  parseCoinPurchaseInput,
  validateVariableCoinPurchaseAmount,
} from './coin-purchase';

test('variable coin purchase step validation', () => {
  assert.equal(isCoinPurchaseStepValid(10), true);
  assert.equal(isCoinPurchaseStepValid(370), true);
  assert.equal(isCoinPurchaseStepValid(1000), true);
  assert.equal(isCoinPurchaseStepValid(1), false);
  assert.equal(isCoinPurchaseStepValid(11), false);
  assert.equal(isCoinPurchaseStepValid(105), false);
  assert.equal(isCoinPurchaseStepValid(0), false);
});

test('validateVariableCoinPurchaseAmount matrix', () => {
  const pass = [10, 20, 100, 370, 500, 1000];
  for (const coin of pass) {
    const r = validateVariableCoinPurchaseAmount(coin);
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.priceKrw, coin * 100);
      assert.equal(r.coinKrwRate, 100);
    }
  }

  const fail = [1, 11, 105, 0, -10];
  for (const coin of fail) {
    assert.equal(validateVariableCoinPurchaseAmount(coin).ok, false);
  }
  assert.equal(validateVariableCoinPurchaseAmount(12.5).ok, false);
});

test('parseCoinPurchaseInput keeps user digits without silent rounding', () => {
  assert.equal(parseCoinPurchaseInput('123'), 123);
  assert.equal(parseCoinPurchaseInput('0100'), 100);
  assert.equal(parseCoinPurchaseInput(''), null);
  assert.equal(parseCoinPurchaseInput('12.5'), null);
  assert.equal(parseCoinPurchaseInput('abc'), null);
});

test('constants', () => {
  assert.equal(COIN_PURCHASE_MIN_AMOUNT, 10);
  assert.equal(COIN_PURCHASE_STEP, 10);
});
