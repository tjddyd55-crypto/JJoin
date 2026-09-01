import {
  ClubMembershipRole,
  ClubMembershipStatus,
  type ClubEventAttendanceResponse,
  type ClubEventAttendanceFinal,
} from '@jjoin/types';

export type ClubMembershipContext = {
  role: ClubMembershipRole | string;
  status: ClubMembershipStatus | string;
};

export function isActiveClubMember(membership: ClubMembershipContext | null | undefined): boolean {
  return membership?.status === ClubMembershipStatus.ACTIVE;
}

export function isClubStaff(membership: ClubMembershipContext | null | undefined): boolean {
  if (!isActiveClubMember(membership)) return false;
  return (
    membership!.role === ClubMembershipRole.OWNER || membership!.role === ClubMembershipRole.MANAGER
  );
}

export function canManageClubEvents(membership: ClubMembershipContext | null | undefined): boolean {
  return isClubStaff(membership);
}

export function canManageClubAccounting(
  membership: ClubMembershipContext | null | undefined,
): boolean {
  return isClubStaff(membership);
}

export function canManageClubNotices(membership: ClubMembershipContext | null | undefined): boolean {
  return isClubStaff(membership);
}

export function canManageClubProfile(membership: ClubMembershipContext | null | undefined): boolean {
  return isClubStaff(membership);
}

export function canApproveClubMembership(
  membership: ClubMembershipContext | null | undefined,
): boolean {
  return isClubStaff(membership);
}

export function canLeaveClub(membership: ClubMembershipContext | null | undefined): boolean {
  if (!isActiveClubMember(membership)) return false;
  return membership!.role !== ClubMembershipRole.OWNER;
}

export function canRespondToClubEventAttendance(
  membership: ClubMembershipContext | null | undefined,
): boolean {
  return isActiveClubMember(membership);
}

export function canFinalizeClubEventAttendance(
  membership: ClubMembershipContext | null | undefined,
): boolean {
  return isClubStaff(membership);
}

export type AttendanceResponseCounts = {
  attending: number;
  declined: number;
  maybe: number;
  noResponse: number;
  attended: number;
  noShow: number;
};

export type AttendanceRateInput = {
  attendedCount: number;
  denominatorCount: number;
};

/** Returns percentage 0-100 or null when denominator is zero. */
export function computeClubAttendanceRate(input: AttendanceRateInput): number | null {
  if (input.denominatorCount <= 0) return null;
  return Math.round((input.attendedCount / input.denominatorCount) * 100);
}

export function formatAttendanceRateDisplay(rate: number | null | undefined): string {
  if (rate == null) return '-';
  return `${rate}%`;
}

export type EventAttendanceRow = {
  response: ClubEventAttendanceResponse | string;
  finalStatus?: ClubEventAttendanceFinal | string | null;
};

export function countAttendanceResponses(rows: EventAttendanceRow[]): AttendanceResponseCounts {
  const counts: AttendanceResponseCounts = {
    attending: 0,
    declined: 0,
    maybe: 0,
    noResponse: 0,
    attended: 0,
    noShow: 0,
  };
  for (const row of rows) {
    switch (row.response) {
      case 'ATTENDING':
        counts.attending += 1;
        break;
      case 'DECLINED':
        counts.declined += 1;
        break;
      case 'MAYBE':
        counts.maybe += 1;
        break;
      default:
        counts.noResponse += 1;
        break;
    }
    if (row.finalStatus === 'ATTENDED') counts.attended += 1;
    if (row.finalStatus === 'NO_SHOW') counts.noShow += 1;
  }
  return counts;
}

/**
 * MVP denominator: members who responded ATTENDING or MAYBE, plus finalized ATTENDED/NO_SHOW.
 * Excludes pure NO_RESPONSE and DECLINED from denominator unless finalized.
 */
export function computeEventAttendanceDenominator(rows: EventAttendanceRow[]): number {
  return rows.filter((row) => {
    if (row.finalStatus === 'ATTENDED' || row.finalStatus === 'NO_SHOW') return true;
    return row.response === 'ATTENDING' || row.response === 'MAYBE';
  }).length;
}

export function computeEventAttendedCount(rows: EventAttendanceRow[]): number {
  return rows.filter((row) => row.finalStatus === 'ATTENDED').length;
}

