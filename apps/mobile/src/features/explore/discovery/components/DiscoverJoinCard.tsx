import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Badge, Button, Text, Stack, spacing, useTheme } from '@jjoin/design-system';
import { formatSignedCoin } from '@jjoin/domain';
import type { DiscoverJoinCardDto } from '@jjoin/types';
import {
  formatKstDate,
  formatKstTime,
  isStoreMatchingJoin,
  matchingDeadlineLabel,
  matchingDisplayStatusLabel,
  matchingDisplaySubtitle,
  matchingRewardBenefitLabel,
  matchingSlotProgressLabel,
} from '../../../store/matching-join-ui';

type Props = {
  join: DiscoverJoinCardDto;
  onPress: () => void;
  onJoinPress?: () => void;
};

function statusLabel(join: DiscoverJoinCardDto): string {
  if (join.canJoinState === 'HOST') return '내가 만든 조인';
  if (join.canJoinState === 'ALREADY_JOINED') return '참가 중';
  if (join.canJoinState === 'FULL') return '정원 마감';
  const matchingLabel = matchingDisplayStatusLabel(join, 'host');
  if (matchingLabel) return matchingLabel;
  return join.status === 'IN_PROGRESS' ? '진행 중' : '모집 중';
}

export function DiscoverJoinCard({ join, onPress, onJoinPress }: Props) {
  const theme = useTheme();
  const matching = isStoreMatchingJoin(join);
  const regionBits = [
    join.sigungu ?? join.regionLabel,
    join.distanceMeters != null ? `${(join.distanceMeters / 1000).toFixed(1)}km` : null,
  ].filter(Boolean);

  const slotLabel = matching
    ? matchingSlotProgressLabel(
        join.targetMaleCount,
        join.targetFemaleCount,
        join.confirmedMaleCount,
        join.confirmedFemaleCount,
      )
    : null;
  const deadlineLabel = matching ? matchingDeadlineLabel(join.recruitClosesAt) : null;
  const subtitle = matching ? matchingDisplaySubtitle(join) : null;
  const rewardLabel = matching
    ? matchingRewardBenefitLabel(join.matchingRewardTarget, join.rewardPerParticipant)
    : null;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${formatKstTime(join.startAt)} ${join.venueName}`}
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.surface.card,
          borderColor: theme.colors.border.subtle,
          borderRadius: theme.radius.lg,
        },
      ]}
    >
      <Stack gap="sm">
        <View style={styles.top}>
          <View style={styles.titleRow}>
            <Text variant="sectionTitle" tone="primary">
              {formatKstDate(join.startAt)} {formatKstTime(join.startAt)}
            </Text>
            {matching ? <Badge label="매장 인증" variant="gold" /> : null}
          </View>
          <Badge label={statusLabel(join)} />
        </View>
        <Text variant="body" tone="primary">
          {join.venueName}
        </Text>
        {regionBits.length > 0 ? (
          <Text variant="meta" tone="tertiary">
            {regionBits.join(' · ')}
          </Text>
        ) : null}

        {matching ? (
          <>
            {slotLabel ? (
              <Text variant="meta" tone="secondary">
                {slotLabel}
              </Text>
            ) : null}
            {join.recruitmentLabel ? (
              <Text variant="meta" tone="secondary">
                {join.recruitmentLabel}
              </Text>
            ) : null}
            {subtitle ? (
              <Text variant="meta" tone="tertiary">
                {subtitle}
              </Text>
            ) : null}
            {join.minimumPlayers != null ? (
              <Text variant="meta" tone="tertiary">
                최소 {join.minimumPlayers}명 진행
              </Text>
            ) : null}
            {deadlineLabel ? (
              <Text variant="meta" tone="tertiary">
                {deadlineLabel}
              </Text>
            ) : null}
            {rewardLabel ? (
              <Text variant="meta" tone="secondary" style={{ color: theme.colors.reward.primary }}>
                {rewardLabel}
              </Text>
            ) : null}
          </>
        ) : (
          <>
            <Text variant="meta" tone="secondary">
              {join.currentParticipants}/{join.maxParticipants}명
              {join.availableSlots > 0 ? ` · ${join.availableSlots}자리 남음` : ''}
            </Text>
            <Text variant="meta" tone="tertiary">
              {formatSignedCoin(join.rewardPerParticipant)}
            </Text>
          </>
        )}

        {join.canJoin && join.ctaLabel && onJoinPress ? (
          <Button label={join.ctaLabel} onPress={onJoinPress} />
        ) : null}
      </Stack>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    padding: spacing.md,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  titleRow: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.xs,
  },
});
