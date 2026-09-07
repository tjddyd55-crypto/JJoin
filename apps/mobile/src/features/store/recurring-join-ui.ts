import type { RecurringJoinScheduleStatus } from '@jjoin/types';
import {
  isoWeekdayKst,
  kstDateKey,
  nextWeeklyOccurrenceStart,
  previewHostRecurringOccurrenceDates,
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
  ENDED: '종료됨',
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
    if (!Number.isNaN(d.getTime())) return kstDateKey(d);
  }
  const day = input.dayOfWeek;
  if (day < 1 || day > 7) return null;
  try {
    const next = nextWeeklyOccurrenceStart({
      dayOfWeek: day as IsoWeekday,
      startTimeLocal: input.startTimeLocal,
      after: input.now ?? new Date(),
    });
    return kstDateKey(next);
  } catch {
    return null;
  }
}

export function isoWeekdayFromDateKey(dateKey: string): IsoWeekday {
  return isoWeekdayKst(new Date(`${dateKey}T12:00:00+09:00`));
}

export function hostRecurringSummaryLabel(input: {
  dayOfWeek: number;
  startTimeLocal: string;
  recurrenceStartDate: string;
  recurrenceEndDate?: string;
  maxOccurrences?: number;
}): { repeatLabel: string; periodLabel: string; totalLabel: string; previewDates: string[] } {
  const repeatLabel = `매주 ${dayOfWeekLabel(input.dayOfWeek)} ${input.startTimeLocal}`;
  const periodLabel = input.recurrenceEndDate
    ? `${input.recurrenceStartDate} ~ ${input.recurrenceEndDate}`
    : `${input.recurrenceStartDate}부터 · ${input.maxOccurrences ?? '?'}회`;
  const { totalPlanned, previewDates } = previewHostRecurringOccurrenceDates({
    dayOfWeek: input.dayOfWeek as IsoWeekday,
    startTimeLocal: input.startTimeLocal,
    recurrenceStartDate: input.recurrenceStartDate,
    recurrenceEndDate: input.recurrenceEndDate ?? null,
    maxOccurrences: input.maxOccurrences ?? null,
  });
  return {
    repeatLabel,
    periodLabel,
    totalLabel: `총 ${totalPlanned}회`,
    previewDates,
  };
}

export function recurringScheduleTitle(schedule: {
  kind?: string;
  title: string | null;
  facilityName: string | null;
}): string {
  if (schedule.title?.trim()) return schedule.title.trim();
  if (schedule.facilityName?.trim()) return schedule.facilityName.trim();
  return schedule.kind === 'HOST_JOIN' ? '반복 조인' : '정기 조인';
}
