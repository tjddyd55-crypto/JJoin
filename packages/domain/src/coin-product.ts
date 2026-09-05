import { COIN_KRW_RATE, coinToKrw } from './coin-krw';

export type CoinProductInput = {
  coinAmount: number;
  priceKrw: number;
};

/**
 * Coin catalog invariant: priceKrw must equal coinAmount * COIN_KRW_RATE.
 */
export function assertCoinProductPricing(input: CoinProductInput): void {
  const { coinAmount, priceKrw } = input;
  if (!Number.isFinite(coinAmount) || !Number.isInteger(coinAmount) || coinAmount <= 0) {
    throw new Error('invalid_coin_product_amount');
  }
  if (!Number.isFinite(priceKrw) || !Number.isInteger(priceKrw) || priceKrw <= 0) {
    throw new Error('invalid_coin_product_price');
  }
  const expected = coinToKrw(coinAmount);
  if (priceKrw !== expected) {
    throw new Error('coin_product_price_mismatch');
  }
}

export function expectedCoinProductPriceKrw(coinAmount: number): number {
  return coinAmount * COIN_KRW_RATE;
}

export { COIN_KRW_RATE };
