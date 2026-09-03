import {
  addCalendarDays,
  computeJoinDdayLabel,
  formatSignedCoin,
  localDayKey,
  type JoinDdayLabel,
} from '@jjoin/domain';
import { JoinStatus } from '@jjoin/types';
import type { JoinCardProps, JoinCardStatusBadge, JoinStatusBadgeTone } from '@jjoin/design-system';

const TZ = 'Asia/Seoul';

export function formatJoinDisplayTitle(title: string): string {
  const isDev = typeof __DEV__ !== 'undefined' && __DEV__;
  if (!isDev) return title;
  const trimmed = title.trim();
  if (/^QA-Role-Coin/i.test(trimmed)) return '거제 오션뷰 스크린';
  if (/^DEV\s*E2E/i.test(trimmed)) return '퇴근 후 저녁 라운드';
  if (/^QA[-_]/i.test(trimmed)) return '주말 오전 함께 쳐요';
  if (trimmed.length > 28 && /^[A-Za-z0-9_-]+$/.test(trimmed)) return '거제 스크린 라운딩';
  return title;
}

export function formatJoinScheduleListLabel(startAt: string, now = new Date()): string {
  const startKey = localDayKey(startAt, TZ);
  const todayKey = localDayKey(now, TZ);
  const timePart = new Intl.DateTimeFormat('ko-KR', {
    timeZone: TZ,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(startAt));

  if (startKey === todayKey) return `오늘 · ${timePart}`;

  const tomorrowKey = addCalendarDays(todayKey, 1);
  if (startKey === tomorrowKey) return `내일 · ${timePart}`;

  const date = new Date(startAt);
  const month = new Intl.DateTimeFormat('ko-KR', { timeZone: TZ, month: '2-digit' }).format(date);
  const day = new Intl.DateTimeFormat('ko-KR', { timeZone: TZ, day: '2-digit' }).format(date);
  const weekday = new Intl.DateTimeFormat('ko-KR', { timeZone: TZ, weekday: 'short' }).format(date);
  return `${month}.${day}(${weekday}) · ${timePart}`;
}

export function formatJoinScheduleDetailDate(startAt: string): string {
  const date = new Date(startAt);
  const datePart = new Intl.DateTimeFormat('ko-KR', {
    timeZone: TZ,
    month: 'long',
    day: 'numeric',
  }).format(date);
  const weekday = new Intl.DateTimeFormat('ko-KR', {
    timeZone: TZ,
    weekday: 'short',
  }).format(date);
  return `${datePart} (${weekday})`;
}

export function formatJoinCapacityTileValue(current: number, max: number): string {
  return `${current} / ${max}명`;
}

export function formatJoinRewardTileValue(amount: string | number | null | undefined): string | null {
  const label = formatSignedCoin(amount);
  if (!label) return null;
  return label.startsWith('+') || label.startsWith('-') ? label : `+${label}`;
}

export function resolveJoinDisplayTitle(venueName: string, title?: string | null): string {
  return formatJoinDisplayTitle((title?.trim() || venueName).trim());
}

export function formatJoinScheduleDetailTime(startAt: string): string {
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: TZ,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(startAt));
}

export function formatJoinVenueSubLabel(
  sigungu?: string | null,
  regionLabel?: string | null,
  distanceMeters?: number | null,
): string | null {
  const parts: string[] = [];
  const region = sigungu?.trim() || regionLabel?.trim();
  if (region) parts.push(region);
  if (distanceMeters != null && Number.isFinite(distanceMeters)) {
    parts.push(`${(distanceMeters / 1000).toFixed(1)}km`);
  }
  return parts.length > 0 ? parts.join(' · ') : null;
}

export type JoinCapacityParts = {
  countLabel: string;
  seatsHighlight: string | null;
  seatsHighlightTone: 'available' | 'lastSeat' | 'full';
};

