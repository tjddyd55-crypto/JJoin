import { Platform, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { resolveModalTopInset } from './resolve-modal-top-inset';

export { resolveModalTopInset };

export function useModalSafePadding(): { paddingTop: number; paddingBottom: number } {
  const insets = useSafeAreaInsets();
  const androidStatus =
    Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) : 0;
  return {
    paddingTop: resolveModalTopInset(insets.top, androidStatus),
    paddingBottom: insets.bottom,
  };
}
