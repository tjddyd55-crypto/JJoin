import React from 'react';
import { JoinCard as DSJoinCard } from '@jjoin/design-system';
import type { DiscoverJoinCardDto } from '@jjoin/types';
import {
  isStoreMatchingJoin,
  matchingDisplayStatusLabel,
  matchingRewardBenefitLabel,
  matchingSlotProgressLabel,
} from '../../../store/matching-join-ui';
import { mapDiscoverToJoinCardProps } from '../../../../ui/join-card-map';
import { splitJoinCapacityDisplay } from '../../../../ui/join-display';

type Props = {
  join: DiscoverJoinCardDto;
  onPress: () => void;
};

function statusLabel(join: DiscoverJoinCardDto): string {
  if (join.canJoinState === 'HOST') return '내 조인';
  if (join.canJoinState === 'ALREADY_JOINED') return '참가 중';
  if (join.canJoinState === 'FULL') return '마감';
  const matchingLabel = matchingDisplayStatusLabel(join, 'host');
  if (matchingLabel) return matchingLabel;
  return join.status === 'IN_PROGRESS' ? '진행 중' : '모집 중';
}

export function DiscoverJoinCard({ join, onPress }: Props) {
  const matching = isStoreMatchingJoin(join);
  const cardProps = mapDiscoverToJoinCardProps(join, onPress, {
    statusBadge: statusLabel(join),
  });

  if (matching) {
    const slotLabel = matchingSlotProgressLabel(
      join.targetMaleCount,
      join.targetFemaleCount,
      join.confirmedMaleCount,
      join.confirmedFemaleCount,
    );
    const rewardLabel = matchingRewardBenefitLabel(
      join.matchingRewardTarget,
      join.rewardPerParticipant,
    );
    if (slotLabel) {
      const capacity = splitJoinCapacityDisplay({
        current: join.currentParticipants,
        max: join.maxParticipants,
        seatsLeft: join.availableSlots,
      });
      cardProps.countLabel = slotLabel;
      cardProps.seatsHighlight = capacity.seatsHighlight;
      cardProps.seatsHighlightTone = capacity.seatsHighlightTone;
    }
    cardProps.rewardLabel = rewardLabel ?? cardProps.rewardLabel;
  }

  return <DSJoinCard {...cardProps} />;
}
