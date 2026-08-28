import {
  ENTITLEMENT_ROOM_CREATION_FEE_WAIVER,
  hasEntitlement,
  type ResolvedMembership,
} from '@jjoin/domain';
import type { UserMembershipDto } from '@jjoin/types';

/** Official mobile membership view model — maps server DTO only; no client plan invent. */
export type MobileMembership = {
  effectivePlan: 'FREE' | 'PREMIUM';
  subscriptionStatus: UserMembershipDto['status'];
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  entitlements: string[];
  hasRoomCreationFeeWaiver: boolean;
  subscriptionId: string | null;
};

export function mapUserMembershipDto(dto: UserMembershipDto): MobileMembership {
  return {
    effectivePlan: dto.planCode,
    subscriptionStatus: dto.status,
    currentPeriodStart: dto.currentPeriodStart,
    currentPeriodEnd: dto.currentPeriodEnd,
    cancelAtPeriodEnd: dto.cancelAtPeriodEnd,
    entitlements: [...dto.entitlements],
    hasRoomCreationFeeWaiver: dto.entitlements.includes(ENTITLEMENT_ROOM_CREATION_FEE_WAIVER),
    subscriptionId: dto.subscriptionId,
  };
}

/** Domain ResolvedMembership → mobile view (tests / offline helpers). */
export function mapResolvedMembership(resolved: ResolvedMembership): MobileMembership {
  return {
    effectivePlan: resolved.effectivePlanCode,
    subscriptionStatus: resolved.subscriptionStatus,
    currentPeriodStart: resolved.currentPeriodStart,
    currentPeriodEnd: resolved.currentPeriodEnd,
    cancelAtPeriodEnd: resolved.cancelAtPeriodEnd,
    entitlements: [...resolved.entitlements],
    hasRoomCreationFeeWaiver: hasEntitlement(resolved, ENTITLEMENT_ROOM_CREATION_FEE_WAIVER),
    subscriptionId: resolved.subscriptionId,
  };
}

export function formatMembershipPeriodEnd(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}.${m}.${day}`;
}

export type MembershipPresentation = {
  planBadgeLabel: string;
  planBadgeVariant: 'neutral' | 'gold';
  summaryTitle: string;
  benefitLines: string[];
  periodLine: string | null;
  cancelNotice: string | null;
  settingsSubtitle: string;
};

export function presentMembership(m: MobileMembership): MembershipPresentation {
  const period = formatMembershipPeriodEnd(m.currentPeriodEnd);

  if (m.effectivePlan === 'PREMIUM') {
    const benefitLines = m.hasRoomCreationFeeWaiver
      ? ['조인 생성 이용료 면제']
      : [];
    return {
      planBadgeLabel: '프리미엄',
      planBadgeVariant: 'gold',
      summaryTitle: '프리미엄 회원',
      benefitLines,
      periodLine: period ? `${period}까지` : null,
      cancelNotice: m.cancelAtPeriodEnd
        ? '이용기간 종료 후 일반 회원으로 전환됩니다.'
        : null,
      settingsSubtitle: period ? `프리미엄 · ${period}까지` : '프리미엄 회원',
    };
  }

  return {
    planBadgeLabel: '일반',
    planBadgeVariant: 'neutral',
    summaryTitle: '일반 회원',
    benefitLines: [],
    periodLine: null,
    cancelNotice: null,
    settingsSubtitle: '일반 회원',
  };
}