export function splitJoinCapacityDisplay(options: {
  current?: number;
  max?: number;
  seatsLeft?: number;
}): JoinCapacityParts {
  const { current, max, seatsLeft } = options;
  const hasCount = current != null && max != null;
  const countLabel = hasCount ? `${current}/${max}명` : '';

  if (seatsLeft == null) {
    return {
      countLabel,
      seatsHighlight: null,
      seatsHighlightTone: 'available',
    };
  }

  if (seatsLeft <= 0) {
    return {
      countLabel,
      seatsHighlight: '마감',
      seatsHighlightTone: 'full',
    };
  }

  return {
    countLabel,
    seatsHighlight: `${seatsLeft}자리 남음`,
    seatsHighlightTone: seatsLeft === 1 ? 'lastSeat' : 'available',
  };
}

/** @deprecated Prefer splitJoinCapacityDisplay — kept for legacy one-line labels. */
export function formatJoinParticipantDisplay(options: {
  current?: number;
  max?: number;
  seatsLeft?: number;
}): string {
  const parts = splitJoinCapacityDisplay(options);
  if (parts.countLabel && parts.seatsHighlight) {
    return `${parts.countLabel} · ${parts.seatsHighlight}`;
  }
  return parts.seatsHighlight ?? parts.countLabel ?? '';
}

export function resolveJoinDdayForCard(input: {
  startAt: string;
  status: JoinStatus | string;
  scheduledEndAt?: string;
  now?: Date;
}): JoinDdayLabel | null {
  return computeJoinDdayLabel({
    startAt: input.startAt,
    status: input.status,
    now: input.now,
    timeZone: TZ,
  });
}

export function resolveJoinListStatusBadges(input: {
  status: JoinStatus | string;
  sportCode?: string | null;
  isUrgent?: boolean;
  seatsLeft?: number;
  scheduledEndAt?: string;
  now?: Date;
  extraLabel?: string | null;
}): JoinCardStatusBadge[] {
  const badges: JoinCardStatusBadge[] = [];
  const now = input.now ?? new Date();

  if (input.sportCode === 'SCREEN_GOLF' || input.sportCode === 'SCREEN') {
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

export function buildJoinCardRewardLabel(amount: string | number | null | undefined): string | null {
  const label = formatSignedCoin(amount);
  return label ?? null;
}

export type JoinCardMapperOptions = {
  variant?: JoinCardProps['variant'];
  statusBadge?: string | null;
  now?: Date;
};

export function baseJoinCardFields(
  input: {
    startAt: string;
    status: JoinStatus | string;
    scheduledEndAt?: string;
    venueName: string;
    sigungu?: string | null;
    regionLabel?: string | null;
    distanceMeters?: number | null;
    current?: number;
    max?: number;
    seatsLeft?: number;
    hostNickname?: string | null;
    hostAvatarUrl?: string | null;
    rewardPerParticipant?: string | null;
    isUrgent?: boolean;
    sportCode?: string | null;
    title?: string | null;
  },
  options?: JoinCardMapperOptions,
): Omit<JoinCardProps, 'onPress'> {
  const capacity = splitJoinCapacityDisplay({
    current: input.current,
    max: input.max,
    seatsLeft: input.seatsLeft,
  });
  const dday = resolveJoinDdayForCard({
    startAt: input.startAt,
    status: input.status,
    scheduledEndAt: input.scheduledEndAt,
    now: options?.now,
  });

  const displayTitle = resolveJoinDisplayTitle(input.venueName, input.title);

  return {
    variant: options?.variant,
    title: displayTitle,
    venueName: input.venueName.trim(),
    venueSubLabel: formatJoinVenueSubLabel(
      input.sigungu,
      input.regionLabel,
      input.distanceMeters,
    ),
    scheduleLabel: formatJoinScheduleListLabel(input.startAt, options?.now),
    countLabel: capacity.countLabel,
    seatsHighlight: capacity.seatsHighlight,
    seatsHighlightTone: capacity.seatsHighlightTone,
    ddayLabel: dday?.label ?? null,
    statusBadges: resolveJoinListStatusBadges({
      status: input.status,
      sportCode: input.sportCode,
      isUrgent: input.isUrgent,
      seatsLeft: input.seatsLeft,
      scheduledEndAt: input.scheduledEndAt,
      now: options?.now,
      extraLabel: options?.statusBadge,
    }),
    hostNickname: input.hostNickname,
    hostAvatarUrl: input.hostAvatarUrl,
    rewardLabel: buildJoinCardRewardLabel(input.rewardPerParticipant),
    isUrgent: input.isUrgent,
  };
}
