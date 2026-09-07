/** Screen golf handicap bounds (numeric, vendor-neutral). */
export const SCREEN_HANDICAP_MIN = -10;
export const SCREEN_HANDICAP_MAX = 54;

export function clampScreenHandicap(
  value: number,
  min = SCREEN_HANDICAP_MIN,
  max = SCREEN_HANDICAP_MAX,
): number {
  return Math.min(max, Math.max(min, value));
}

export function formatScreenHandicap(value: number | null | undefined): string | null {
  if (value == null || Number.isNaN(value)) return null;
  return `스크린 핸디 ${value}`;
}

export function validateScreenHandicap(
  value: number | null | undefined,
): { ok: true; value: number | null } | { ok: false; code: string } {
  if (value == null) return { ok: true, value: null };
  if (!Number.isFinite(value) || !Number.isInteger(value)) {
    return { ok: false, code: 'invalid_screen_handicap' };
  }
  if (value < SCREEN_HANDICAP_MIN || value > SCREEN_HANDICAP_MAX) {
    return { ok: false, code: 'screen_handicap_out_of_range' };
  }
  return { ok: true, value };
}
