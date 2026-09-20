/**
 * Relative KST calendar for seed-run "now".
 * KST is UTC+9 with no DST — wall times convert with a fixed offset.
 */

export const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

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

export type SlotSpec = {
  key: string;
  bucket: TimeBucket;
  startAt: Date;
  hour: number;
  minute: number;
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

function slot(key: string, bucket: TimeBucket, day: KstParts, hour: number, minute: number): SlotSpec {
  return {
    key,
    bucket,
    startAt: atKst(day.year, day.month, day.day, hour, minute),
    hour,
    minute,
  };
}

function pushIfFuture(out: SlotSpec[], item: SlotSpec, now: Date): void {
  if (item.startAt.getTime() > now.getTime() + 20 * 60_000) out.push(item);
}

export function buildScreenSlots(now: Date): SlotSpec[] {
  const parts = kstParts(now);
  const today = parts;
  const tomorrow = addKstDays(parts, 1);
  const slots: SlotSpec[] = [];

  for (const [hour, minute] of SCREEN_WEEKNIGHT) {
    pushIfFuture(slots, slot(`tonight-${hour}${minute}`, 'tonight', today, hour, minute), now);
  }
  if (slots.filter((row) => row.bucket === 'tonight').length === 0) {
    for (const [hour, minute] of SCREEN_WEEKNIGHT.slice(0, 3)) {
      slots.push(slot(`tonight-shift-${hour}${minute}`, 'tonight', tomorrow, hour, minute));
    }
  }

  slots.push(slot('tomorrow-am-1000', 'tomorrow_am', tomorrow, 10, 0));
  slots.push(slot('tomorrow-am-1130', 'tomorrow_am', tomorrow, 11, 30));
  for (const [hour, minute] of SCREEN_WEEKNIGHT) {
    slots.push(slot(`tomorrow-pm-${hour}${minute}`, 'tomorrow_pm', tomorrow, hour, minute));
  }

  const thisSat = upcomingWeekday(parts, 6, parts.weekday === 6 ? 0 : 1);
  const thisSun = upcomingWeekday(parts, 0, parts.weekday === 0 ? 0 : 1);
  slots.push(slot('this-sat-1000', 'this_weekend', thisSat, 10, 0));
  slots.push(slot('this-sat-1400', 'this_weekend', thisSat, 14, 0));
  slots.push(slot('this-sat-1900', 'this_weekend', thisSat, 19, 0));
  slots.push(slot('this-sat-2030', 'this_weekend', thisSat, 20, 30));
  slots.push(slot('this-sun-0930', 'this_weekend', thisSun, 9, 30));
  slots.push(slot('this-sun-1100', 'this_weekend', thisSun, 11, 0));

  for (let weekOffset = 0; weekOffset < 2; weekOffset += 1) {
    for (const weekday of [1, 2, 3, 4, 5]) {
      const day = addKstDays(upcomingWeekday(parts, weekday, 1), weekOffset * 7);
      const [hour, minute] = SCREEN_WEEKNIGHT[(weekday + weekOffset) % SCREEN_WEEKNIGHT.length]!;
      slots.push(slot(`next-wd-${weekOffset}-${weekday}-${hour}${minute}`, 'next_weekday_evening', day, hour, minute));
    }
  }

  const nextSat = addKstDays(thisSat, 7);
  const nextSun = addKstDays(thisSun, 7);
  slots.push(slot('next-sat-1000', 'next_weekend', nextSat, 10, 0));
  slots.push(slot('next-sat-1500', 'next_weekend', nextSat, 15, 0));
  slots.push(slot('next-sat-1900', 'next_weekend', nextSat, 19, 0));
  slots.push(slot('next-sun-0930', 'next_weekend', nextSun, 9, 30));

  const later = addKstDays(parts, 12);
  slots.push(slot('later-1900', 'within_two_weeks', later, 19, 0));
  slots.push(slot('later-2030', 'within_two_weeks', later, 20, 30));

  return uniqueFutureSlots(slots, now);
}

export function buildFieldSlots(now: Date): SlotSpec[] {
  const parts = kstParts(now);
  const tomorrow = addKstDays(parts, 1);
  const thisSat = upcomingWeekday(parts, 6, parts.weekday === 6 ? 0 : 1);
  const thisSun = upcomingWeekday(parts, 0, parts.weekday === 0 ? 0 : 1);
  const nextSat = addKstDays(thisSat, 7);
  const nextSun = addKstDays(thisSun, 7);
  const slots: SlotSpec[] = [];

  for (const [hour, minute] of FIELD_TEE.slice(0, 4)) {
    slots.push(slot(`field-tom-${hour}${minute}`, 'tomorrow_am', tomorrow, hour, minute));
  }
  for (const [hour, minute] of FIELD_TEE) {
    slots.push(slot(`field-sat-${hour}${minute}`, 'this_weekend', thisSat, hour, minute));
    slots.push(slot(`field-sun-${hour}${minute}`, 'this_weekend', thisSun, hour, minute));
  }
  for (let weekOffset = 0; weekOffset < 2; weekOffset += 1) {
    for (const weekday of [1, 2, 3, 4]) {
      const day = addKstDays(upcomingWeekday(parts, weekday, 1), weekOffset * 7);
      const [hour, minute] = FIELD_TEE[weekday % FIELD_TEE.length]!;
      slots.push(slot(`field-wd-${weekOffset}-${weekday}`, 'next_weekday_evening', day, hour, minute));
    }
  }
  for (const [hour, minute] of FIELD_TEE.slice(0, 3)) {
    slots.push(slot(`field-next-sat-${hour}${minute}`, 'next_weekend', nextSat, hour, minute));
    slots.push(slot(`field-next-sun-${hour}${minute}`, 'next_weekend', nextSun, hour, minute));
  }
  const later = addKstDays(parts, 11);
  slots.push(slot('field-later-1320', 'within_two_weeks', later, 13, 20));
  return uniqueFutureSlots(slots, now);
}

function uniqueFutureSlots(slots: SlotSpec[], now: Date): SlotSpec[] {
  const seen = new Set<string>();
  const out: SlotSpec[] = [];
  for (const item of slots) {
    if (item.startAt.getTime() <= now.getTime() + 15 * 60_000) continue;
    const stamp = item.startAt.toISOString();
    if (seen.has(stamp)) continue;
    seen.add(stamp);
    out.push(item);
  }
  return out;
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
