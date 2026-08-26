/**
 * Join discovery lifecycle helpers — Home / My Joins / Map markers share this SSOT.
 * No Nest/Prisma/UI imports.
 */

import { JoinStatus } from '@jjoin/types';

/** Statuses that can still appear in discovery (map / home active). */
export const DISCOVERY_JOIN_STATUSES: readonly JoinStatus[] = [
  JoinStatus.OPEN,
  JoinStatus.FULL,
  JoinStatus.CONFIRMED,
  JoinStatus.IN_PROGRESS,
] as const;

const DISCOVERY_STATUS_SET = new Set<string>(DISCOVERY_JOIN_STATUSES);

export type JoinTimeWindow = {
  status: JoinStatus | string;
  startAt: Date | string;
  scheduledEndAt: Date | string;
};

export type JoinDiscoveryKind = 'ongoing' | 'today' | 'upcoming' | 'past' | 'inactive';

export type JoinDiscoveryBadge = {
  kind: JoinDiscoveryKind;
  /** Short UI label: 진행 중 / 오늘 예정 / 모집 중 / … */
  label: string;
  /** Compact map caption: 진행중 / 오늘 / count */
  mapCaption: string;
};

function asDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

export function isDiscoveryJoinStatus(status: JoinStatus | string): boolean {
  return DISCOVERY_STATUS_SET.has(status);
}

export function isTerminalJoinStatus(status: JoinStatus | string): boolean {
  return status === JoinStatus.CANCELLED || status === JoinStatus.COMPLETED;
}

/** Local calendar day key in IANA timezone (default Asia/Seoul). */
export function localDayKey(date: Date | string, timeZone = 'Asia/Seoul'): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(asDate(date));
}

/**
 * 진행 중: explicit IN_PROGRESS, or start≤now&lt;end within discovery statuses.
 */
export function isOngoingJoin(input: JoinTimeWindow & { now?: Date }): boolean {
  if (!isDiscoveryJoinStatus(input.status)) return false;
  const now = input.now ?? new Date();
  if (input.status === JoinStatus.IN_PROGRESS) {
    return asDate(input.scheduledEndAt).getTime() > now.getTime();
  }
  const start = asDate(input.startAt).getTime();
  const end = asDate(input.scheduledEndAt).getTime();
  return start <= now.getTime() && end > now.getTime();
}

/**
 * 오늘 조인(유효): local today startAt, not ended, discovery status.
 * Includes ongoing-today joins.
 */
export function isTodayValidJoin(
  input: JoinTimeWindow & { now?: Date; timeZone?: string },
): boolean {
  if (!isDiscoveryJoinStatus(input.status)) return false;
  const now = input.now ?? new Date();
  const timeZone = input.timeZone ?? 'Asia/Seoul';
  if (asDate(input.scheduledEndAt).getTime() <= now.getTime()) return false;
  return localDayKey(input.startAt, timeZone) === localDayKey(now, timeZone);
}

/** Home / list priority: ongoing → today soonest → later upcoming → past. */
export function compareJoinDiscoveryPriority(
  a: JoinTimeWindow,
  b: JoinTimeWindow,
  now = new Date(),
): number {
  const rank = (j: JoinTimeWindow): number => {
    if (isOngoingJoin({ ...j, now })) return 0;
    if (isTodayValidJoin({ ...j, now }) && asDate(j.startAt).getTime() > now.getTime()) return 1;
    if (isTodayValidJoin({ ...j, now })) return 2;
    if (
      isDiscoveryJoinStatus(j.status) &&
      asDate(j.scheduledEndAt).getTime() > now.getTime()
    ) {
      return 3;
    }
    return 4;
  };
  const ra = rank(a);
  const rb = rank(b);
  if (ra !== rb) return ra - rb;
  return asDate(a.startAt).getTime() - asDate(b.startAt).getTime();
}

export function resolveJoinDiscoveryKind(
  input: JoinTimeWindow & { now?: Date; timeZone?: string },
): JoinDiscoveryKind {
  const now = input.now ?? new Date();
  if (isOngoingJoin({ ...input, now })) return 'ongoing';
  if (isTodayValidJoin({ ...input, now, timeZone: input.timeZone })) {
    return asDate(input.startAt).getTime() > now.getTime() ? 'today' : 'today';
  }
  if (
    isDiscoveryJoinStatus(input.status) &&
    asDate(input.scheduledEndAt).getTime() > now.getTime()
  ) {
    return 'upcoming';
  }
  if (isTerminalJoinStatus(input.status) || asDate(input.scheduledEndAt).getTime() <= now.getTime()) {
    return 'past';
  }
  return 'inactive';
}

