import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Text, spacing, useTheme } from '@jjoin/design-system';
import type { DiscoverFacilityJoinItemDto } from '@jjoin/types';
import { formatKstTime } from '../../../store/matching-join-ui';

type Props = {
  facilities: DiscoverFacilityJoinItemDto[];
  totalJoinCount: number;
  regionLabel: string;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onSelectFacility: (facility: DiscoverFacilityJoinItemDto) => void;
  onSwitchToMap?: () => void;
};

function formatDistance(meters: number | null): string | null {
  if (meters == null || !Number.isFinite(meters)) return null;
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

function formatStartTimes(times: string[]): string {
  return times
    .slice(0, 3)
    .map((t) => formatKstTime(t))
    .join(' / ');
}

export function RegionFacilityList({
  facilities,
  totalJoinCount,
  regionLabel,
  loading,
  error,
  onRetry,
  onSelectFacility,
  onSwitchToMap,
}: Props) {
  const theme = useTheme();
  const gold = theme.colors.action.primary;

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={gold} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text variant="body" tone="secondary">
          {error}
        </Text>
        <Pressable onPress={onRetry} style={styles.retry}>
          <Text variant="meta" style={{ color: gold }}>
            다시 시도
          </Text>
        </Pressable>
      </View>
    );
  }

  if (facilities.length === 0) {
    return (
      <View style={styles.center}>
        <Text variant="sectionTitle" tone="primary">
          {regionLabel}
        </Text>
        <Text variant="body" tone="secondary" style={styles.emptyText}>
          오늘 예정된 조인이 아직 없어요.
        </Text>
        {onSwitchToMap ? (
          <Pressable onPress={onSwitchToMap} style={styles.mapLink}>
            <Text variant="meta" style={{ color: gold }}>
              지도에서 스크린장 찾기
            </Text>
          </Pressable>
        ) : null}
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.list}>
      <View style={styles.header}>
        <Text variant="meta" tone="tertiary">
          {regionLabel}
        </Text>
        <Text variant="meta" tone="secondary">
          총 조인 {totalJoinCount}개
        </Text>
      </View>
      {facilities.map((f) => {
        const dist = formatDistance(f.distanceMeters);
        return (
          <Pressable
            key={f.venueId}
            onPress={() => onSelectFacility(f)}
            style={[
              styles.card,
              {
                backgroundColor: theme.colors.surface.card,
                borderColor: theme.colors.border.subtle,
                borderRadius: theme.radius.lg,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel={`${f.venueName} 조인 ${f.joinCount}개`}
          >
            <Text variant="sectionTitle" tone="primary">
              {f.venueName}
            </Text>
            <Text variant="meta" tone="secondary">
              {[dist, `조인 ${f.joinCount}개`].filter(Boolean).join(' · ')}
            </Text>
            {f.startTimes.length > 0 ? (
              <Text variant="meta" tone="tertiary">
                {formatStartTimes(f.startTimes)}
              </Text>
            ) : null}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  list: {
    padding: spacing.md,
    gap: spacing.sm,
    paddingBottom: spacing.xl,
  },
  header: {
    paddingHorizontal: spacing.xs,
    paddingBottom: spacing.sm,
    gap: 2,
  },
  card: {
    padding: spacing.md,
    borderWidth: 1,
    gap: spacing.xs,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  emptyText: {
    textAlign: 'center',
  },
  retry: {
    padding: spacing.sm,
  },
  mapLink: {
    padding: spacing.sm,
  },
});
