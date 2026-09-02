import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Dimensions,
  InteractionManager,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  type KeyboardEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollViewProps,
} from 'react-native';
import { ScreenFrame, type ScreenFrameProps } from './ScreenFrame';
import { FormScrollProvider } from './FormScrollContext';
import {
  KEYBOARD_SCROLL_CLEARANCE_PX,
  resolveKeyboardBottomInset,
} from './keyboardBottomInset';
import { useTheme } from '../theme';

export type FormScreenFrameProps = ScreenFrameProps &
  ScrollViewProps & {
    footer?: ReactNode;
  };

export { useFormScroll } from './FormScrollContext';
export {
  KEYBOARD_GAP_PX,
  KEYBOARD_IME_CHROME_PX,
  KEYBOARD_SCROLL_CLEARANCE_PX,
  resolveKeyboardBottomInset,
} from './keyboardBottomInset';

/**
 * Form layout with keyboard-safe scroll.
 *
 * - Scroll drag must NOT dismiss the keyboard (manual scroll while typing).
 * - Sticky footer collapses while keyboard is open so it cannot cover inputs.
 * - Dynamic bottom inset gives enough scroll range for bottom fields.
 * - Focused TextInput is scrolled above the keyboard after layout settles.
 */
export function FormScreenFrame({
  padded = true,
  edges,
  footer,
  style,
  contentContainerStyle,
  children,
  onScroll,
  ...rest
}: FormScreenFrameProps) {
  const theme = useTheme();
  const scrollRef = useRef<ScrollView>(null);
  const scrollOffsetY = useRef(0);
  const lastKeyboardEvent = useRef<KeyboardEvent | null>(null);
  const scrollGeneration = useRef(0);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [keyboardBottomInset, setKeyboardBottomInset] = useState(0);

  const measureAndScrollFocused = useCallback(
    (event: KeyboardEvent, allowCorrection: boolean) => {
      const focused = TextInput.State.currentlyFocusedInput?.();
      if (!focused || !scrollRef.current) return;

      // measureInWindow + scrollTo only. Native keyboard-scroll updates content
      // offset without syncing scrollOffsetY and under-corrects on Android.
      const keyboardTop = event.endCoordinates.screenY;
      focused.measureInWindow((_x, y, _width, height) => {
        const fieldBottom = y + height;
        const targetBottom = keyboardTop - KEYBOARD_SCROLL_CLEARANCE_PX;
        if (fieldBottom <= targetBottom) return;

        const delta = fieldBottom - targetBottom;
        const nextY = Math.max(0, scrollOffsetY.current + delta);
        scrollOffsetY.current = nextY;
        scrollRef.current?.scrollTo({ y: nextY, animated: true });

        if (!allowCorrection) return;

        // One residual correction after scroll + layout settle. No loops.
        requestAnimationFrame(() => {
          InteractionManager.runAfterInteractions(() => {
            const stillFocused = TextInput.State.currentlyFocusedInput?.();
            const latest = lastKeyboardEvent.current;
            if (!stillFocused || !latest || !scrollRef.current) return;
            stillFocused.measureInWindow((_x2, y2, _w2, height2) => {
              const bottom2 = y2 + height2;
              const target2 = latest.endCoordinates.screenY - KEYBOARD_SCROLL_CLEARANCE_PX;
              if (bottom2 <= target2) return;
              const residual = bottom2 - target2;
              const correctedY = Math.max(0, scrollOffsetY.current + residual);
              scrollOffsetY.current = correctedY;
              scrollRef.current?.scrollTo({ y: correctedY, animated: true });
            });
          });
        });
      });
    },
    [],
  );

  const ensureFocusedVisible = useCallback(() => {
    const event = lastKeyboardEvent.current;
    if (!event) return;

    const generation = ++scrollGeneration.current;
    const run = (allowCorrection: boolean) => {
      if (generation !== scrollGeneration.current) return;
      measureAndScrollFocused(event, allowCorrection);
    };

    // Footer collapse + inset padding must layout before measure.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => run(true));
    });
    InteractionManager.runAfterInteractions(() => {
      setTimeout(() => run(false), 48);
    });
  }, [measureAndScrollFocused]);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, (event) => {
      lastKeyboardEvent.current = event;
      const height = Math.max(0, event.endCoordinates.height);
      const top = event.endCoordinates.screenY;
      const windowHeight = Dimensions.get('window').height;
      setKeyboardHeight(height);
      setKeyboardBottomInset(
        resolveKeyboardBottomInset({
          keyboardHeight: height,
          keyboardTop: top,
          windowHeight,
        }),
      );
      setKeyboardVisible(true);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      lastKeyboardEvent.current = null;
      setKeyboardHeight(0);
      setKeyboardBottomInset(0);
      setKeyboardVisible(false);
      scrollGeneration.current += 1;
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Scroll after inset + footer collapse re-render settles.
  useEffect(() => {
    if (!keyboardVisible || !lastKeyboardEvent.current) return;
    ensureFocusedVisible();
  }, [keyboardVisible, keyboardHeight, keyboardBottomInset, ensureFocusedVisible]);

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      scrollOffsetY.current = event.nativeEvent.contentOffset.y;
      onScroll?.(event);
    },
    [onScroll],
  );

  const bottomInset = theme.layoutSpacing.sectionGap + keyboardBottomInset;

  return (
    <FormScrollProvider value={{ ensureFocusedVisible }}>
      <ScreenFrame padded={false} edges={edges} style={style}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
        >
          <ScrollView
            ref={scrollRef}
            keyboardShouldPersistTaps="handled"
            // Keep keyboard open during manual scroll. System back / explicit
            // Keyboard.dismiss (e.g. date/time picker) still dismiss normally.
            keyboardDismissMode="none"
            automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
            scrollEventThrottle={16}
            onScroll={handleScroll}
            contentContainerStyle={[
              padded && { paddingHorizontal: theme.layoutSpacing.screenHorizontal },
              {
                paddingBottom: bottomInset,
                flexGrow: 1,
              },
              contentContainerStyle,
            ]}
            {...rest}
          >
            {children}
          </ScrollView>
          {footer ? (
            <View
              pointerEvents={keyboardVisible ? 'none' : 'auto'}
              style={keyboardVisible ? styles.footerCollapsed : undefined}
            >
              {footer}
            </View>
          ) : null}
        </KeyboardAvoidingView>
      </ScreenFrame>
    </FormScrollProvider>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  footerCollapsed: {
    height: 0,
    overflow: 'hidden',
    opacity: 0,
  },
});
