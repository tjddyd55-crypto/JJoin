import type { PresenceDurationOption } from '@jjoin/types';

const DEFAULT_TZ = 'Asia/Seoul';

/**
 * Maps duration preset → absolute availableUntil (server clock).
 * Client must not send arbitrary availableUntil.
 * `today` = end of calendar day in user timezone (POLICY_TBD for exact product copy).
 */
export function resolveAvailableUntil(
  duration: PresenceDurationOption,
  now: Date = new Date(),
  timeZone: string = process.env.DEFAULT_TIMEZONE ?? DEFAULT_TZ,
): Date {
  if (duration === '1h') {
    return new Date(now.getTime() + 60 * 60_000);
  }
  if (duration === '2h') {
    return new Date(now.getTime() + 120 * 60_000);
  }
  if (duration === 'today') {
    return endOfCalendarDay(now, timeZone);
  }
  throw new Error('invalid_duration');
}

/** Next local midnight in `timeZone` (exclusive end of "today"). */
export function endOfCalendarDay(now: Date, timeZone: string): Date {
  const dtf = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = Object.fromEntries(
    dtf.formatToParts(now).filter((p) => p.type !== 'literal').map((p) => [p.type, p.value]),
  ) as { year: string; month: string; day: string };

  // Asia/Seoul is UTC+9 year-round; use fixed offset for MVP. Helper keeps TZ param for extension.
  if (timeZone === 'Asia/Seoul' || timeZone === 'Asia/Tokyo') {
    const startLocal = new Date(`${parts.year}-${parts.month}-${parts.day}T00:00:00+09:00`);
    return new Date(startLocal.getTime() + 24 * 60 * 60_000);
  }

  // Generic fallback: sliding 24h (POLICY_TBD for other zones without offset table)
  return new Date(now.getTime() + 24 * 60 * 60_000);
}

/** Privacy epoch material — stable within a presence session, rotates on new session. */
export function presencePrivacyEpoch(row: {
  userId: string;
  availableUntil: Date | null;
  lastLocationAt: Date;
}): string {
  const until = row.availableUntil?.toISOString() ?? 'none';
  const started = row.lastLocationAt.toISOString();
  return `${row.userId}:${until}:${started}`;
}
