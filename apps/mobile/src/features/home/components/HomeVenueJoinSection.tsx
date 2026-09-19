import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { JoinCard, JoinCardSkeleton, Text, spacing } from '@jjoin/design-system';
import type { DiscoverJoinCardDto } from '@jjoin/types';
import { mapDiscoverToJoinCardProps } from '../../../ui/join-card-map';

type Props = {
  joins: DiscoverJoinCardDto[];
  emptyMessage: string;
  initialLoading: boolean;
  hasLoadedOnce: boolean;
  onPressJoin: (joinId: string) => void;
};

export function HomeVenueJoinSection({
  joins,
  emptyMessage,
  initialLoading,
  hasLoadedOnce,
  onPressJoin,
}: Props) {
  const cards = useMemo(
    () =>
      joins.map((item) =>
        mapDiscoverToJoinCardProps(item, () => onPressJoin(item.joinId), { variant: 'compact' }),
      ),
    [joins, onPressJoin],
  );

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
        {cards.map((props, index) => (
          <JoinCard key={joins[index]?.joinId ?? `join-${index}`} {...props} />
        ))}
      </View>
    );
  }

  if (hasLoadedOnce) {
    return (
      <View style={styles.emptyBlock}>
        <Text variant="joinMeta" tone="secondary">{emptyMessage}</Text>
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
    minHeight: 72,
    justifyContent: 'center',
    paddingVertical: spacing.xs,
  },
});
