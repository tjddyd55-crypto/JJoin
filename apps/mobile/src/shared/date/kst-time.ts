/** Default minute steps for selector UX (Join / Club Event). */
export const DEFAULT_MINUTE_STEPS = [0, 10, 20, 30, 40, 50] as const;

export const HOUR_OPTIONS: readonly number[] = Array.from({ length: 24 }, (_, i) => i);

export type NormalizeHourMinuteOk = {
  ok: true;
  hour: number;
  minute: number;
  /** Canonical API/storage form: HH:mm */
  hm: string;
};

export type NormalizeHourMinuteFail = {
  ok: false;
  reason: 'empty' | 'invalid_hour' | 'invalid_minute';
};

export type NormalizeHourMinuteResult = NormalizeHourMinuteOk | NormalizeHourMinuteFail;

function toInt(value: string | number | null | undefined): number | null {
  if (value === '' || value == null) return null;
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  const trimmed = value.trim();
  if (!trimmed || !/^\d{1,2}$/.test(trimmed)) return null;
  return Number(trimmed);
}

/**
 * Normalize hour + minute into canonical HH:mm.
 * Rejects hour > 23 / minute > 59 / non-integers / empty.
 */
export function normalizeHourMinute(
  hour: string | number | null | undefined,
  minute: string | number | null | undefined,
): NormalizeHourMinuteResult {
  if (hour === '' || hour == null || minute === '' || minute == null) {
    return { ok: false, reason: 'empty' };
  }
  const h = toInt(hour);
  const m = toInt(minute);
  if (h == null || !Number.isInteger(h) || h < 0 || h > 23) {
    return { ok: false, reason: 'invalid_hour' };
  }
  if (m == null || !Number.isInteger(m) || m < 0 || m > 59) {
    return { ok: false, reason: 'invalid_minute' };
  }
  return {
    ok: true,
    hour: h,
    minute: m,
    hm: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`,
  };
}

/** Parse HH:mm (or H:mm) into hour/minute parts. */
export function parseHm(value: string): { hour: number; minute: number } | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const result = normalizeHourMinute(Number(match[1]), Number(match[2]));
  return result.ok ? { hour: result.hour, minute: result.minute } : null;
}

/** UI label: 19시 30분 */
export function formatHmDisplay(hm: string): string {
  const parsed = parseHm(hm);
  if (!parsed) return '시간 선택';
  return `${String(parsed.hour).padStart(2, '0')}시 ${String(parsed.minute).padStart(2, '0')}분`;
}

export function formatHourLabel(hour: number): string {
  return `${String(hour).padStart(2, '0')}시`;
}

export function formatMinuteLabel(minute: number): string {
  return `${String(minute).padStart(2, '0')}분`;
}

/**
 * Minute options for selector. Includes current minute when it is not on the default step
 * (edit/prefill compatibility).
 */
export function minuteOptionsForValue(currentMinute: number | null | undefined): number[] {
  const options: number[] = [...DEFAULT_MINUTE_STEPS];
  if (
    currentMinute != null &&
    Number.isInteger(currentMinute) &&
    currentMinute >= 0 &&
    currentMinute <= 59 &&
    !options.includes(currentMinute)
  ) {
    options.push(currentMinute);
    options.sort((a, b) => a - b);
  }
  return options;
}
