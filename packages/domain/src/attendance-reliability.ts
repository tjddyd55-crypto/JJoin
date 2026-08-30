/**
 * Attendance reliability — objective participation stats (no subjective scores).
 * SSOT: COMPLETED = attended, NO_SHOW = no-show. Other statuses excluded from rate.
 */

export type AttendanceReliabilityInput = {
  completedCount: number;
  noShowCount: number;
};

export type AttendanceReliability = {
  completedCount: number;
  noShowCount: number;
  /** COMPLETED / (COMPLETED + NO_SHOW); null when denominator is 0. */
  attendanceRate: number | null;
  attendanceRatePercent: number | null;
};

export function computeAttendanceReliability(
  input: AttendanceReliabilityInput,
): AttendanceReliability {
  const completedCount = Math.max(0, Math.floor(input.completedCount));
  const noShowCount = Math.max(0, Math.floor(input.noShowCount));
  const denom = completedCount + noShowCount;
  if (denom === 0) {
    return {
      completedCount,
      noShowCount,
      attendanceRate: null,
      attendanceRatePercent: null,
    };
  }
  const attendanceRate = completedCount / denom;
  return {
    completedCount,
    noShowCount,
    attendanceRate,
    attendanceRatePercent: Math.round(attendanceRate * 1000) / 10,
  };
}

export function isJoinCapacityJoinable(input: {
  status: string;
  currentParticipants: number;
  maxParticipants: number;
}): boolean {
  if (!['OPEN', 'CONFIRMED', 'IN_PROGRESS'].includes(input.status)) return false;
  if (input.currentParticipants >= input.maxParticipants) return false;
  return true;
}

/** Map badge label for today JOINABLE count. */
export function formatTodayJoinableBadge(count: number): string | null {
  if (count <= 0) return null;
  if (count >= 9) return '9+';
  return String(count);
}
