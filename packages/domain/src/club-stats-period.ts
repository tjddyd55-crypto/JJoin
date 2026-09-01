const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

/** KST calendar date parts for an instant. */
export function kstDateParts(date: Date): { year: number; month: number; day: number } {
  const kst = new Date(date.getTime() + KST_OFFSET_MS);
  return {
    year: kst.getUTCFullYear(),
    month: kst.getUTCMonth() + 1,
    day: kst.getUTCDate(),
  };
}

/** Start of KST calendar year in UTC. */
export function kstYearStartUtc(reference = new Date()): Date {
  const { year } = kstDateParts(reference);
  return new Date(Date.UTC(year, 0, 1) - KST_OFFSET_MS);
}

/** Rolling 30×24h window ending at reference (exclusive upper bound = reference). */
export function rolling30DayStartUtc(reference = new Date()): Date {
  return new Date(reference.getTime() - 30 * 24 * 60 * 60_000);
}

/** KST midnight for calendar day N days before reference day. */
export function kstDayStartUtc(reference = new Date(), daysAgo = 0): Date {
  const { year, month, day } = kstDateParts(reference);
  const utcMidnightKst = Date.UTC(year, month - 1, day - daysAgo, 0, 0, 0, 0);
  return new Date(utcMidnightKst - KST_OFFSET_MS);
}

export function isWithinRolling30Days(startsAt: Date, reference = new Date()): boolean {
  return startsAt >= rolling30DayStartUtc(reference) && startsAt <= reference;
}

export function isWithinKstYear(startsAt: Date, reference = new Date()): boolean {
  return startsAt >= kstYearStartUtc(reference) && startsAt <= reference;
}
