/**
 * Join form numeric input helpers (display comma vs API digit string).
 * Domain package keeps matching SSOT for unit tests; mobile uses this path so Metro
 * always resolves working runtime exports (formatNumber is long-stable on @jjoin/domain).
 */
import { formatNumber } from '@jjoin/domain';

const MAX_SAFE = Number.MAX_SAFE_INTEGER;

/** Digits only. Empty → null. "10,000" / "0001000" → "1000". */
export function parseNumericInput(raw: string): string | null {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 0) return null;
  const parsed = Number.parseInt(digits, 10);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return String(Math.min(parsed, MAX_SAFE));
}

/** Display: 10000 → "10,000". Empty → "". */
export function formatNumberWithThousandsSeparator(
  value: string | number | null | undefined,
): string {
  if (value === null || value === undefined || value === '') return '';
  const parsed = typeof value === 'number' ? value : parseNumericInput(String(value));
  if (parsed === null) return '';
  const formatted = formatNumber(parsed);
  return formatted === '—' ? '' : formatted;
}

/** Submit/API normalize: empty → "0". */
export function normalizeRewardPerParticipantInput(raw: string): string {
  return parseNumericInput(raw) ?? '0';
}
