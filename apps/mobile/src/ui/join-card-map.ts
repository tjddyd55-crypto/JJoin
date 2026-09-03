import {
  RECOMMEND_REASON_SHORT_LABEL_KO,
  formatSignedCoin,
  localDayKey,
  type RecommendReasonCode,
} from '@jjoin/domain';
import type { DiscoverJoinCardDto, JoinListItemDto, RecommendedJoinDto } from '@jjoin/types';
import type { JoinCardProps } from '@jjoin/design-system';

export function formatJoinListTime(startAt: string, now = new Date()): string {
  const isToday = localDayKey(startAt) === localDayKey(now);
  const time = new Date(startAt).toLocaleString('ko-KR', {
    timeZone: 'Asia/Seoul',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  if (isToday) return `오늘 ${time}`;
  const date = new Date(startAt).toLocaleString('ko-KR', {
    timeZone: 'Asia/Seoul',
    month: '2-digit',
    day: '2-digit',
  });
  return `${date} ${time}`;
}

export function formatJoinRegionLabel(
  regionLabel: string | null | undefined,
  sigungu?: string | null,
) {
  return sigungu ?? regionLabel ?? '지역 미정';
}

/** DEV visual QA — does not alter API/DB titles in production. */
export function formatJoinDisplayTitle(title: string): string {
  if (!__DEV__) return title;
  const trimmed = title.trim();
  if (/^QA-Role-Coin/i.test(trimmed)) return '거제 오션뷰 스크린';
  if (/^DEV\s*E2E/i.test(trimmed)) return '퇴근 후 저녁 라운드';
  if (/^QA[-_]/i.test(trimmed)) return '주말 오전 함께 쳐요';
  if (trimmed.length > 28 && /^[A-Za-z0-9_-]+$/.test(trimmed)) return '거제 스크린 라운딩';
  return title;
}

export function formatJoinParticipantDisplay(options: {
  current?: number;
  max?: number;
  seatsLeft?: number;
}): string {
  const { current, max, seatsLeft } = options;
  const hasCount = current != null && max != null;
  const countPart = hasCount ? `${current}/${max}명` : null;
  const seatPart =
    seatsLeft != null
      ? seatsLeft <= 0
        ? '마감'
        : `${seatsLeft}자리 남음`
      : null;

  if (countPart && seatPart) return `${countPart} · ${seatPart}`;
  return seatPart ?? countPart ?? '';
}

export function recommendShortReasonLabels(item: RecommendedJoinDto): string[] {
  const codes: RecommendReasonCode[] = item.reasons?.length
    ? item.reasons.map((r) => r.code)
    : [item.reasonCode];
  return codes.slice(0, 2).map((code) => RECOMMEND_REASON_SHORT_LABEL_KO[code]);
}

export function mapRecommendedToJoinCardProps(
  item: RecommendedJoinDto,
  onPress: () => void,
): JoinCardProps {
  return {
    title: formatJoinDisplayTitle(item.venueName),
    timeLabel: formatJoinListTime(item.startAt),
    distanceLabel:
      item.distanceMeters != null
        ? `${(item.distanceMeters / 1000).toFixed(1)}km`
        : null,
    participantLabel: formatJoinParticipantDisplay({ seatsLeft: item.seatsLeft }),
    hostNickname: item.hostNickname,
    hostAvatarUrl: item.hostAvatarUrl,
    reasonTags: recommendShortReasonLabels(item),
    isUrgent: item.isUrgent,
    onPress,
  };
}

export function mapDiscoverToJoinCardProps(
  item: DiscoverJoinCardDto,
  onPress: () => void,
  options?: { statusBadge?: string | null },
): JoinCardProps {
  const distanceLabel =
    item.distanceMeters != null
      ? `${(item.distanceMeters / 1000).toFixed(1)}km`
      : null;

  return {
    title: formatJoinDisplayTitle(item.venueName),
    timeLabel: formatJoinListTime(item.startAt),
    regionLabel: formatJoinRegionLabel(item.regionLabel, item.sigungu),
    distanceLabel,
    participantLabel: formatJoinParticipantDisplay({
      current: item.currentParticipants,
      max: item.maxParticipants,
      seatsLeft: item.availableSlots,
    }),
    hostNickname: item.hostNickname,
    hostAvatarUrl: item.hostAvatarUrl,
    rewardLabel: formatSignedCoin(item.rewardPerParticipant),
    statusBadge: options?.statusBadge ?? null,
    onPress,
  };
}

export function mapJoinListItemToJoinCardProps(
  item: JoinListItemDto,
  onPress: () => void,
  options?: { statusBadge?: string | null },
): JoinCardProps {
  return {
    title: formatJoinDisplayTitle(item.venueName),
    timeLabel: formatJoinListTime(item.startAt),
    participantLabel: formatJoinParticipantDisplay({
      current: item.confirmedPlayerCount,
      max: item.plannedPlayerCount,
      seatsLeft: item.availableSlots,
    }),
    hostNickname: item.hostNickname,
    hostAvatarUrl: item.hostAvatarUrl,
    rewardLabel: formatSignedCoin(item.rewardPerParticipant),
    statusBadge: options?.statusBadge ?? null,
    isUrgent: item.isUrgent,
    onPress,
  };
}