export function resolveJoinDiscoveryBadge(
  input: JoinTimeWindow & { now?: Date; timeZone?: string },
): JoinDiscoveryBadge {
  const kind = resolveJoinDiscoveryKind(input);
  switch (kind) {
    case 'ongoing':
      return { kind, label: '진행 중', mapCaption: '진행중' };
    case 'today':
      return { kind, label: '오늘 예정', mapCaption: '오늘' };
    case 'upcoming':
      return {
        kind,
        label: input.status === JoinStatus.FULL ? '정원 마감' : '모집 중',
        mapCaption: '',
      };
    case 'past':
      return { kind, label: '종료', mapCaption: '' };
    default:
      return { kind, label: String(input.status), mapCaption: '' };
  }
}

/** Hosted Home card: ongoing or today-not-ended discovery joins. */
export function isHomeHostedActiveJoin(
  input: JoinTimeWindow & { now?: Date; timeZone?: string },
): boolean {
  const now = input.now ?? new Date();
  if (!isDiscoveryJoinStatus(input.status)) return false;
  if (asDate(input.scheduledEndAt).getTime() <= now.getTime()) return false;
  return isOngoingJoin({ ...input, now }) || isTodayValidJoin({ ...input, now, timeZone: input.timeZone });
}

export function pickHomeHostedJoins<T extends JoinTimeWindow>(
  joins: T[],
  options?: { now?: Date; timeZone?: string; limit?: number },
): T[] {
  const now = options?.now ?? new Date();
  const timeZone = options?.timeZone ?? 'Asia/Seoul';
  const limit = options?.limit ?? 2;
  return joins
    .filter((j) => isHomeHostedActiveJoin({ ...j, now, timeZone }))
    .sort((a, b) => compareJoinDiscoveryPriority(a, b, now))
    .slice(0, limit);
}

export type FacilityJoinActivity = {
  todayJoinCount: number;
  ongoingJoinCount: number;
  openJoinCount: number;
  hasTodayJoin: boolean;
  hasOngoingJoin: boolean;
};

export function emptyFacilityJoinActivity(): FacilityJoinActivity {
  return {
    todayJoinCount: 0,
    ongoingJoinCount: 0,
    openJoinCount: 0,
    hasTodayJoin: false,
    hasOngoingJoin: false,
  };
}

/** Aggregate activity for one facility/venue from join windows. */
export function aggregateFacilityJoinActivity(
  joins: JoinTimeWindow[],
  now = new Date(),
  timeZone = 'Asia/Seoul',
): FacilityJoinActivity {
  let todayJoinCount = 0;
  let ongoingJoinCount = 0;
  const activeIds = new Set<number>();
  joins.forEach((join, index) => {
    const ongoing = isOngoingJoin({ ...join, now });
    const today = isTodayValidJoin({ ...join, now, timeZone });
    if (ongoing) ongoingJoinCount += 1;
    if (today) todayJoinCount += 1;
    if (ongoing || today) activeIds.add(index);
  });
  return {
    todayJoinCount,
    ongoingJoinCount,
    openJoinCount: activeIds.size,
    hasTodayJoin: todayJoinCount > 0,
    hasOngoingJoin: ongoingJoinCount > 0,
  };
}

export function resolveMapJoinCaption(activity: FacilityJoinActivity): string {
  if (activity.hasOngoingJoin) return '진행중';
  if (activity.hasTodayJoin) {
    return activity.todayJoinCount > 1 ? String(activity.todayJoinCount) : '오늘';
  }
  return '';
}

/** Default nearby radius — aligned with presence nearby policy. */
export const DEFAULT_NEARBY_RADIUS_METERS = 5000;

export const MAX_JOIN_REGION_PREFERENCES = 5;

export const WEEKDAY_LABELS_KO = ['일', '월', '화', '수', '목', '금', '토'] as const;

export type JoinDiscoveryRegionMode = 'NEARBY' | 'DISTRICT';
export type JoinDiscoverySort = 'TIME' | 'DISTANCE';
export type JoinDiscoveryJoinability = 'ALL' | 'JOINABLE';

/** Region identity — sido/sigungu match GolfFacility DB columns (canonical Korean names). */
export type JoinDiscoveryRegion =
  | { mode: 'NEARBY'; label: string }
  | { mode: 'DISTRICT'; sido: string; sigungu: string; label: string };

export type JoinDiscoveryFilterState = {
  date: string;
  region: JoinDiscoveryRegion;
  sort: JoinDiscoverySort;
  joinability: JoinDiscoveryJoinability;
};

export type WeekDayCell = {
  date: string;
  weekdayIndex: number;
  weekdayLabel: string;
  dayOfMonth: number;
  isToday: boolean;
};

export type DiscoverCanJoinState = 'JOINABLE' | 'FULL' | 'ALREADY_JOINED' | 'HOST' | 'UNAVAILABLE';

