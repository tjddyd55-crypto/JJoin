import {
  addCalendarDays,
  computeJoinDdayLabel,
  formatFieldExpectedCostLabel,
  formatSignedCoin,
  localDayKey,
  type JoinDdayLabel,
} from '@jjoin/domain';
import { JoinStatus } from '@jjoin/types';
import type { JoinCardProps } from '@jjoin/design-system';
import { resolveJoinListStatusBadges } from './join-list-status-badges';

export { resolveJoinListStatusBadges } from './join-list-status-badges';

const TZ = 'Asia/Seoul';

export function formatJoinDisplayTitle(title: string): string {
  const isDev = typeof __DEV__ !== 'undefined' && __DEV__;
  if (!isDev) return title;
  const trimmed = title.trim();
  if (/^QA-Role-Coin/i.test(trimmed)) return '거제 오션뷰 스크린';
  if (/^DEV\s*E2E/i.test(trimmed)) return '퇴근 후 저녁 라운드';
  if (/^\[QA-/i.test(trimmed)) return '주말 저녁 스크린 라운드';
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
  const n = Number(amount);
  if (!Number.isFinite(n) || n <= 0) return null;
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

export function buildJoinCardRewardLabel(amount: string | number | null | undefined): string | null {
  const n = Number(amount);
  if (!Number.isFinite(n) || n <= 0) return null;
  return formatSignedCoin(amount);
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
    expectedCostKrw?: number | null;
    isUrgent?: boolean;
    sportCode?: string | null;
    venueType?: 'SCREEN' | 'FIELD' | null;
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
      venueType: input.venueType,
      isUrgent: input.isUrgent,
      seatsLeft: input.seatsLeft,
      scheduledEndAt: input.scheduledEndAt,
      now: options?.now,
      extraLabel: options?.statusBadge,
    }),
    hostNickname: input.hostNickname,
    hostAvatarUrl: input.hostAvatarUrl,
    rewardLabel: buildJoinCardRewardLabel(input.rewardPerParticipant),
    costLabel: formatFieldExpectedCostLabel(input.expectedCostKrw),
    isUrgent: input.isUrgent,
  };
}
