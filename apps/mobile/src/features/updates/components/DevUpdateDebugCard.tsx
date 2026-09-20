import { StyleSheet, View } from 'react-native';
import Constants from 'expo-constants';
import { Card, Text, spacing } from '@jjoin/design-system';
import { isInternalToolsEnabled } from '../../../lib/internal-tools';
import { readOtaDebugSnapshot } from '../hooks/useOtaDebugSnapshot';
import { formatOtaDebugLines } from '../model/ota-debug-snapshot';

function readConfiguredApplicationId(): string | null {
  return (
    Constants.expoConfig?.android?.package ??
    Constants.expoConfig?.ios?.bundleIdentifier ??
    null
  );
}

/** DEV-only OTA/binary identity. Production consumer UI must not mount this. */
export function DevUpdateDebugCard() {
  if (!isInternalToolsEnabled()) return null;
  const snapshot = readOtaDebugSnapshot(readConfiguredApplicationId());
  const lines = formatOtaDebugLines(snapshot);

  return (
    <Card padding="md">
      <Text variant="bodyStrong">OTA / binary debug</Text>
      <Text variant="caption" tone="secondary" style={styles.hint}>
        Development identity only — not shown on Production
      </Text>
      <View style={styles.list}>
        {lines.map((line) => (
          <View key={line.label} style={styles.row}>
            <Text variant="caption" tone="secondary">
              {line.label}
            </Text>
            <Text variant="caption">{line.value}</Text>
          </View>
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  hint: {
    marginTop: spacing.xxs,
    marginBottom: spacing.sm,
  },
  list: {
    gap: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
});
