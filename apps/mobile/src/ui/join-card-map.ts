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
    title: item.venueName,
    timeLabel: formatJoinListTime(item.startAt),
    distanceLabel:
      item.distanceMeters != null
        ? `${(item.distanceMeters / 1000).toFixed(1)}km`
        : null,
    participantLabel: item.seatsLeft <= 0 ? '마감' : `${item.seatsLeft}자리 남음`,
    seatsLeft: item.seatsLeft,
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
    title: item.venueName,
    timeLabel: formatJoinListTime(item.startAt),
    regionLabel: formatJoinRegionLabel(item.regionLabel, item.sigungu),
    distanceLabel,
    participantLabel: `${item.currentParticipants}/${item.maxParticipants}명`,
    seatsLeft: item.availableSlots,
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
    title: item.venueName,
    timeLabel: formatJoinListTime(item.startAt),
    participantLabel: `${item.confirmedPlayerCount}/${item.plannedPlayerCount}명`,
    seatsLeft: item.availableSlots,
    hostNickname: item.hostNickname,
    hostAvatarUrl: item.hostAvatarUrl,
    rewardLabel: formatSignedCoin(item.rewardPerParticipant),
    statusBadge: options?.statusBadge ?? null,
    isUrgent: item.isUrgent,
    onPress,
  };
}
