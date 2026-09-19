import { JoinStatus } from '@jjoin/types';
import type { JoinCardStatusBadge, JoinStatusBadgeTone } from '@jjoin/design-system';

export function resolveJoinListStatusBadges(input: {
  status: JoinStatus | string;
  sportCode?: string | null;
  venueType?: 'SCREEN' | 'FIELD' | null;
  isUrgent?: boolean;
  seatsLeft?: number;
  scheduledEndAt?: string;
  now?: Date;
  extraLabel?: string | null;
}): JoinCardStatusBadge[] {
  const badges: JoinCardStatusBadge[] = [];
  const now = input.now ?? new Date();

  if (input.venueType === 'FIELD') {
    badges.push({ label: '필드', tone: 'neutral' });
  } else if (input.sportCode === 'SCREEN_GOLF' || input.sportCode === 'SCREEN') {
    badges.push({ label: '스크린', tone: 'neutral' });
  }

  if (input.isUrgent) {
    badges.push({ label: '긴급 모집', tone: 'urgent' });
  }

  if (input.extraLabel?.trim()) {
    badges.push({ label: input.extraLabel.trim(), tone: mapExtraLabelTone(input.extraLabel) });
    return badges.slice(0, 3);
  }

  if (input.status === JoinStatus.CANCELLED) {
    badges.push({ label: '취소', tone: 'closed' });
    return badges;
  }
  if (input.status === JoinStatus.COMPLETED) {
    badges.push({ label: '완료', tone: 'closed' });
    return badges;
  }

  const ended =
    input.scheduledEndAt != null && new Date(input.scheduledEndAt).getTime() <= now.getTime();
  if (ended || input.status === JoinStatus.SETTLING) {
    badges.push({ label: '종료', tone: 'closed' });
    return badges;
  }

  if (input.status === JoinStatus.IN_PROGRESS) {
    badges.push({ label: '진행 중', tone: 'open' });
    return badges;
  }

  if (input.status === JoinStatus.FULL || (input.seatsLeft != null && input.seatsLeft <= 0)) {
    badges.push({ label: '모집 완료', tone: 'full' });
    return badges;
  }

  if (input.seatsLeft === 1) {
    badges.push({ label: '마감 임박', tone: 'urgent' });
  }

  if (
    input.status === JoinStatus.OPEN ||
    input.status === JoinStatus.CONFIRMED ||
    input.status === JoinStatus.DRAFT
  ) {
    badges.push({ label: '모집 중', tone: 'open' });
  }

  return badges;
}

function mapExtraLabelTone(label: string): JoinStatusBadgeTone {
  if (label.includes('긴급') || label.includes('임박')) return 'urgent';
  if (label.includes('마감') || label.includes('완료')) return 'full';
  if (label.includes('진행')) return 'open';
  return 'neutral';
}
