import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Badge, Button, Text, Stack, spacing, useTheme } from '@jjoin/design-system';
import type { DiscoverJoinCardDto } from '@jjoin/types';

type Props = {
  join: DiscoverJoinCardDto;
  onPress: () => void;
  onJoinPress?: () => void;
};

function formatTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat('ko-KR', {
      timeZone: 'Asia/Seoul',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(new Date(iso));
  } catch {
    return iso.slice(11, 16);
  }
}

function statusLabel(join: DiscoverJoinCardDto): string {
  if (join.canJoinState === 'HOST') return '내가 만든 조인';
  if (join.canJoinState === 'ALREADY_JOINED') return '참가 중';
  if (join.canJoinState === 'FULL') return '정원 마감';
  return join.status === 'IN_PROGRESS' ? '진행 중' : '모집 중';
}

export function DiscoverJoinCard({ join, onPress, onJoinPress }: Props) {
  const theme = useTheme();
  const regionBits = [
    join.sigungu ?? join.regionLabel,
    join.distanceMeters != null
      ? `${(join.distanceMeters / 1000).toFixed(1)}km`
      : null,
  ].filter(Boolean);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${formatTime(join.startAt)} ${join.venueName}`}
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
          <Text variant="sectionTitle" tone="primary">
            {formatTime(join.startAt)}
          </Text>
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
        <Text variant="meta" tone="secondary">
          {join.currentParticipants}/{join.maxParticipants}명
          {join.availableSlots > 0 ? ` · ${join.availableSlots}자리 남음` : ''}
        </Text>
        <Text variant="meta" tone="tertiary">
          +{join.rewardPerParticipant} Coin
        </Text>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
});
