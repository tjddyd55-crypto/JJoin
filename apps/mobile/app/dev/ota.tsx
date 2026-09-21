import { Redirect } from 'expo-router';
import { ScrollView, StyleSheet } from 'react-native';
import { ScreenFrame, Text, spacing } from '@jjoin/design-system';
import { isInternalToolsEnabled } from '../../src/lib/internal-tools';
import { DevUpdateDebugCard } from '../../src/features/updates/components/DevUpdateDebugCard';

/**
 * DEV-only OTA inspector. Production identity is redirected away.
 * Deep link: jjoindev://dev/ota
 */
export default function DevOtaScreen() {
  if (!isInternalToolsEnabled()) {
    return <Redirect href="/(tabs)/my" />;
  }

  return (
    <ScreenFrame>
      <ScrollView contentContainerStyle={styles.body}>
        <Text variant="screenTitle">EAS Update debug</Text>
        <Text variant="caption" tone="secondary">
          Metro Fast Refresh ≠ EAS Update. This screen is hidden on Production.
        </Text>
        <DevUpdateDebugCard />
      </ScrollView>
    </ScreenFrame>
  );
}

const styles = StyleSheet.create({
  body: {
    padding: spacing.lg,
    gap: spacing.md,
  },
});
