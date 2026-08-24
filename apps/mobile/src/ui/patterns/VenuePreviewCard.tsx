import { Pressable, StyleSheet, View } from 'react-native';
import { Badge, Card, Icon, Row, Text, useTheme } from '@jjoin/design-system';

export type VenuePreviewCardProps = {
  name: string;
  category?: string | null;
  distanceLabel?: string | null;
  address?: string | null;
  openJoinCount?: number;
  onPress?: () => void;
};

/** Compact venue header used inside bottom sheets. */
export function VenuePreviewCard({
  name,
  category,
  distanceLabel,
  address,
  openJoinCount = 0,
  onPress,
}: VenuePreviewCardProps) {
  const theme = useTheme();
  const content = (
    <View style={styles.root}>
      <Row gap="sm" align="flex-start">
        <Icon name="venue" size="lg" tone="gold" />
        <View style={styles.textCol}>
          <Text variant="sectionTitle" tone="primary">
            {name}
          </Text>
          {category ? (
            <Text variant="meta" tone="secondary">
              {category}
            </Text>
          ) : null}
          <Text variant="meta" tone="tertiary">
            {[distanceLabel, address].filter(Boolean).join(' · ')}
          </Text>
          <Text variant="bodyStrong" style={{ color: theme.colors.action.primary, marginTop: 4 }}>
            열린 조인 {openJoinCount}
          </Text>
        </View>
      </Row>
    </View>
  );

  if (onPress) {
    return (
      <Pressable accessibilityRole="button" onPress={onPress}>
        {content}
      </Pressable>
    );
  }
  return content;
}

const styles = StyleSheet.create({
  root: { gap: 8 },
  textCol: { flex: 1, gap: 2 },
});
