import assert from 'node:assert/strict';
import test from 'node:test';
import { COIN_KRW_RATE, coinToKrw, krwToCoin } from './coin-krw';
import { assertCoinProductPricing, expectedCoinProductPriceKrw } from './coin-product';

test('COIN_KRW_RATE is 100 (10 Coin = 1,000원)', () => {
  assert.equal(COIN_KRW_RATE, 100);
  assert.equal(coinToKrw(10), 1000);
  assert.equal(krwToCoin(1000), 10);
});

test('coin product pricing invariant', () => {
  assertCoinProductPricing({ coinAmount: 50, priceKrw: 5000 });
  assert.throws(() => assertCoinProductPricing({ coinAmount: 50, priceKrw: 4000 }));
  assert.equal(expectedCoinProductPriceKrw(100), 10000);
});
