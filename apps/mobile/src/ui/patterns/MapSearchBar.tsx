import { Pressable, StyleSheet } from 'react-native';
import { Card, Icon, Row, Text, spacing, useTheme } from '@jjoin/design-system';

export type MapSearchBarProps = {
  onPress: () => void;
  placeholder?: string;
  /** Smaller height for map-first screen tab */
  compact?: boolean;
};

export function MapSearchBar({
  onPress,
  placeholder = '장소나 지역을 검색하세요',
  compact = false,
}: MapSearchBarProps) {
  const theme = useTheme();

  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={placeholder}>
      <Card variant="floating" padding={compact ? 'sm' : 'md'}>
        <Row gap="sm" align="center">
          <Icon name="search" size={compact ? 'sm' : 'md'} tone="tertiary" />
          <Text
            variant={compact ? 'meta' : 'body'}
            tone="tertiary"
            style={styles.placeholder}
          >
            {placeholder}
          </Text>
        </Row>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  placeholder: { flex: 1 },
});
