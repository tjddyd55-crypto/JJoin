import { COIN_KRW_RATE, coinToKrw } from './coin-krw';

/** Variable coin top-up: minimum and step (10 Coin = 1,000원 at COIN_KRW_RATE). */
export const COIN_PURCHASE_MIN_AMOUNT = 10;
export const COIN_PURCHASE_STEP = 10;
export const COIN_CUSTOM_PRODUCT_CODE = 'COIN_CUSTOM';

export type VariableCoinPurchaseValidationResult =
  | { ok: true; coinAmount: number; priceKrw: number; coinKrwRate: number }
  | { ok: false; code: string; message: string };

export function isCoinPurchaseStepValid(coinAmount: number): boolean {
  return (
    Number.isInteger(coinAmount) &&
    coinAmount >= COIN_PURCHASE_MIN_AMOUNT &&
    coinAmount % COIN_PURCHASE_STEP === 0
  );
}

export function validateVariableCoinPurchaseAmount(
  raw: unknown,
): VariableCoinPurchaseValidationResult {
  if (typeof raw !== 'number' || !Number.isFinite(raw) || !Number.isInteger(raw)) {
    return {
      ok: false,
      code: 'COIN_AMOUNT_INVALID',
      message: '10 Coin 단위로 입력해 주세요.',
    };
  }
  if (raw <= 0) {
    return {
      ok: false,
      code: 'COIN_AMOUNT_INVALID',
      message: '10 Coin 단위로 입력해 주세요.',
    };
  }
  if (raw < COIN_PURCHASE_MIN_AMOUNT) {
    return {
      ok: false,
      code: 'COIN_AMOUNT_TOO_LOW',
      message: `최소 ${COIN_PURCHASE_MIN_AMOUNT} Coin부터 충전할 수 있습니다.`,
    };
  }
  if (raw % COIN_PURCHASE_STEP !== 0) {
    return {
      ok: false,
      code: 'COIN_AMOUNT_STEP',
      message: '10 Coin 단위로 입력해 주세요.',
    };
  }
  const priceKrw = coinToKrw(raw);
  return { ok: true, coinAmount: raw, priceKrw, coinKrwRate: COIN_KRW_RATE };
}

/** Parse user coin input string — digits only, no silent rounding. */
export function parseCoinPurchaseInput(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (!/^\d+$/.test(trimmed)) return null;
  const normalized = trimmed.replace(/^0+(?=\d)/, '');
  const value = Number(normalized);
  if (!Number.isSafeInteger(value)) return null;
  return value;
}
