import { ScrollView, StyleSheet, View } from 'react-native';
import { Chip, spacing } from '@jjoin/design-system';
import type { ExploreFilterId } from '../../features/explore/model/map-types';

const FILTERS: { id: ExploreFilterId; label: string }[] = [
  { id: 'ALL', label: '전체' },
  { id: 'VENUE', label: '골프장' },
  { id: 'USER', label: '사람' },
  { id: 'TODAY_JOIN', label: '오늘 조인' },
];

export type MapFilterBarProps = {
  value: ExploreFilterId;
  onChange: (next: ExploreFilterId) => void;
  compact?: boolean;
};

export function MapFilterBar({ value, onChange, compact = false }: MapFilterBarProps) {
  return (
    <View style={styles.wrap}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {FILTERS.map((f) => (
          <Chip
            key={f.id}
            label={f.label}
            selected={f.id === value}
            onPress={() => onChange(f.id)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {},
  row: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingRight: spacing.sm,
  },
});
