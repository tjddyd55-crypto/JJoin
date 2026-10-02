import { useEffect, useRef, useState } from 'react';
import { BackHandler, Platform, StyleSheet, View } from 'react-native';
import { exitAndroidAppCompletely } from 'jjoin-app-exit';
import { Text, useTheme } from '@jjoin/design-system';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useNavigation } from 'expo-router';
import {
  ANDROID_DOUBLE_BACK_EXIT_WINDOW_MS,
  resolveAndroidDoubleBackExitAction,
} from './android-double-back-exit-logic';

const EXIT_TOAST_LABEL = '한 번 더 누르면 종료됩니다.';

const EXIT_WINDOW_MS = ANDROID_DOUBLE_BACK_EXIT_WINDOW_MS;
export function useAndroidDoubleBackExit(active: boolean) {
  const navigation = useNavigation();
  const lastBackAt = useRef(0);
  const [visible, setVisible] = useState(false);
  const insets = useSafeAreaInsets();
  const theme = useTheme();

  useEffect(() => {
    if (Platform.OS !== 'android' || !active) return;

    let hideTimer: ReturnType<typeof setTimeout> | undefined;

    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!navigation.isFocused()) return false;

      const now = Date.now();
      const action = resolveAndroidDoubleBackExitAction({
        canGoBack: false,
        now,
        lastBackAt: lastBackAt.current,
        windowMs: EXIT_WINDOW_MS,
      });
      if (action === 'navigate') return false;
      if (action === 'exit') {
        exitAndroidAppCompletely();
        return true;
      }
      lastBackAt.current = now;
      setVisible(true);
      if (hideTimer) clearTimeout(hideTimer);
      hideTimer = setTimeout(() => setVisible(false), EXIT_WINDOW_MS);
      return true;
    });

    return () => {
      sub.remove();
      if (hideTimer) clearTimeout(hideTimer);
    };
  }, [active, navigation]);

  const hint =
    visible && active ? (
      <View
        pointerEvents="none"
        accessible
        accessibilityLiveRegion="polite"
        accessibilityLabel={EXIT_TOAST_LABEL}
        style={[
          styles.hint,
          {
            bottom: insets.bottom + 16,
            backgroundColor: theme.colors.surface.elevated,
          },
        ]}
      >
        <Text variant="caption" tone="secondary" accessibilityElementsHidden importantForAccessibility="no">
          {EXIT_TOAST_LABEL}
        </Text>
      </View>
    ) : null;

  return { exitHint: hint };
}

const styles = StyleSheet.create({
  hint: {
    position: 'absolute',
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    zIndex: 10000,
    elevation: 8,
  },
});
