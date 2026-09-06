import { JoinStatus, ParticipationStatus, type JoinDetailDto } from '@jjoin/types';

export type JoinDetailCtaPresentation =
  | 'apply'
  | 'joined'
  | 'leave'
  | 'full'
  | 'waitlist'
  | 'waitlisted'
  | 'waitlist_offer'
  | 'closed'
  | 'host'
  | 'cancelled'
  | 'none';

export type JoinDetailPrimaryCta = {
  label: string;
  disabled: boolean;
  presentation: JoinDetailCtaPresentation;
  /** WAITLISTED position from server */
  waitlistPosition?: number | null;
  /** OFFERED expiry ISO */
  offerExpiresAt?: string | null;
};

export function shouldShowJoinDetailStickyCta(
  presentation: JoinDetailCtaPresentation,
): boolean {
  return presentation !== 'host' && presentation !== 'none';
}

export function formatWaitlistOfferCountdown(
  offerExpiresAt: string | null | undefined,
  now: Date = new Date(),
): string | null {
  if (!offerExpiresAt) return null;
  const ms = new Date(offerExpiresAt).getTime() - now.getTime();
  if (ms <= 0) return '만료됨';
  const minutes = Math.max(1, Math.ceil(ms / 60_000));
  return `남은 시간 ${minutes}분`;
}

export function resolveJoinDetailPrimaryCta(params: {
  detail: JoinDetailDto;
  isHost: boolean;
  canLeave: boolean;
  now?: Date;
}): JoinDetailPrimaryCta {
  const { detail, isHost, canLeave } = params;
  const now = params.now ?? new Date();
  const mine = detail.myParticipation;

  if (isHost) {
    return { label: '방장', disabled: true, presentation: 'host' };
  }

  if (detail.status === JoinStatus.CANCELLED) {
    return { label: '취소된 조인', disabled: true, presentation: 'cancelled' };
  }

  if (detail.status === JoinStatus.COMPLETED) {
    return { label: '마감된 조인', disabled: true, presentation: 'closed' };
  }

  const ended =
    new Date(detail.scheduledEndAt).getTime() <= now.getTime() ||
    detail.status === JoinStatus.SETTLING;

  if (ended) {
    return { label: '마감된 조인', disabled: true, presentation: 'closed' };
  }

  if (mine) {
    if (mine.participationStatus === ParticipationStatus.WAITLISTED) {
      const position = mine.waitlistPosition ?? null;
      return {
        label: position ? `대기 ${position}번` : '대기 중',
        disabled: false,
        presentation: 'waitlisted',
        waitlistPosition: position,
      };
    }

    if (mine.participationStatus === ParticipationStatus.OFFERED) {
      const countdown = formatWaitlistOfferCountdown(mine.offerExpiresAt, now);
      return {
        label: countdown ? `자리가 났어요 · ${countdown}` : '자리가 났어요',
        disabled: false,
        presentation: 'waitlist_offer',
        offerExpiresAt: mine.offerExpiresAt ?? null,
      };
    }

    if (canLeave) {
      return { label: '참가 취소', disabled: false, presentation: 'leave' };
    }
    const joined =
      mine.participationStatus === ParticipationStatus.APPROVED ||
      mine.participationStatus === ParticipationStatus.CONFIRMED ||
      mine.participationStatus === ParticipationStatus.COMPLETED;
    if (joined) {
      return { label: '참가 완료', disabled: true, presentation: 'joined' };
    }
  }

  if (detail.waitlistAvailable) {
    return { label: '대기 신청', disabled: false, presentation: 'waitlist' };
  }

  if (detail.status === JoinStatus.FULL || detail.availableSlots <= 0) {
    return { label: '모집 완료', disabled: true, presentation: 'full' };
  }

  return { label: '참가 신청', disabled: false, presentation: 'apply' };
}

export function joinDetailCtaButtonVariant(
  presentation: JoinDetailCtaPresentation,
): 'primary' | 'successSoft' | 'leave' | 'muted' {
  switch (presentation) {
    case 'apply':
    case 'waitlist':
    case 'waitlist_offer':
      return 'primary';
    case 'joined':
      return 'successSoft';
    case 'leave':
    case 'waitlisted':
      return 'leave';
    default:
      return 'muted';
  }
}

export function joinDetailSecondaryCtaLabel(
  presentation: JoinDetailCtaPresentation,
): string | null {
  if (presentation === 'waitlisted' || presentation === 'waitlist_offer') {
    return '대기 취소';
  }
  return null;
}
