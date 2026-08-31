/**
 * Attendance reminder windows for hourly cron.
 * Uses bounded windows so a single hourly tick does not miss 24h/3h targets.
 */

export type AttendanceReminderKind = '24h' | '3h';

const MS_HOUR = 60 * 60 * 1000;

/** Half-width of the capture window around the target offset (hourly cron). */
const WINDOW_HALF_MS: Record<AttendanceReminderKind, number> = {
  '24h': MS_HOUR,
  '3h': MS_HOUR,
};

const TARGET_OFFSET_MS: Record<AttendanceReminderKind, number> = {
  '24h': 24 * MS_HOUR,
  '3h': 3 * MS_HOUR,
};

export function attendanceReminderEventKey(
  kind: AttendanceReminderKind,
  userId: string,
  joinId: string,
): string {
  return `attendance-reminder-${kind}:${userId}:${joinId}`;
}

/**
 * True when join.startAt falls in the bounded window for this reminder kind at cron time `now`.
 */
export function isJoinInAttendanceReminderWindow(
  joinStartAt: Date,
  now: Date,
  kind: AttendanceReminderKind,
): boolean {
  const target = TARGET_OFFSET_MS[kind];
  const half = WINDOW_HALF_MS[kind];
  const msUntilStart = joinStartAt.getTime() - now.getTime();
  return msUntilStart >= target - half && msUntilStart <= target + half;
}

export type AttendanceReminderCopy = { title: string; body: string };

export function attendanceReminderCopy(
  kind: AttendanceReminderKind,
  venueName: string,
  attendanceIntent: 'PENDING' | 'CONFIRMED' | 'DECLINED' | string | null | undefined,
): AttendanceReminderCopy {
  const when = kind === '24h' ? '내일' : '곧';
  if (attendanceIntent === 'CONFIRMED') {
    return {
      title: '조인 시작 안내',
      body: `${when} ${venueName} 조인이 시작됩니다.`,
    };
  }
  return {
    title: '참석 확인이 필요합니다',
    body: `${when} ${venueName} 조인 — 앱에서 참석 여부를 확인해 주세요.`,
  };
}
