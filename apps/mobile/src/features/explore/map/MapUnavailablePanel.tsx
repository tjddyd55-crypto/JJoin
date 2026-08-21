import { StyleSheet, View } from 'react-native';
import { AppText } from '@jjoin/design-system';

export function MapUnavailablePanel({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <View style={styles.fallback}>
      <AppText variant="subtitle">{title}</AppText>
      <AppText variant="body" color="textSecondary">
        {body}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    flex: 1,
    backgroundColor: '#DCE8E3',
    padding: 24,
    justifyContent: 'center',
    gap: 8,
  },
});
