import { JoinStatus, ParticipationStatus, type JoinDetailDto } from '@jjoin/types';

export type JoinDetailPrimaryCta = {
  label: string;
  disabled: boolean;
};

export function resolveJoinDetailPrimaryCta(params: {
  detail: JoinDetailDto;
  isHost: boolean;
  canLeave: boolean;
  now?: Date;
}): JoinDetailPrimaryCta {
  const { detail, isHost, canLeave } = params;
  const now = params.now ?? new Date();

  if (isHost) {
    return { label: '조인 관리', disabled: true };
  }

  if (detail.status === JoinStatus.CANCELLED) {
    return { label: '취소된 조인', disabled: true };
  }

  if (detail.status === JoinStatus.COMPLETED) {
    return { label: '마감된 조인', disabled: true };
  }

  const ended =
    new Date(detail.scheduledEndAt).getTime() <= now.getTime() ||
    detail.status === JoinStatus.SETTLING;

  if (ended) {
    return { label: '마감된 조인', disabled: true };
  }

  if (detail.myParticipation) {
    if (canLeave) {
      return { label: '참가 취소', disabled: false };
    }
    const joined =
      detail.myParticipation.participationStatus === ParticipationStatus.APPROVED ||
      detail.myParticipation.participationStatus === ParticipationStatus.CONFIRMED ||
      detail.myParticipation.participationStatus === ParticipationStatus.COMPLETED;
    if (joined) {
      return { label: '참가 완료', disabled: true };
    }
  }

  if (detail.status === JoinStatus.FULL || detail.availableSlots <= 0) {
    return { label: '모집 완료', disabled: true };
  }

  return { label: '참가 신청', disabled: false };
}