export type DiscoverCanJoinResult = {
  state: DiscoverCanJoinState;
  canJoin: boolean;
  ctaLabel: string | null;
};

function parseDayKeyParts(dateKey: string): { y: number; m: number; d: number } {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!m) throw new Error(`invalid_date_key:${dateKey}`);
  return { y: Number(m[1]), m: Number(m[2]), d: Number(m[3]) };
}

/** KST calendar day as [start, end) in UTC. */
export function kstDayBoundsUtc(dateKey: string): { start: Date; end: Date } {
  const { y, m, d } = parseDayKeyParts(dateKey);
  // Asia/Seoul is UTC+9 year-round (no DST).
  const start = new Date(Date.UTC(y, m - 1, d, -9, 0, 0, 0));
  const end = new Date(Date.UTC(y, m - 1, d + 1, -9, 0, 0, 0));
  return { start, end };
}

export function addCalendarDays(dateKey: string, deltaDays: number): string {
  const { y, m, d } = parseDayKeyParts(dateKey);
  const utcNoon = new Date(Date.UTC(y, m - 1, d + deltaDays, 12, 0, 0));
  return localDayKey(utcNoon, 'Asia/Seoul');
}

/** Sunday-start week containing `dateKey`. */
export function sundayOfWeek(dateKey: string, _timeZone = 'Asia/Seoul'): string {
  const { start } = kstDayBoundsUtc(dateKey);
  // KST = UTC+9 year-round; weekday on the KST calendar day.
  const kstInstant = new Date(start.getTime() + 9 * 60 * 60_000);
  const wd = kstInstant.getUTCDay(); // 0=Sun … 6=Sat
  void _timeZone;
  return addCalendarDays(dateKey, -wd);
}

export function buildWeekStrip(
  anchorDateKey: string,
  options?: { now?: Date; timeZone?: string },
): WeekDayCell[] {
  const timeZone = options?.timeZone ?? 'Asia/Seoul';
  const now = options?.now ?? new Date();
  const todayKey = localDayKey(now, timeZone);
  const sunday = sundayOfWeek(anchorDateKey, timeZone);
  return WEEKDAY_LABELS_KO.map((weekdayLabel, weekdayIndex) => {
    const date = addCalendarDays(sunday, weekdayIndex);
    const dayOfMonth = Number(date.slice(8, 10));
    return {
      date,
      weekdayIndex,
      weekdayLabel,
      dayOfMonth,
      isToday: date === todayKey,
    };
  });
}

export function shiftWeekAnchor(anchorDateKey: string, deltaWeeks: number): string {
  return addCalendarDays(sundayOfWeek(anchorDateKey), deltaWeeks * 7);
}

/** Discovery join still valid on a selected KST calendar day (not ended). */
export function isValidOnSelectedDate(
  input: JoinTimeWindow & { now?: Date; timeZone?: string; dateKey: string },
): boolean {
  if (!isDiscoveryJoinStatus(input.status)) return false;
  const now = input.now ?? new Date();
  if (asDate(input.scheduledEndAt).getTime() <= now.getTime()) return false;
  const timeZone = input.timeZone ?? 'Asia/Seoul';
  return localDayKey(input.startAt, timeZone) === input.dateKey;
}

export function aggregateFacilityJoinActivityForDate(
  joins: JoinTimeWindow[],
  dateKey: string,
  now = new Date(),
  timeZone = 'Asia/Seoul',
): FacilityJoinActivity & { selectedDateJoinCount: number; hasSelectedDateJoin: boolean } {
  const todayKey = localDayKey(now, timeZone);
  let selectedDateJoinCount = 0;
  let ongoingJoinCount = 0;
  const activeIds = new Set<number>();
  joins.forEach((join, index) => {
    const ongoing =
      dateKey === todayKey && isOngoingJoin({ ...join, now });
    const onDate = isValidOnSelectedDate({ ...join, now, timeZone, dateKey });
    if (ongoing) ongoingJoinCount += 1;
    if (onDate) selectedDateJoinCount += 1;
    if (ongoing || onDate) activeIds.add(index);
  });
  const isToday = dateKey === todayKey;
  return {
    todayJoinCount: isToday ? selectedDateJoinCount : 0,
    selectedDateJoinCount,
    ongoingJoinCount,
    openJoinCount: activeIds.size,
    hasTodayJoin: isToday && selectedDateJoinCount > 0,
    hasSelectedDateJoin: selectedDateJoinCount > 0,
    hasOngoingJoin: ongoingJoinCount > 0,
  };
}

