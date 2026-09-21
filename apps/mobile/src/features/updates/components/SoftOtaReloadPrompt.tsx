import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Text, spacing, useTheme } from '@jjoin/design-system';
import { useSoftOtaUpdate } from '../hooks/useSoftOtaUpdate';
import { shouldShowSoftOtaPrompt } from '../model/soft-ota-prompt-policy';

/**
 * Optional banner after a background OTA download. Never a blocking modal —
 * mandatory APK/AAB stays in ProductionReleaseGate.
 */
export function SoftOtaReloadPrompt() {
  const [dismissedThisSession, setDismissedThisSession] = useState(false);
  const ota = useSoftOtaUpdate(dismissedThisSession);
  const visible = shouldShowSoftOtaPrompt({
    isUpdatePending: ota.isUpdatePending,
    dismissedThisSession,
  });

  if (!visible || ota.action !== 'prompt_reload') {
    return null;
  }

  return (
    <SoftOtaBanner
      onReload={() => {
        void ota.reload();
      }}
      onDismiss={() => setDismissedThisSession(true)}
    />
  );
}

function SoftOtaBanner({
  onReload,
  onDismiss,
}: {
  onReload: () => void;
  onDismiss: () => void;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}
    >
      <View style={[styles.card, { backgroundColor: theme.colors.surface.elevated }]}>
        <Text variant="bodyStrong">새 업데이트가 준비됐습니다</Text>
        <Text variant="caption" tone="secondary">
          지금 다시 시작하면 적용됩니다. 나중에 앱을 종료해도 다음 실행에 반영됩니다.
        </Text>
        <View style={styles.actions}>
          <Button label="나중에" variant="ghost" size="sm" onPress={onDismiss} />
          <Button label="다시 시작" variant="secondary" size="sm" onPress={onReload} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    bottom: 0,
  },
  card: {
    borderRadius: 16,
    padding: spacing.md,
    gap: spacing.xs,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
});
