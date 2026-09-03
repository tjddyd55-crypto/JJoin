import {
  RECOMMEND_REASON_SHORT_LABEL_KO,
  type RecommendReasonCode,
} from '@jjoin/domain';
import type {
  DiscoverJoinCardDto,
  ExploreJoinPreviewDto,
  JoinListItemDto,
  RecommendedJoinDto,
} from '@jjoin/types';
import type { JoinCardProps } from '@jjoin/design-system';
import {
  baseJoinCardFields,
  formatJoinDisplayTitle,
  type JoinCardMapperOptions,
} from './join-display';

export {
  formatJoinDisplayTitle,
  formatJoinParticipantDisplay,
  formatJoinScheduleListLabel,
  formatJoinVenueSubLabel,
  splitJoinCapacityDisplay,
  resolveJoinDdayForCard,
  resolveJoinListStatusBadges,
} from './join-display';

export function recommendShortReasonLabels(item: RecommendedJoinDto): string[] {
  const codes: RecommendReasonCode[] = item.reasons?.length
    ? item.reasons.map((r) => r.code)
    : [item.reasonCode];
  return codes.slice(0, 2).map((code) => RECOMMEND_REASON_SHORT_LABEL_KO[code]);
}

export function mapRecommendedToJoinCardProps(
  item: RecommendedJoinDto,
  onPress: () => void,
  options?: JoinCardMapperOptions,
): JoinCardProps {
  const base = baseJoinCardFields(
    {
      startAt: item.startAt,
      status: 'OPEN',
      venueName: item.venueName,
      distanceMeters: item.distanceMeters,
      seatsLeft: item.seatsLeft,
      hostNickname: item.hostNickname,
      hostAvatarUrl: item.hostAvatarUrl,
      isUrgent: item.isUrgent,
      title: item.venueName,
    },
    { ...options, variant: options?.variant ?? 'compact' },
  );
  return {
    ...base,
    reasonTags: recommendShortReasonLabels(item),
    onPress,
  };
}

export function mapDiscoverToJoinCardProps(
  item: DiscoverJoinCardDto,
  onPress: () => void,
  options?: JoinCardMapperOptions,
): JoinCardProps {
  return {
    ...baseJoinCardFields(
      {
        startAt: item.startAt,
        status: item.status,
        scheduledEndAt: item.scheduledEndAt,
        venueName: item.venueName,
        sigungu: item.sigungu,
        regionLabel: item.regionLabel,
        distanceMeters: item.distanceMeters,
        current: item.currentParticipants,
        max: item.maxParticipants,
        seatsLeft: item.availableSlots,
        hostNickname: item.hostNickname,
        hostAvatarUrl: item.hostAvatarUrl,
        rewardPerParticipant: item.rewardPerParticipant,
        title: item.venueName,
      },
      { ...options, variant: options?.variant ?? 'default' },
    ),
    onPress,
  };
}

export function mapJoinListItemToJoinCardProps(
  item: JoinListItemDto,
  onPress: () => void,
  options?: JoinCardMapperOptions,
): JoinCardProps {
  return {
    ...baseJoinCardFields(
      {
        startAt: item.startAt,
        status: item.status,
        scheduledEndAt: item.scheduledEndAt,
        venueName: item.venueName,
        seatsLeft: item.availableSlots,
        current: item.confirmedPlayerCount,
        max: item.plannedPlayerCount,
        hostNickname: item.hostNickname,
        hostAvatarUrl: item.hostAvatarUrl,
        rewardPerParticipant: item.rewardPerParticipant,
        isUrgent: item.isUrgent,
        title: item.venueName,
      },
      { ...options, variant: options?.variant ?? 'management' },
    ),
    onPress,
  };
}

export function mapExplorePreviewToJoinCardProps(
  preview: ExploreJoinPreviewDto,
  venueName: string,
  onPress: () => void,
  options?: JoinCardMapperOptions,
): JoinCardProps {
  return {
    ...baseJoinCardFields(
      {
        startAt: preview.startAt,
        status: preview.status,
        scheduledEndAt: preview.scheduledEndAt,
        venueName,
        current: preview.currentParticipants,
        max: preview.maxParticipants,
        seatsLeft: preview.maxParticipants - preview.currentParticipants,
        hostNickname: preview.hostNickname,
        isUrgent: preview.isUrgent,
        rewardPerParticipant: preview.rewardCoin,
        title: venueName,
      },
      { ...options, variant: options?.variant ?? 'preview' },
    ),
    onPress,
  };
}
