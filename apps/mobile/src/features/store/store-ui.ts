import {
  JoinStatus,
  StoreOwnerRelation,
  StoreVerificationStatus,
  type JoinListItemDto,
} from '@jjoin/types';
import { formatCoinWithLabel } from '@jjoin/domain';
import {
  isStoreMatchingJoin,
  matchingDisplayStatusLabel,
  matchingDisplaySubtitle,
  matchingOwnerListPriority,
} from './matching-join-ui';

export const RELATION_LABELS: Record<StoreOwnerRelation, string> = {
  [StoreOwnerRelation.REPRESENTATIVE]: '대표',
  [StoreOwnerRelation.OWNER]: '점주',
  [StoreOwnerRelation.MANAGER]: '매니저',
  [StoreOwnerRelation.OTHER]: '기타',
};

export const VERIFICATION_STATUS_LABELS: Record<StoreVerificationStatus, string> = {
  [StoreVerificationStatus.PENDING]: '심사 중',
  [StoreVerificationStatus.APPROVED]: '승인됨',
  [StoreVerificationStatus.REJECTED]: '거절됨',
  [StoreVerificationStatus.CANCELLED]: '취소됨',
  [StoreVerificationStatus.REVOKED]: '철회됨',
};

export type GenderPreset = {
  label: string;
  targetMaleCount: number;
  targetFemaleCount: number;
};

export const GENDER_PRESETS: GenderPreset[] = [
  { label: '남2여2', targetMaleCount: 2, targetFemaleCount: 2 },
  { label: '남3여1', targetMaleCount: 3, targetFemaleCount: 1 },
  { label: '남1여3', targetMaleCount: 1, targetFemaleCount: 3 },
  { label: '무관4', targetMaleCount: 2, targetFemaleCount: 2 },
];

export type StoreJoinListFilter = 'ALL' | 'ACTIVE' | 'RECRUITING' | 'DONE';

export type StoreJoinGroups = {
  attendancePending: JoinListItemDto[];
  inProgress: JoinListItemDto[];
  scheduled: JoinListItemDto[];
  recruiting: JoinListItemDto[];
  ended: JoinListItemDto[];
  cancelled: JoinListItemDto[];
};

function sortByOwnerPriority(items: JoinListItemDto[]): JoinListItemDto[] {
  return [...items].sort((a, b) => {
    const pa = matchingOwnerListPriority(a);
    const pb = matchingOwnerListPriority(b);
    if (pa !== pb) return pa - pb;
    return new Date(a.startAt).getTime() - new Date(b.startAt).getTime();
  });
}

export function groupStoreJoins(joins: JoinListItemDto[]): StoreJoinGroups {
  const attendancePending: JoinListItemDto[] = [];
  const inProgress: JoinListItemDto[] = [];
  const scheduled: JoinListItemDto[] = [];
  const recruiting: JoinListItemDto[] = [];
  const ended: JoinListItemDto[] = [];
  const cancelled: JoinListItemDto[] = [];

  for (const join of joins) {
    if (isStoreMatchingJoin(join) && join.displayStatus) {
      switch (join.displayStatus) {
        case 'ATTENDANCE_PENDING':
          attendancePending.push(join);
          break;
        case 'IN_PROGRESS':
          inProgress.push(join);
          break;
        case 'CONFIRMED':
          scheduled.push(join);
          break;
        case 'RECRUITING':
        case 'MINIMUM_SECURED':
          recruiting.push(join);
          break;
        case 'COMPLETED':
          ended.push(join);
          break;
        case 'CANCELLED_INSUFFICIENT':
        case 'CANCELLED':
          cancelled.push(join);
          break;
        default:
          ended.push(join);
      }
      continue;
    }

    switch (join.status) {
      case JoinStatus.CANCELLED:
        cancelled.push(join);
        break;
      case JoinStatus.CONFIRMED:
        scheduled.push(join);
        break;
      case JoinStatus.OPEN:
      case JoinStatus.FULL:
      case JoinStatus.DRAFT:
        recruiting.push(join);
        break;
      case JoinStatus.COMPLETED:
      case JoinStatus.SETTLING:
      case JoinStatus.IN_PROGRESS:
        if (join.status === JoinStatus.IN_PROGRESS) inProgress.push(join);
        else ended.push(join);
        break;
      default:
        ended.push(join);
    }
  }

  return {
    attendancePending: sortByOwnerPriority(attendancePending),
    inProgress: sortByOwnerPriority(inProgress),
    scheduled: sortByOwnerPriority(scheduled),
    recruiting: sortByOwnerPriority(recruiting),
    ended: sortByOwnerPriority(ended),
    cancelled: sortByOwnerPriority(cancelled),
  };
}

