/**
 * Display-only number formatting for UI (thousands grouping with `,`).
 * Do not use formatted strings in arithmetic — format after calculation.
 *
 * Uses explicit digit grouping (not Intl) so Hermes/Android always show commas.
 */

function toFiniteNumber(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  const trimmed = String(value).trim().replace(/,/g, '');
  if (!trimmed || trimmed === '—' || trimmed === '-') return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

/** Truncate and insert `,` thousands separators. */
export function formatGroupedInteger(n: number): string {
  if (!Number.isFinite(n)) return '0';
  const truncated = Math.trunc(n);
  const sign = truncated < 0 ? '-' : '';
  const digits = String(Math.abs(truncated));
  return `${sign}${digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
}

/**
 * Coin balance/amount digits only: 80200 → "80,200".
 * null / undefined / '' / NaN → "0" (wallet-safe default).
 */
export function formatCoinAmount(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '0';
  const n = toFiniteNumber(value);
  if (n === null) return '0';
  return formatGroupedInteger(n);
}

/**
 * Signed ledger amount: "+80200" → "+80,200", "-1000" → "-1,000".
 * null / undefined / '' → "0".
 */
export function formatSignedCoinAmount(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '0';
  const n = toFiniteNumber(value);
  if (n === null) return '0';
  if (n > 0) return `+${formatGroupedInteger(n)}`;
  if (n < 0) return `-${formatGroupedInteger(Math.abs(n))}`;
  return '0';
}

/** Quantity/amount display: 5000 → "5,000". Non-numeric values pass through. */
export function formatNumber(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—';
  const n = toFiniteNumber(value);
  if (n === null) return String(value);
  return formatGroupedInteger(n);
}

/** Coin display without sign: 5000 → "5,000C" */
export function formatCoin(value: string | number | null | undefined): string {
  const n = toFiniteNumber(value);
  if (n === null) {
    if (value === null || value === undefined || value === '') return '—';
    return String(value);
  }
  return `${formatGroupedInteger(n)}C`;
}

/** Signed coin: 5000 → "+5,000C", -5000 → "-5,000C", 0 → "0C" */
export function formatSignedCoin(value: string | number | null | undefined): string {
  const n = toFiniteNumber(value);
  if (n === null) {
    if (value === null || value === undefined || value === '') return '—';
    return String(value);
  }
  if (n > 0) return `+${formatGroupedInteger(n)}C`;
  if (n < 0) return `-${formatGroupedInteger(Math.abs(n))}C`;
  return `${formatGroupedInteger(0)}C`;
}

/** Coin amount with space before unit label used in some screens: "5,000 Coin" */
export function formatCoinWithLabel(
  value: string | number | null | undefined,
  label = 'Coin',
): string {
  const n = toFiniteNumber(value);
  if (n === null) {
    if (value === null || value === undefined || value === '') return `— ${label}`;
    return `${String(value)} ${label}`;
  }
  return `${formatGroupedInteger(n)} ${label}`;
}