export function resolveMapJoinCaptionForDate(
  activity: {
    hasOngoingJoin: boolean;
    hasSelectedDateJoin: boolean;
    selectedDateJoinCount: number;
    hasTodayJoin?: boolean;
    todayJoinCount?: number;
  },
  options?: { dateKey?: string; todayKey?: string },
): string {
  if (activity.hasOngoingJoin) return '진행중';
  const count = activity.selectedDateJoinCount ?? activity.todayJoinCount ?? 0;
  const hasDate = activity.hasSelectedDateJoin ?? activity.hasTodayJoin ?? false;
  if (!hasDate || count <= 0) return '';
  const todayKey = options?.todayKey;
  const dateKey = options?.dateKey;
  if (dateKey && todayKey && dateKey === todayKey) {
    return count > 1 ? String(count) : '오늘';
  }
  return count > 1 ? String(count) : '조인';
}

export function compareDiscoverJoinOrder(
  a: JoinTimeWindow & { distanceMeters?: number | null },
  b: JoinTimeWindow & { distanceMeters?: number | null },
  options?: { sort?: JoinDiscoverySort; now?: Date },
): number {
  const now = options?.now ?? new Date();
  const sort = options?.sort ?? 'TIME';
  const aOngoing = isOngoingJoin({ ...a, now });
  const bOngoing = isOngoingJoin({ ...b, now });
  if (aOngoing !== bOngoing) return aOngoing ? -1 : 1;

  if (sort === 'DISTANCE') {
    const da = a.distanceMeters ?? Number.POSITIVE_INFINITY;
    const db = b.distanceMeters ?? Number.POSITIVE_INFINITY;
    if (da !== db) return da - db;
    return asDate(a.startAt).getTime() - asDate(b.startAt).getTime();
  }

  const startDiff = asDate(a.startAt).getTime() - asDate(b.startAt).getTime();
  if (startDiff !== 0) return startDiff;
  const da = a.distanceMeters ?? Number.POSITIVE_INFINITY;
  const db = b.distanceMeters ?? Number.POSITIVE_INFINITY;
  return da - db;
}

export function partitionDiscoverJoins<T extends JoinTimeWindow>(
  joins: T[],
  options?: { dateKey?: string; now?: Date; timeZone?: string },
): { ongoing: T[]; upcoming: T[] } {
  const now = options?.now ?? new Date();
  const timeZone = options?.timeZone ?? 'Asia/Seoul';
  const todayKey = localDayKey(now, timeZone);
  const dateKey = options?.dateKey ?? todayKey;
  const ongoing: T[] = [];
  const upcoming: T[] = [];
  for (const join of joins) {
    if (dateKey === todayKey && isOngoingJoin({ ...join, now })) {
      ongoing.push(join);
    } else {
      upcoming.push(join);
    }
  }
  return { ongoing, upcoming };
}

export function aggregateWeeklyDayCounts(
  joins: JoinTimeWindow[],
  weekDays: string[],
  options?: { now?: Date; timeZone?: string },
): Record<string, number> {
  const now = options?.now ?? new Date();
  const timeZone = options?.timeZone ?? 'Asia/Seoul';
  const counts: Record<string, number> = {};
  for (const day of weekDays) counts[day] = 0;
  for (const join of joins) {
    if (!isDiscoveryJoinStatus(join.status)) continue;
    if (asDate(join.scheduledEndAt).getTime() <= now.getTime()) continue;
    const key = localDayKey(join.startAt, timeZone);
    if (key in counts) counts[key] += 1;
  }
  return counts;
}

export function resolveDiscoverCanJoin(input: {
  status: JoinStatus | string;
  currentParticipants: number;
  maxParticipants: number;
  isHost: boolean;
  isParticipant: boolean;
}): DiscoverCanJoinResult {
  if (input.isHost) {
    return { state: 'HOST', canJoin: false, ctaLabel: null };
  }
  if (input.isParticipant) {
    return { state: 'ALREADY_JOINED', canJoin: false, ctaLabel: null };
  }
  if (!isDiscoveryJoinStatus(input.status) || isTerminalJoinStatus(input.status)) {
    return { state: 'UNAVAILABLE', canJoin: false, ctaLabel: null };
  }
  if (
    input.status === JoinStatus.FULL ||
    input.currentParticipants >= input.maxParticipants
  ) {
    return { state: 'FULL', canJoin: false, ctaLabel: null };
  }
  return { state: 'JOINABLE', canJoin: true, ctaLabel: '참가하기' };
}

export function regionIdentityKey(region: JoinDiscoveryRegion): string {
  if (region.mode === 'NEARBY') return 'NEARBY';
  return `DISTRICT:${region.sido}|${region.sigungu}`;
}

export function createDefaultDiscoveryFilter(now = new Date()): JoinDiscoveryFilterState {
  return {
    date: localDayKey(now),
    region: { mode: 'NEARBY', label: '내 주변' },
    sort: 'TIME',
    joinability: 'ALL',
  };
}
