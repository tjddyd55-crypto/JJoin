/**
 * Relative KST calendar for seed-run "now".
 * KST is UTC+9 with no DST — wall times convert with a fixed offset.
 */

export const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
export const DEMO_SLOT_DURATION_MS = 3 * 3600_000;
export const DEMO_ONGOING_MIN_REMAINING_MS = 2 * 3600_000;
export const TODAY_SCREEN_SLOT_MIN = 15;
export const TODAY_FIELD_SLOT_MIN = 8;

export type KstParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  weekday: number; // 0=Sun .. 6=Sat
};

export type TimeBucket =
  | 'tonight'
  | 'today_ongoing'
  | 'tomorrow_am'
  | 'tomorrow_pm'
  | 'this_weekend'
  | 'next_weekday_evening'
  | 'next_weekend'
  | 'within_two_weeks';

export function kstParts(now: Date): KstParts {
  const shifted = new Date(now.getTime() + KST_OFFSET_MS);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
    weekday: shifted.getUTCDay(),
  };
}

export function atKst(year: number, month: number, day: number, hour: number, minute: number): Date {
  return new Date(Date.UTC(year, month - 1, day, hour, minute, 0) - KST_OFFSET_MS);
}

export function addKstDays(parts: KstParts, days: number): KstParts {
  const utc = Date.UTC(parts.year, parts.month - 1, parts.day + days, 12, 0, 0);
  const next = new Date(utc);
  return {
    year: next.getUTCFullYear(),
    month: next.getUTCMonth() + 1,
    day: next.getUTCDate(),
    hour: 12,
    minute: 0,
    weekday: next.getUTCDay(),
  };
}

export function daysUntilWeekday(fromWeekday: number, targetWeekday: number): number {
  return (targetWeekday - fromWeekday + 7) % 7;
}

export function upcomingWeekday(parts: KstParts, targetWeekday: number, minDays: number): KstParts {
  let delta = daysUntilWeekday(parts.weekday, targetWeekday);
  if (delta < minDays) delta += 7;
  return addKstDays(parts, delta);
}

export function kstDayKeyFromDate(value: Date): string {
  const parts = kstParts(value);
  const month = String(parts.month).padStart(2, '0');
  const day = String(parts.day).padStart(2, '0');
  return `${parts.year}-${month}-${day}`;
}

export function isSameKstDay(left: Date, right: Date): boolean {
  return kstDayKeyFromDate(left) === kstDayKeyFromDate(right);
}

/** Discover requires scheduledEndAt > now. Ongoing uses max(start+3h, now+2h). */
export function resolveDemoSlotEndAt(startAt: Date, now: Date): Date {
  const defaultEnd = new Date(startAt.getTime() + DEMO_SLOT_DURATION_MS);
  if (startAt.getTime() > now.getTime()) return defaultEnd;
  return new Date(Math.max(defaultEnd.getTime(), now.getTime() + DEMO_ONGOING_MIN_REMAINING_MS));
}

export type SlotSpec = {
  key: string;
  bucket: TimeBucket;
  startAt: Date;
  hour: number;
  minute: number;
  scheduledEndAt: Date;
};

const SCREEN_WEEKNIGHT = [
  [18, 30],
  [19, 0],
  [20, 0],
  [21, 0],
  [21, 30],
] as const;

const FIELD_TEE = [
  [6, 30],
  [7, 20],
  [8, 10],
  [11, 40],
  [13, 10],
  [14, 20],
] as const;

const ONGOING_OFFSETS_MIN = [30, 45, 60, 75, 90] as const;

function slot(key: string, bucket: TimeBucket, day: KstParts, hour: number, minute: number, now: Date): SlotSpec {
  const startAt = atKst(day.year, day.month, day.day, hour, minute);
  return {
    key,
    bucket,
    startAt,
    hour,
    minute,
    scheduledEndAt: resolveDemoSlotEndAt(startAt, now),
  };
}

function pushIfFuture(out: SlotSpec[], item: SlotSpec, now: Date): void {
  if (item.startAt.getTime() > now.getTime() + 20 * 60_000) out.push(item);
}

export function isTodayListableSlot(item: SlotSpec, now: Date): boolean {
  if (!isSameKstDay(item.startAt, now)) return false;
  return item.scheduledEndAt.getTime() > now.getTime();
}

export function countTodayListableSlots(slots: SlotSpec[], now: Date): number {
  return slots.filter((row) => isTodayListableSlot(row, now)).length;
}

