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
