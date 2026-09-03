import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Button, JoinCard as DSJoinCard, spacing } from '@jjoin/design-system';
import { formatSignedCoin } from '@jjoin/domain';
import type { DiscoverJoinCardDto } from '@jjoin/types';
import {
  isStoreMatchingJoin,
  matchingDisplayStatusLabel,
  matchingRewardBenefitLabel,
  matchingSlotProgressLabel,
} from '../../../store/matching-join-ui';
import { mapDiscoverToJoinCardProps } from '../../../../ui/join-card-map';

type Props = {
  join: DiscoverJoinCardDto;
  onPress: () => void;
  onJoinPress?: () => void;
};

function statusLabel(join: DiscoverJoinCardDto): string {
  if (join.canJoinState === 'HOST') return '내 조인';
  if (join.canJoinState === 'ALREADY_JOINED') return '참가 중';
  if (join.canJoinState === 'FULL') return '마감';
  const matchingLabel = matchingDisplayStatusLabel(join, 'host');
  if (matchingLabel) return matchingLabel;
  return join.status === 'IN_PROGRESS' ? '진행 중' : '모집 중';
}

export function DiscoverJoinCard({ join, onPress, onJoinPress }: Props) {
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
    cardProps.participantLabel = slotLabel ?? cardProps.participantLabel;
    cardProps.rewardLabel = rewardLabel ?? cardProps.rewardLabel;
  }

  return (
    <View style={styles.wrap}>
      <DSJoinCard {...cardProps} />
      {join.canJoin && join.ctaLabel && onJoinPress ? (
        <Button label={join.ctaLabel} onPress={onJoinPress} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm,
  },
});
