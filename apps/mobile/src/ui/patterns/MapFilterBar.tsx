import { StyleSheet, View } from 'react-native';
import { Chip, Row } from '@jjoin/design-system';
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
};

export function MapFilterBar({ value, onChange }: MapFilterBarProps) {
  return (
    <View style={styles.wrap}>
      <Row gap="xs" style={styles.row}>
        {FILTERS.map((f) => (
          <Chip
            key={f.id}
            label={f.label}
            selected={f.id === value}
            onPress={() => onChange(f.id)}
          />
        ))}
      </Row>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {},
  row: { flexWrap: 'wrap' },
});
