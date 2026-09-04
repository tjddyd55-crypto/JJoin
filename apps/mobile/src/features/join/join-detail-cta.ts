import { JoinStatus, ParticipationStatus, type JoinDetailDto } from '@jjoin/types';

export type JoinDetailCtaPresentation =
  | 'apply'
  | 'joined'
  | 'leave'
  | 'full'
  | 'closed'
  | 'host'
  | 'cancelled'
  | 'none';

export type JoinDetailPrimaryCta = {
  label: string;
  disabled: boolean;
  presentation: JoinDetailCtaPresentation;
};

export function shouldShowJoinDetailStickyCta(
  presentation: JoinDetailCtaPresentation,
): boolean {
  return presentation !== 'host' && presentation !== 'none';
}

export function resolveJoinDetailPrimaryCta(params: {
  detail: JoinDetailDto;
  isHost: boolean;
  canLeave: boolean;
  now?: Date;
}): JoinDetailPrimaryCta {
  const { detail, isHost, canLeave } = params;
  const now = params.now ?? new Date();

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

  if (detail.myParticipation) {
    if (canLeave) {
      return { label: '참가 취소', disabled: false, presentation: 'leave' };
    }
    const joined =
      detail.myParticipation.participationStatus === ParticipationStatus.APPROVED ||
      detail.myParticipation.participationStatus === ParticipationStatus.CONFIRMED ||
      detail.myParticipation.participationStatus === ParticipationStatus.COMPLETED;
    if (joined) {
      return { label: '참가 완료', disabled: true, presentation: 'joined' };
    }
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
      return 'primary';
    case 'joined':
      return 'successSoft';
    case 'leave':
      return 'leave';
    default:
      return 'muted';
  }
}
