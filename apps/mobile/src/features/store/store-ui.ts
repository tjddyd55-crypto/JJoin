import { JoinStatus, StoreOwnerRelation, StoreVerificationStatus, type JoinListItemDto } from '@jjoin/types';

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

export type StoreJoinGroups = {
  recruiting: JoinListItemDto[];
  scheduled: JoinListItemDto[];
  ended: JoinListItemDto[];
  cancelled: JoinListItemDto[];
};

export function groupStoreJoins(joins: JoinListItemDto[]): StoreJoinGroups {
  const recruiting: JoinListItemDto[] = [];
  const scheduled: JoinListItemDto[] = [];
  const ended: JoinListItemDto[] = [];
  const cancelled: JoinListItemDto[] = [];

  for (const join of joins) {
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
        ended.push(join);
        break;
      default:
        ended.push(join);
    }
  }

  return { recruiting, scheduled, ended, cancelled };
}

export function canSubmitStoreVerification(status: StoreVerificationStatus | null): boolean {
  return (
    status === null ||
    status === StoreVerificationStatus.REJECTED ||
    status === StoreVerificationStatus.CANCELLED ||
    status === StoreVerificationStatus.REVOKED
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
