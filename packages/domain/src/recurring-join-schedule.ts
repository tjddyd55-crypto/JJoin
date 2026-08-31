/**
 * Weekly recurring store-matching join schedule — pure helpers.
 */

export const RECURRING_AHEAD_WEEKS = 3;
export const RECURRING_CADENCE_WEEKLY = 'WEEKLY' as const;

export type RecurringCadence = typeof RECURRING_CADENCE_WEEKLY;

/** ISO weekday: 1=Monday … 7=Sunday */
export type IsoWeekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export function parseLocalHm(hm: string): { hour: number; minute: number } {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hm.trim());
  if (!m) throw new Error('invalid_start_time');
  const hour = Number(m[1]);
  const minute = Number(m[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    throw new Error('invalid_start_time');
  }
  return { hour, minute };
}

/** KST calendar date YYYY-MM-DD for an instant. */
export function kstDateKey(instant: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(instant);
}

/** Instant for KST local date + HH:mm. */
export function kstLocalDateTime(dateKey: string, hm: string): Date {
  const { hour, minute } = parseLocalHm(hm);
  const hh = String(hour).padStart(2, '0');
  const mm = String(minute).padStart(2, '0');
  return new Date(`${dateKey}T${hh}:${mm}:00+09:00`);
}

export function isoWeekdayKst(instant: Date): IsoWeekday {
  const wd = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Seoul',
    weekday: 'short',
  }).format(instant);
  const map: Record<string, IsoWeekday> = {
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
    Sun: 7,
  };
  return map[wd] ?? 1;
}

function addDaysKst(dateKey: string, days: number): string {
  const base = new Date(`${dateKey}T12:00:00+09:00`);
  const next = new Date(base.getTime() + days * 24 * 60 * 60_000);
  return kstDateKey(next);
}

/**
 * Next occurrence start (strictly after `after`) for weekly schedule.
 */
export function nextWeeklyOccurrenceStart(input: {
  dayOfWeek: IsoWeekday;
  startTimeLocal: string;
  after: Date;
}): Date {
  const afterKey = kstDateKey(input.after);
  for (let i = 0; i < 14; i += 1) {
    const key = addDaysKst(afterKey, i);
    const start = kstLocalDateTime(key, input.startTimeLocal);
    if (start.getTime() <= input.after.getTime()) continue;
    if (isoWeekdayKst(start) !== input.dayOfWeek) continue;
    return start;
  }
  throw new Error('next_occurrence_not_found');
}

/** Upcoming occurrence starts within aheadWeeks (exclusive of past). */
export function listUpcomingWeeklyStarts(input: {
  dayOfWeek: IsoWeekday;
  startTimeLocal: string;
  from: Date;
  aheadWeeks?: number;
}): Date[] {
  const weeks = input.aheadWeeks ?? RECURRING_AHEAD_WEEKS;
  const horizon = new Date(input.from.getTime() + weeks * 7 * 24 * 60 * 60_000);
  const out: Date[] = [];
  let cursor = input.from;
  for (let guard = 0; guard < 20; guard += 1) {
    const next = nextWeeklyOccurrenceStart({
      dayOfWeek: input.dayOfWeek,
      startTimeLocal: input.startTimeLocal,
      after: cursor,
    });
    if (next.getTime() > horizon.getTime()) break;
    out.push(next);
    cursor = next;
  }
  return out;
}

export function occurrenceDateKeyFromStart(startAt: Date): string {
  return kstDateKey(startAt);
}

/** Default recruit close = start − hours (min 1h). */
export function defaultRecruitClosesAt(
  startAt: Date,
  hoursBefore: number,
): Date {
  const hours = Math.max(1, Math.floor(hoursBefore));
  return new Date(startAt.getTime() - hours * 60 * 60_000);
}
