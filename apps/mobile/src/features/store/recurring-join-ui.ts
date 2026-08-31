import type { RecurringJoinScheduleStatus } from '@jjoin/types';
import {
  occurrenceDateKeyFromStart,
  nextWeeklyOccurrenceStart,
  type IsoWeekday,
} from '@jjoin/domain';

/** ISO weekday 1=Mon … 7=Sun → Korean short label */
export const DAY_OF_WEEK_LABELS: Record<number, string> = {
  1: '월',
  2: '화',
  3: '수',
  4: '목',
  5: '금',
  6: '토',
  7: '일',
};

export const DAY_OF_WEEK_OPTIONS = [
  { value: 1, label: '월요일' },
  { value: 2, label: '화요일' },
  { value: 3, label: '수요일' },
  { value: 4, label: '목요일' },
  { value: 5, label: '금요일' },
  { value: 6, label: '토요일' },
  { value: 7, label: '일요일' },
] as const;

export const RECURRING_STATUS_LABELS: Record<RecurringJoinScheduleStatus, string> = {
  ACTIVE: '진행중',
  PAUSED: '일시정지',
  DELETED: '삭제됨',
};

export function dayOfWeekLabel(dayOfWeek: number): string {
  return DAY_OF_WEEK_LABELS[dayOfWeek] ?? `${dayOfWeek}`;
}

export function recurringStatusLabel(status: RecurringJoinScheduleStatus): string {
  return RECURRING_STATUS_LABELS[status];
}

/** Next occurrence date (YYYY-MM-DD KST) for skip-this-week action. */
export function nextOccurrenceDateForSkip(input: {
  dayOfWeek: number;
  startTimeLocal: string;
  nextRunAt: string | null;
  now?: Date;
}): string | null {
  if (input.nextRunAt) {
    const d = new Date(input.nextRunAt);
    if (!Number.isNaN(d.getTime())) return occurrenceDateKeyFromStart(d);
  }
  const day = input.dayOfWeek;
  if (day < 1 || day > 7) return null;
  try {
    const next = nextWeeklyOccurrenceStart({
      dayOfWeek: day as IsoWeekday,
      startTimeLocal: input.startTimeLocal,
      after: input.now ?? new Date(),
    });
    return occurrenceDateKeyFromStart(next);
  } catch {
    return null;
  }
}
