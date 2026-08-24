import { Text, useTheme } from '@jjoin/design-system';
import { View, StyleSheet } from 'react-native';

export function MapUnavailablePanel({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.root,
        { backgroundColor: theme.colors.surface.card },
      ]}
    >
      <Text variant="sectionTitle" tone="primary">
        {title}
      </Text>
      <Text variant="caption" tone="secondary">
        {body}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 8,
  },
});
