/**
 * JJOINZONE Coin ↔ KRW conversion SSOT.
 * 10 Coin = 1,000원 → 1 Coin = 100원.
 * Do not duplicate this rate in UI/API/Admin — import from here.
 */

export const COIN_KRW_RATE = 100;

export function coinToKrw(coinAmount: number): number {
  if (!Number.isFinite(coinAmount) || !Number.isInteger(coinAmount) || coinAmount < 0) {
    throw new Error('invalid_coin_amount');
  }
  return coinAmount * COIN_KRW_RATE;
}

export function krwToCoin(krwAmount: number): number {
  if (!Number.isFinite(krwAmount) || !Number.isInteger(krwAmount) || krwAmount < 0) {
    throw new Error('invalid_krw_amount');
  }
  if (krwAmount % COIN_KRW_RATE !== 0) {
    throw new Error('krw_not_divisible_by_coin_rate');
  }
  return krwAmount / COIN_KRW_RATE;
}

export function formatKrwEquivalent(coinAmount: number): string {
  return `약 ${coinToKrw(coinAmount).toLocaleString('ko-KR')}원`;
}
