import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Text } from '../../primitives/Text';

export type ClubSectionProps = {
  title: string;
  actionLabel?: string;
  onActionPress?: () => void;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function ClubSection({ title, children, style }: ClubSectionProps) {
  if (!children) return null;
  return (
    <View style={[styles.root, style]}>
      <Text variant="joinSectionTitle" tone="primary">
        {title}
      </Text>
      <View style={styles.body}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: 8,
  },
  body: {
    gap: 8,
  },
});
