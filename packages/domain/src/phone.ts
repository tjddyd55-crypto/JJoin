/**
 * Korean phone display / digit normalize helpers.
 * UI shows hyphens; API/DB keep existing string contract (digits or formatted).
 */

/** Digits only, max 11 (mobile) — landline may be shorter. */
export function normalizePhoneDigits(input: string, maxDigits = 11): string {
  return String(input ?? '')
    .replace(/\D/g, '')
    .slice(0, maxDigits);
}

/**
 * Format for display while typing.
 * - 010xxxxxxxx → 010-xxxx-xxxx
 * - 01xxxxxxxx → 01x-xxx-xxxx / 01x-xxxx-xxxx
 * - 02xxxxxxxx → 02-xxx-xxxx / 02-xxxx-xxxx
 * - other area codes (3-digit) → 0xx-xxx-xxxx
 */
export function formatKoreanPhoneInput(input: string): string {
  const digits = normalizePhoneDigits(input);
  if (!digits) return '';

  if (digits.startsWith('02')) {
    if (digits.length <= 2) return digits;
    if (digits.length <= 5) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
    if (digits.length <= 9) {
      return `${digits.slice(0, 2)}-${digits.slice(2, 5)}-${digits.slice(5)}`;
    }
    return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6, 10)}`;
  }

  if (digits.startsWith('010') || digits.startsWith('011') || digits.startsWith('016') || digits.startsWith('017') || digits.startsWith('018') || digits.startsWith('019')) {
    if (digits.length <= 3) return digits;
    // Progressive: 010-xxxx while typing mid-block; complete 10-digit mobiles use 3-3-4.
    if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    if (digits.length === 10) {
      return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
    }
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7, 11)}`;
  }

  // 031, 032, … or generic
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  if (digits.length <= 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7, 11)}`;
}

/** Display helper for stored values (digits or already formatted). */
export function formatKoreanPhoneDisplay(input: string | null | undefined): string {
  if (input == null || !String(input).trim()) return '';
  return formatKoreanPhoneInput(String(input));
}