export function filterStoreJoins(
  joins: JoinListItemDto[],
  filter: StoreJoinListFilter,
): JoinListItemDto[] {
  if (filter === 'ALL') return sortByOwnerPriority(joins);
  return sortByOwnerPriority(
    joins.filter((join) => {
      const status = join.displayStatus;
      if (filter === 'RECRUITING') {
        return status === 'RECRUITING' || status === 'MINIMUM_SECURED' || (!status && (join.status === JoinStatus.OPEN || join.status === JoinStatus.FULL));
      }
      if (filter === 'ACTIVE') {
        return (
          status === 'ATTENDANCE_PENDING' ||
          status === 'IN_PROGRESS' ||
          status === 'CONFIRMED' ||
          join.status === JoinStatus.CONFIRMED ||
          join.status === JoinStatus.IN_PROGRESS
        );
      }
      // DONE
      return (
        status === 'COMPLETED' ||
        status === 'CANCELLED' ||
        status === 'CANCELLED_INSUFFICIENT' ||
        join.status === JoinStatus.COMPLETED ||
        join.status === JoinStatus.CANCELLED
      );
    }),
  );
}

export function storeJoinCardCaption(item: JoinListItemDto): string {
  const statusLabel = matchingDisplayStatusLabel(item, 'host');
  const subtitle = matchingDisplaySubtitle(item);
  const base = `${item.confirmedPlayerCount}/${item.plannedPlayerCount}명 · ${formatCoinWithLabel(item.rewardPerParticipant)}`;
  if (statusLabel && subtitle) return `${statusLabel} · ${subtitle}`;
  if (statusLabel) return `${statusLabel} · ${base}`;
  if (item.recruitmentLabel) return `${base} · ${item.recruitmentLabel}`;
  return base;
}

export function canSubmitStoreVerification(status: StoreVerificationStatus | null): boolean {
  return (
    status === null ||
    status === StoreVerificationStatus.REJECTED ||
    status === StoreVerificationStatus.CANCELLED ||
    status === StoreVerificationStatus.REVOKED
  );
}

/**
 * Multi-store: allow another facility even if a previous request is APPROVED.
 * Block only when the selected facility already has ACTIVE ownership or PENDING request.
 */
export function canSubmitStoreVerificationForFacility(input: {
  golfFacilityId: string | null | undefined;
  requests: Array<{ golfFacilityId: string; status: StoreVerificationStatus }>;
  ownershipFacilityIds: string[];
}): boolean {
  const facilityId = input.golfFacilityId?.trim();
  if (!facilityId) return true;
  if (input.ownershipFacilityIds.includes(facilityId)) return false;
  return !input.requests.some(
    (r) =>
      r.golfFacilityId === facilityId &&
      r.status === StoreVerificationStatus.PENDING,
  );
}

export function defaultStoreJoinStartAtIso(): string {
  const date = new Date(Date.now() + 24 * 60 * 60_000);
  date.setMinutes(0, 0, 0);
  return date.toISOString();
}

export function defaultRecruitClosesAtIso(startAtIso: string): string {
  const start = new Date(startAtIso);
  const close = new Date(start.getTime() - 60 * 60_000);
  if (close.getTime() <= Date.now()) {
    return new Date(Date.now() + 30 * 60_000).toISOString();
  }
  return close.toISOString();
}
