import { Pressable, StyleSheet } from 'react-native';
import { Card, Icon, Row, Text, useTheme } from '@jjoin/design-system';

export type MapSearchBarProps = {
  onPress: () => void;
  placeholder?: string;
};

export function MapSearchBar({
  onPress,
  placeholder = '장소나 지역을 검색하세요',
}: MapSearchBarProps) {
  const theme = useTheme();

  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={placeholder}>
      <Card variant="floating" padding="sm">
        <Row gap="sm" align="center">
          <Icon name="search" size="md" tone="tertiary" />
          <Text variant="body" tone="tertiary" style={styles.placeholder}>
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
