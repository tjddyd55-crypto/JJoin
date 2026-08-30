import { AttendanceIntent } from '@jjoin/types';
import type { BadgeVariant } from '@jjoin/design-system';

export function attendanceIntentLabel(intent: AttendanceIntent | string | null | undefined): string {
  switch (intent) {
    case AttendanceIntent.CONFIRMED:
    case 'CONFIRMED':
      return '참석 확정';
    case AttendanceIntent.DECLINED:
    case 'DECLINED':
      return '참석 어려움';
    case AttendanceIntent.PENDING:
    case 'PENDING':
    default:
      return '미응답';
  }
}

export function attendanceIntentBadgeVariant(
  intent: AttendanceIntent | string | null | undefined,
): BadgeVariant {
  switch (intent) {
    case AttendanceIntent.CONFIRMED:
    case 'CONFIRMED':
      return 'success';
    case AttendanceIntent.DECLINED:
    case 'DECLINED':
      return 'warning';
    default:
      return 'neutral';
  }
}

/** Approved/confirmed participants (non-host) can set pre-game attendance intent. */
export function canSetAttendanceIntent(input: {
  isHost: boolean;
  participationStatus: string | null | undefined;
}): boolean {
  if (input.isHost) return false;
  return (
    input.participationStatus === 'APPROVED' || input.participationStatus === 'CONFIRMED'
  );
}
