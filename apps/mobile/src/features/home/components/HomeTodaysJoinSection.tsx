import { useMemo } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { JoinCard, spacing, useTheme } from '@jjoin/design-system';
import type { DiscoverJoinCardDto, RecommendedJoinDto } from '@jjoin/types';
import {
  mapDiscoverToJoinCardProps,
  mapRecommendedToJoinCardProps,
} from '../../../ui/join-card-map';

type Props = {
  recommended: RecommendedJoinDto[];
  todayFallback: DiscoverJoinCardDto[];
  loading: boolean;
  onPressJoin: (joinId: string, trackRecommendation?: boolean) => void;
};

export function HomeTodaysJoinSection({
  recommended,
  todayFallback,
  loading,
  onPressJoin,
}: Props) {
  const theme = useTheme();

  const cards = useMemo(() => {
    if (recommended.length > 0) {
      return recommended.slice(0, 3).map((item) =>
        mapRecommendedToJoinCardProps(item, () => onPressJoin(item.joinId, true)),
      );
    }
    return todayFallback.slice(0, 3).map((item) =>
      mapDiscoverToJoinCardProps(item, () => onPressJoin(item.joinId)),
    );
  }, [recommended, todayFallback, onPressJoin]);

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={theme.colors.action.primary} />
      </View>
    );
  }

  if (cards.length === 0) {
    return null;
  }

  return (
    <View style={styles.stack}>
      {cards.map((props, index) => {
        const key =
          recommended.length > 0
            ? recommended[index]?.joinId
            : todayFallback[index]?.joinId;
        return <JoinCard key={key ?? `join-${index}`} {...props} />;
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: 10,
  },
  loading: {
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
});
