/**
 * Join alert subscription matching — pure domain SSOT.
 */

import { addCalendarDays, localDayKey, sundayOfWeek } from './join-discovery';

export type JoinAlertDateMode = 'TODAY' | 'THIS_WEEK' | 'SPECIFIC_DATE';
export type JoinAlertTimeBand = 'ANY' | 'MORNING' | 'AFTERNOON' | 'EVENING';

export type JoinAlertSubscriptionMatchInput = {
  dateMode: JoinAlertDateMode;
  specificDate?: string | null;
  timeBand: JoinAlertTimeBand;
  joinableOnly: boolean;
  sido?: string | null;
  sigungu?: string | null;
};

export type JoinAlertCandidate = {
  startAt: Date | string;
  status: string;
  currentParticipants: number;
  maxParticipants: number;
  sido?: string | null;
  sigungu?: string | null;
};

/** KST hour-of-day bands (inclusive start, exclusive end). */
export const JOIN_ALERT_TIME_BANDS: Record<
  Exclude<JoinAlertTimeBand, 'ANY'>,
  { startHour: number; endHour: number }
> = {
  MORNING: { startHour: 6, endHour: 12 },
  AFTERNOON: { startHour: 12, endHour: 18 },
  EVENING: { startHour: 18, endHour: 24 },
};

function kstHourOfDay(instant: Date | string): number {
  const d = typeof instant === 'string' ? new Date(instant) : instant;
  // Asia/Seoul UTC+9 year-round
  return (d.getUTCHours() + 9) % 24;
}

function isJoinableCapacity(c: JoinAlertCandidate): boolean {
  if (c.status === 'FULL') return false;
  if (c.currentParticipants >= c.maxParticipants) return false;
  return ['OPEN', 'CONFIRMED', 'IN_PROGRESS'].includes(c.status);
}

export function matchesJoinAlertDate(
  dateMode: JoinAlertDateMode,
  specificDate: string | null | undefined,
  startAt: Date | string,
  now = new Date(),
  timeZone = 'Asia/Seoul',
): boolean {
  const startKey = localDayKey(startAt, timeZone);
  const todayKey = localDayKey(now, timeZone);
  if (dateMode === 'TODAY') return startKey === todayKey;
  if (dateMode === 'THIS_WEEK') {
    const sun = sundayOfWeek(todayKey, timeZone);
    const sat = addCalendarDays(sun, 6);
    return startKey >= sun && startKey <= sat;
  }
  if (!specificDate) return false;
  return startKey === specificDate.slice(0, 10);
}

export function matchesJoinAlertTimeBand(
  timeBand: JoinAlertTimeBand,
  startAt: Date | string,
): boolean {
  if (timeBand === 'ANY') return true;
  const hour = kstHourOfDay(startAt);
  const band = JOIN_ALERT_TIME_BANDS[timeBand];
  return hour >= band.startHour && hour < band.endHour;
}

export function matchesJoinAlertRegion(
  sub: Pick<JoinAlertSubscriptionMatchInput, 'sido' | 'sigungu'>,
  candidate: Pick<JoinAlertCandidate, 'sido' | 'sigungu'>,
): boolean {
  if (!sub.sido && !sub.sigungu) return true;
  if (sub.sido && sub.sido !== candidate.sido) return false;
  if (sub.sigungu && sub.sigungu !== candidate.sigungu) return false;
  return true;
}

export function matchesJoinAlertSubscription(
  sub: JoinAlertSubscriptionMatchInput,
  candidate: JoinAlertCandidate,
  now = new Date(),
): boolean {
  if (sub.joinableOnly && !isJoinableCapacity(candidate)) return false;
  if (!matchesJoinAlertRegion(sub, candidate)) return false;
  if (
    !matchesJoinAlertDate(
      sub.dateMode,
      sub.specificDate,
      candidate.startAt,
      now,
    )
  ) {
    return false;
  }
  if (!matchesJoinAlertTimeBand(sub.timeBand, candidate.startAt)) return false;
  return true;
}

/**
 * Shared dedupe key for "new JOINABLE join available to user".
 * Condition alert + facility follow both use this so one join → one notification.
 */
export function newJoinableNotificationEventKey(
  userId: string,
  joinId: string,
): string {
  return `user-new-joinable:${userId}:${joinId}`;
}

export function bookmarkNotificationEventKey(
  userId: string,
  joinId: string,
  kind: 'closing' | 'spot_left' | 'updated' | 'cancelled',
): string {
  return `bookmark:${userId}:${joinId}:${kind}`;
}

export function createJoinShareSlug(randomBytes: Uint8Array): string {
  const alphabet =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let out = '';
  for (let i = 0; i < randomBytes.length; i += 1) {
    out += alphabet[randomBytes[i]! % alphabet.length]!;
  }
  return out;
}
