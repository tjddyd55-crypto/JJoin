import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Badge, Text, spacing, useTheme } from '@jjoin/design-system';
import type { DiscoverJoinCardDto, RecommendedJoinDto } from '@jjoin/types';
import {
  formatHomeJoinTime,
  formatHomeRegionLabel,
  formatRemainingSeats,
} from '../home-format';

type TodayProps = {
  items: DiscoverJoinCardDto[];
  onPress: (joinId: string) => void;
};

export function HomeTodayJoinRow({ items, onPress }: TodayProps) {
  const theme = useTheme();

  if (!items.length) {
    return (
      <Text variant="caption" tone="tertiary" style={styles.empty}>
        오늘 참여 가능한 조인이 없습니다.
      </Text>
    );
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {items.map((item) => (
        <Pressable
          key={item.joinId}
          accessibilityRole="button"
          onPress={() => onPress(item.joinId)}
          style={({ pressed }) => [
            styles.card,
            {
              backgroundColor: theme.colors.surface.card,
              borderColor: theme.colors.border.subtle,
              opacity: pressed ? 0.92 : 1,
            },
          ]}
        >
          <Text variant="bodyStrong" tone="primary">
            {formatHomeJoinTime(item.startAt)}
          </Text>
          <Text variant="body" tone="primary" numberOfLines={1}>
            {item.venueName}
          </Text>
          <Text variant="caption" tone="tertiary" numberOfLines={1}>
            {formatHomeRegionLabel(item.regionLabel, item.sigungu)}
          </Text>
          <Text variant="caption" tone="secondary">
            {formatRemainingSeats(item.availableSlots)}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

type UrgentItem = {
  joinId: string;
  venueName: string;
  startAt: string;
  seatsLeft: number;
  regionLabel: string | null;
};

type UrgentProps = {
  items: UrgentItem[];
  onPress: (joinId: string) => void;
};

export function HomeUrgentJoinCard({ items, onPress }: UrgentProps) {
  const theme = useTheme();
  const item = items[0];
  if (!item) return null;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => onPress(item.joinId)}
      style={({ pressed }) => [
        styles.urgentCard,
        {
          backgroundColor: theme.colors.surface.card,
          borderColor: theme.colors.action.primary,
          opacity: pressed ? 0.92 : 1,
        },
      ]}
    >
      <View style={styles.urgentTop}>
        <Text variant="bodyStrong" style={{ color: theme.colors.action.primary }}>
          {formatHomeJoinTime(item.startAt)}
        </Text>
        <Badge label="긴급" variant="warning" />
      </View>
      <Text variant="body" tone="primary" numberOfLines={1}>
        {item.venueName}
      </Text>
      <Text variant="caption" tone="tertiary" numberOfLines={1}>
        {formatHomeRegionLabel(item.regionLabel)}
      </Text>
      <Text variant="caption" style={{ color: theme.colors.action.primary }}>
        {formatRemainingSeats(item.seatsLeft)}
      </Text>
    </Pressable>
  );
}

type RecommendedProps = {
  items: RecommendedJoinDto[];
  onPress: (joinId: string) => void;
};

export function HomeRecommendedList({ items, onPress }: RecommendedProps) {
  const theme = useTheme();

  if (!items.length) {
    return null;
  }

  return (
    <View style={styles.stack}>
      {items.map((item) => {
        const chips =
          item.reasons?.length
            ? item.reasons.slice(0, 2)
            : [{ code: item.reasonCode, label: item.reasonLabel }];
        return (
          <Pressable
            key={item.joinId}
            accessibilityRole="button"
            onPress={() => onPress(item.joinId)}
            style={({ pressed }) => [
              styles.recCard,
              {
                backgroundColor: theme.colors.surface.card,
                borderColor: theme.colors.border.subtle,
                opacity: pressed ? 0.92 : 1,
              },
            ]}
          >
            <View style={styles.reasonRow}>
              {chips.map((chip) => (
                <Badge key={chip.code} label={chip.label} variant="neutral" />
              ))}
            </View>
            <Text variant="body" tone="primary" numberOfLines={1}>
              {formatHomeJoinTime(item.startAt)} · {item.venueName}
            </Text>
            <Text variant="caption" tone="secondary">
              {formatRemainingSeats(item.seatsLeft)}
              {item.hostAverageRatingDisplay
                ? ` · ★ ${item.hostAverageRatingDisplay}`
                : ''}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: spacing.sm,
    paddingRight: spacing.sm,
  },
  stack: {
    gap: spacing.sm,
  },
  card: {
    width: 168,
    padding: spacing.sm,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
  },
  urgentCard: {
    padding: spacing.sm,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
  },
  urgentTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  recCard: {
    padding: spacing.sm,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
  },
  reasonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  empty: {
    paddingVertical: spacing.xs,
  },
});
