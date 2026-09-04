import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import {
  JoinCard,
  JoinCardSkeleton,
  Text,
  spacing,
  useTheme,
} from '@jjoin/design-system';
import type { DiscoverJoinCardDto, RecommendedJoinDto } from '@jjoin/types';
import {
  mapDiscoverToJoinCardProps,
  mapRecommendedToJoinCardProps,
} from '../../../ui/join-card-map';

type Props = {
  recommended: RecommendedJoinDto[];
  todayFallback: DiscoverJoinCardDto[];
  initialLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  hasLoadedOnce: boolean;
  onPressJoin: (joinId: string, trackRecommendation?: boolean) => void;
  onRetry: () => void;
  onBrowseAll: () => void;
};

export function HomeTodaysJoinSection({
  recommended,
  todayFallback,
  initialLoading,
  isRefreshing,
  error,
  hasLoadedOnce,
  onPressJoin,
  onRetry,
  onBrowseAll,
}: Props) {
  const theme = useTheme();

  const cards = useMemo(() => {
    if (recommended.length > 0) {
      return recommended.slice(0, 3).map((item) =>
        mapRecommendedToJoinCardProps(item, () => onPressJoin(item.joinId, true)),
      );
    }
    return todayFallback.slice(0, 3).map((item) =>
      mapDiscoverToJoinCardProps(item, () => onPressJoin(item.joinId), { variant: 'compact' }),
    );
  }, [recommended, todayFallback, onPressJoin]);

  const showSkeleton = initialLoading && !hasLoadedOnce && cards.length === 0;

  if (showSkeleton) {
    return (
      <View style={styles.stack}>
        <JoinCardSkeleton variant="compact" />
      </View>
    );
  }

  if (cards.length > 0) {
    return (
      <View style={styles.stack}>
        {cards.map((props, index) => {
          const key =
            recommended.length > 0
              ? recommended[index]?.joinId
              : todayFallback[index]?.joinId;
          return <JoinCard key={key ?? `join-${index}`} {...props} />;
        })}
        {isRefreshing ? (
          <Text variant="caption" tone="tertiary" style={styles.refreshHint}>
            추천 조인 업데이트 중
          </Text>
        ) : null}
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.emptyBlock}>
        <Text variant="joinMeta" tone="secondary">{error}</Text>
        <Pressable onPress={onRetry} accessibilityRole="button" hitSlop={8}>
          <Text variant="joinFilterChip" style={{ color: theme.colors.join.dday.text }}>
            다시 시도
          </Text>
        </Pressable>
      </View>
    );
  }

  if (hasLoadedOnce) {
    return (
      <View style={styles.emptyBlock}>
        <Text variant="joinMeta" tone="secondary">
          오늘 조건에 맞는 추천 조인이 아직 없어요
        </Text>
        <Pressable onPress={onBrowseAll} accessibilityRole="button" hitSlop={8}>
          <Text variant="joinFilterChip" style={{ color: theme.colors.join.dday.text }}>
            전체 조인 보기
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.stack}>
      <JoinCardSkeleton variant="compact" />
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: 10,
    minHeight: 118,
  },
  emptyBlock: {
    gap: spacing.sm,
    minHeight: 72,
    justifyContent: 'center',
    paddingVertical: spacing.xs,
  },
  refreshHint: {
    textAlign: 'center',
  },
});