export function computeRemainingEventCapacity(capacity: number | null | undefined, attendingCount: number): number | null {
  if (capacity == null || capacity <= 0) return null;
  return Math.max(capacity - attendingCount, 0);
}

/** Occupied seats = internal ATTENDING responses + external approved join participants. */
export function computeEventOccupiedSeats(input: {
  memberAttendingCount: number;
  externalParticipantCount: number;
}): number {
  return Math.max(0, input.memberAttendingCount) + Math.max(0, input.externalParticipantCount);
}

/** SSOT remaining capacity for club events (home, detail, urgent CTA, join link). */
export function computeClubEventRemainingCapacity(
  capacity: number | null | undefined,
  memberAttendingCount: number,
  externalParticipantCount = 0,
): number | null {
  if (capacity == null || capacity <= 0) return null;
  const occupied = computeEventOccupiedSeats({ memberAttendingCount, externalParticipantCount });
  return Math.max(capacity - occupied, 0);
}

export const ACTIVE_CLUB_EVENT_STATUSES = new Set(['OPEN', 'SCHEDULED', 'IN_PROGRESS']);

export function isActiveClubEventStatus(status: string): boolean {
  return ACTIVE_CLUB_EVENT_STATUSES.has(status);
}

export function clubAgeGroupLabel(group: string | null | undefined): string | null {
  switch (group) {
    case 'TWENTIES':
      return '20대';
    case 'THIRTIES':
      return '30대';
    case 'FORTIES':
      return '40대';
    case 'FIFTIES':
      return '50대';
    case 'SIXTIES_PLUS':
      return '60대+';
    default:
      return null;
  }
}

export function clubActivityTypeLabel(type: string | null | undefined): string | null {
  switch (type) {
    case 'SCREEN':
      return '스크린';
    case 'FIELD':
      return '필드';
    case 'SCREEN_AND_FIELD':
      return '스크린 + 필드';
    default:
      return null;
  }
}

export function canPromoteClubManager(actor: ClubMembershipContext | null | undefined): boolean {
  return isActiveClubMember(actor) && actor!.role === ClubMembershipRole.OWNER;
}

export function canChangeMemberRole(
  actor: ClubMembershipContext | null | undefined,
  target: ClubMembershipContext | null | undefined,
): boolean {
  if (!canPromoteClubManager(actor) || !target || !isActiveClubMember(target)) return false;
  if (target.role === ClubMembershipRole.OWNER) return false;
  return true;
}

export function attendanceResponseDeadlinePassed(deadline: Date, now = new Date()): boolean {
  return now.getTime() > deadline.getTime();
}

export function canMemberUpdateAttendanceResponse(
  membership: ClubMembershipContext | null | undefined,
  responseDeadline: Date,
  now = new Date(),
  staffOverride = false,
): boolean {
  if (!canRespondToClubEventAttendance(membership)) return false;
  if (staffOverride && isClubStaff(membership)) return true;
  return !attendanceResponseDeadlinePassed(responseDeadline, now);
}

export type MemberAttendanceSummary = {
  targetEvents: number;
  attended: number;
  declined: number;
  noResponse: number;
  noShow: number;
  averageAttendanceRate: number | null;
};

export function summarizeMemberAttendanceRows(
  rows: Array<{
    response: string;
    finalStatus?: string | null;
  }>,
): MemberAttendanceSummary {
  let attended = 0;
  let declined = 0;
  let noResponse = 0;
  let noShow = 0;
  let denom = 0;

  for (const row of rows) {
    if (row.finalStatus === 'ATTENDED') {
      attended += 1;
      denom += 1;
      continue;
    }
    if (row.finalStatus === 'NO_SHOW') {
      noShow += 1;
      denom += 1;
      continue;
    }
    if (row.response === 'DECLINED') {
      declined += 1;
      continue;
    }
    if (row.response === 'ATTENDING' || row.response === 'MAYBE') {
      denom += 1;
      continue;
    }
    noResponse += 1;
  }

  return {
    targetEvents: rows.length,
    attended,
    declined,
    noResponse,
    noShow,
    averageAttendanceRate: computeClubAttendanceRate({ attendedCount: attended, denominatorCount: denom }),
  };
}
