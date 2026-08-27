/**
 * Display-only number formatting for UI (ko-KR grouping).
 * Do not use formatted strings in arithmetic — format after calculation.
 */

const NUMBER_FORMAT = new Intl.NumberFormat('ko-KR');

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

/** Quantity/amount display: 5000 → "5,000". Non-numeric values pass through. */
export function formatNumber(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—';
  const n = toFiniteNumber(value);
  if (n === null) return String(value);
  return NUMBER_FORMAT.format(n);
}

/** Coin display without sign: 5000 → "5,000C" */
export function formatCoin(value: string | number | null | undefined): string {
  const n = toFiniteNumber(value);
  if (n === null) {
    if (value === null || value === undefined || value === '') return '—';
    return String(value);
  }
  return `${NUMBER_FORMAT.format(n)}C`;
}

/** Signed coin: 5000 → "+5,000C", -5000 → "-5,000C", 0 → "0C" */
export function formatSignedCoin(value: string | number | null | undefined): string {
  const n = toFiniteNumber(value);
  if (n === null) {
    if (value === null || value === undefined || value === '') return '—';
    return String(value);
  }
  if (n > 0) return `+${NUMBER_FORMAT.format(n)}C`;
  if (n < 0) return `-${NUMBER_FORMAT.format(Math.abs(n))}C`;
  return `${NUMBER_FORMAT.format(0)}C`;
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
  return `${NUMBER_FORMAT.format(n)} ${label}`;
}
