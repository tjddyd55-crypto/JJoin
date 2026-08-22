/**
 * Coin amount helpers — fixed scale-4 decimal via bigint.
 * Never use binary float for accounting math.
 */

const SCALE = 4n;
const SCALE_FACTOR = 10n ** SCALE;

export class CoinAmountError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CoinAmountError';
  }
}

/** Parse a non-negative coin amount string into scale-4 bigint units. */
export function parseCoinUnits(raw: string): bigint {
  const s = raw.trim();
  if (!/^\d+(\.\d{1,4})?$/.test(s)) {
    throw new CoinAmountError(`invalid_coin_amount:${raw}`);
  }
  const [wholePart, fracPart = ''] = s.split('.');
  const whole = BigInt(wholePart);
  const frac = BigInt(fracPart.padEnd(Number(SCALE), '0'));
  return whole * SCALE_FACTOR + frac;
}

export function formatCoinUnits(units: bigint): string {
  if (units < 0n) {
    throw new CoinAmountError('negative_coin_amount');
  }
  const whole = units / SCALE_FACTOR;
  const frac = units % SCALE_FACTOR;
  if (frac === 0n) return whole.toString();
  return `${whole}.${frac.toString().padStart(Number(SCALE), '0').replace(/0+$/, '')}`;
}

export function addCoinAmounts(a: string, b: string): string {
  return formatCoinUnits(parseCoinUnits(a) + parseCoinUnits(b));
}

export function subCoinAmounts(a: string, b: string): string {
  const result = parseCoinUnits(a) - parseCoinUnits(b);
  if (result < 0n) {
    throw new CoinAmountError('coin_underflow');
  }
  return formatCoinUnits(result);
}

export function mulCoinAmountByInt(amount: string, factor: number): string {
  if (!Number.isInteger(factor) || factor < 0) {
    throw new CoinAmountError('invalid_coin_factor');
  }
  return formatCoinUnits(parseCoinUnits(amount) * BigInt(factor));
}

export function compareCoinAmounts(a: string, b: string): number {
  const left = parseCoinUnits(a);
  const right = parseCoinUnits(b);
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

export function isCoinAmountPositive(amount: string): boolean {
  return parseCoinUnits(amount) > 0n;
}

export function zeroCoinAmount(): string {
  return '0';
}