function injectTodayOngoing(now: Date, prefix: string, needed: number): SlotSpec[] {
  const parts = kstParts(now);
  const dayStart = atKst(parts.year, parts.month, parts.day, 0, 1);
  const out: SlotSpec[] = [];
  let index = 0;
  while (out.length < needed) {
    const offsetMin = ONGOING_OFFSETS_MIN[index % ONGOING_OFFSETS_MIN.length]! + Math.floor(index / ONGOING_OFFSETS_MIN.length) * 3;
    const rawStart = new Date(now.getTime() - offsetMin * 60_000);
    const startAt = rawStart.getTime() < dayStart.getTime() ? dayStart : rawStart;
    if (!isSameKstDay(startAt, now)) {
      throw new Error(`today_ongoing_crossed_day ${prefix}`);
    }
    const wall = kstParts(startAt);
    out.push({
      key: `${prefix}-ongoing-${index + 1}`,
      bucket: 'today_ongoing',
      startAt,
      hour: wall.hour,
      minute: wall.minute,
      scheduledEndAt: resolveDemoSlotEndAt(startAt, now),
    });
    index += 1;
    if (index > 40) throw new Error(`today_ongoing_overflow ${prefix}`);
  }
  return out;
}

function uniqueListableSlots(slots: SlotSpec[], now: Date): SlotSpec[] {
  const seen = new Set<string>();
  const out: SlotSpec[] = [];
  for (const item of slots) {
    const upcoming = item.startAt.getTime() > now.getTime() + 15 * 60_000;
    const ongoingToday = isTodayListableSlot(item, now);
    if (!upcoming && !ongoingToday) continue;
    const dedupe = upcoming ? item.startAt.toISOString() : item.key;
    if (seen.has(dedupe)) continue;
    seen.add(dedupe);
    out.push(item);
  }
  return out;
}

function finalizeTodaySlots(
  slots: SlotSpec[],
  now: Date,
  prefix: string,
  minToday: number,
): SlotSpec[] {
  const unique = uniqueListableSlots(slots, now);
  const have = countTodayListableSlots(unique, now);
  const filled = have >= minToday ? unique : [...unique, ...injectTodayOngoing(now, prefix, minToday - have)];
  const todayCount = countTodayListableSlots(filled, now);
  if (todayCount < minToday) {
    throw new Error(`today_kst_${prefix}_slots ${todayCount} < ${minToday}`);
  }
  return filled;
}

export function buildScreenSlots(now: Date): SlotSpec[] {
  const parts = kstParts(now);
  const today = parts;
  const tomorrow = addKstDays(parts, 1);
  const slots: SlotSpec[] = [];

  for (const [hour, minute] of SCREEN_WEEKNIGHT) {
    pushIfFuture(slots, slot(`tonight-${hour}${minute}`, 'tonight', today, hour, minute, now), now);
  }
  if (slots.filter((row) => row.bucket === 'tonight').length === 0) {
    for (const [hour, minute] of SCREEN_WEEKNIGHT.slice(0, 3)) {
      slots.push(slot(`tonight-shift-${hour}${minute}`, 'tonight', tomorrow, hour, minute, now));
    }
  }

  slots.push(slot('tomorrow-am-1000', 'tomorrow_am', tomorrow, 10, 0, now));
  slots.push(slot('tomorrow-am-1130', 'tomorrow_am', tomorrow, 11, 30, now));
  for (const [hour, minute] of SCREEN_WEEKNIGHT) {
    slots.push(slot(`tomorrow-pm-${hour}${minute}`, 'tomorrow_pm', tomorrow, hour, minute, now));
  }

  const thisSat = upcomingWeekday(parts, 6, parts.weekday === 6 ? 0 : 1);
  const thisSun = upcomingWeekday(parts, 0, parts.weekday === 0 ? 0 : 1);
  slots.push(slot('this-sat-1000', 'this_weekend', thisSat, 10, 0, now));
  slots.push(slot('this-sat-1400', 'this_weekend', thisSat, 14, 0, now));
  slots.push(slot('this-sat-1900', 'this_weekend', thisSat, 19, 0, now));
  slots.push(slot('this-sat-2030', 'this_weekend', thisSat, 20, 30, now));
  slots.push(slot('this-sun-0930', 'this_weekend', thisSun, 9, 30, now));
  slots.push(slot('this-sun-1100', 'this_weekend', thisSun, 11, 0, now));

  for (let weekOffset = 0; weekOffset < 2; weekOffset += 1) {
    for (const weekday of [1, 2, 3, 4, 5]) {
      const day = addKstDays(upcomingWeekday(parts, weekday, 1), weekOffset * 7);
      const [hour, minute] = SCREEN_WEEKNIGHT[(weekday + weekOffset) % SCREEN_WEEKNIGHT.length]!;
      slots.push(slot(`next-wd-${weekOffset}-${weekday}-${hour}${minute}`, 'next_weekday_evening', day, hour, minute, now));
    }
  }

  const nextSat = addKstDays(thisSat, 7);
  const nextSun = addKstDays(thisSun, 7);
  slots.push(slot('next-sat-1000', 'next_weekend', nextSat, 10, 0, now));
  slots.push(slot('next-sat-1500', 'next_weekend', nextSat, 15, 0, now));
  slots.push(slot('next-sat-1900', 'next_weekend', nextSat, 19, 0, now));
  slots.push(slot('next-sun-0930', 'next_weekend', nextSun, 9, 30, now));

  const later = addKstDays(parts, 12);
  slots.push(slot('later-1900', 'within_two_weeks', later, 19, 0, now));
  slots.push(slot('later-2030', 'within_two_weeks', later, 20, 30, now));

  return finalizeTodaySlots(slots, now, 'screen', TODAY_SCREEN_SLOT_MIN);
}

