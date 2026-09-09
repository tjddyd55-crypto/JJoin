import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  stickyActionBottomPadding,
  stickyActionScrollPadding,
  stickyActionScrollPaddingForButton,
} from './stickyActionInsets';

export function useStickyActionInsets(options?: {
  buttonHeight?: number;
  extraContentHeight?: number;
  topPadding?: number;
}) {
  const insets = useSafeAreaInsets();
  const bottom = insets.bottom;
  const scrollPadding =
    options?.buttonHeight != null
      ? stickyActionScrollPaddingForButton(bottom, options.buttonHeight, {
          extraContentHeight: options.extraContentHeight,
          topPadding: options.topPadding,
        })
      : stickyActionScrollPadding(bottom) + (options?.extraContentHeight ?? 0);

  return {
    insetsBottom: bottom,
    bottomPadding: stickyActionBottomPadding(bottom),
    scrollPadding,
  };
}