export function buildFieldSlots(now: Date): SlotSpec[] {
  const parts = kstParts(now);
  const today = parts;
  const tomorrow = addKstDays(parts, 1);
  const thisSat = upcomingWeekday(parts, 6, parts.weekday === 6 ? 0 : 1);
  const thisSun = upcomingWeekday(parts, 0, parts.weekday === 0 ? 0 : 1);
  const nextSat = addKstDays(thisSat, 7);
  const nextSun = addKstDays(thisSun, 7);
  const slots: SlotSpec[] = [];

  for (const [hour, minute] of FIELD_TEE) {
    pushIfFuture(slots, slot(`field-today-${hour}${minute}`, 'tonight', today, hour, minute, now), now);
  }
  for (const [hour, minute] of FIELD_TEE.slice(0, 4)) {
    slots.push(slot(`field-tom-${hour}${minute}`, 'tomorrow_am', tomorrow, hour, minute, now));
  }
  for (const [hour, minute] of FIELD_TEE) {
    slots.push(slot(`field-sat-${hour}${minute}`, 'this_weekend', thisSat, hour, minute, now));
    slots.push(slot(`field-sun-${hour}${minute}`, 'this_weekend', thisSun, hour, minute, now));
  }
  for (let weekOffset = 0; weekOffset < 2; weekOffset += 1) {
    for (const weekday of [1, 2, 3, 4]) {
      const day = addKstDays(upcomingWeekday(parts, weekday, 1), weekOffset * 7);
      const [hour, minute] = FIELD_TEE[weekday % FIELD_TEE.length]!;
      slots.push(slot(`field-wd-${weekOffset}-${weekday}`, 'next_weekday_evening', day, hour, minute, now));
    }
  }
  for (const [hour, minute] of FIELD_TEE.slice(0, 3)) {
    slots.push(slot(`field-next-sat-${hour}${minute}`, 'next_weekend', nextSat, hour, minute, now));
    slots.push(slot(`field-next-sun-${hour}${minute}`, 'next_weekend', nextSun, hour, minute, now));
  }
  const later = addKstDays(parts, 11);
  slots.push(slot('field-later-1320', 'within_two_weeks', later, 13, 20, now));
  return finalizeTodaySlots(slots, now, 'field', TODAY_FIELD_SLOT_MIN);
}

export function splitTodayAndRest(slots: SlotSpec[], now: Date): { today: SlotSpec[]; rest: SlotSpec[] } {
  const today: SlotSpec[] = [];
  const rest: SlotSpec[] = [];
  for (const item of slots) {
    if (isTodayListableSlot(item, now)) today.push(item);
    else rest.push(item);
  }
  return { today, rest };
}

export function cycleSlots(slots: SlotSpec[], count: number, prefix: string): SlotSpec[] {
  if (slots.length === 0) throw new Error(`no_slots ${prefix}`);
  const out: SlotSpec[] = [];
  for (let i = 0; i < count; i += 1) {
    const base = slots[i % slots.length]!;
    out.push({
      ...base,
      key: `${prefix}-${i + 1}`,
    });
  }
  return out;
}
