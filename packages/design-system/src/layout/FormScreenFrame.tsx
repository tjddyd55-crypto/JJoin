import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import {
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
import { useTheme } from '../theme';

export type FormScreenFrameProps = ScreenFrameProps &
  ScrollViewProps & {
    footer?: ReactNode;
  };

export { useFormScroll } from './FormScrollContext';

const KEYBOARD_GAP_PX = 24;

/**
 * Form layout with keyboard-safe scroll.
 * Sticky footer collapses while keyboard is open; focused TextInput is scrolled
 * above the keyboard after layout settles (KAV alone is not enough on Android).
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
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  const scrollFocusedInputAboveKeyboard = useCallback((event: KeyboardEvent | null) => {
    const focused = TextInput.State.currentlyFocusedInput?.();
    if (!focused || !scrollRef.current || !event) return;

    const keyboardTop = event.endCoordinates.screenY;

    focused.measureInWindow((_x, y, _width, height) => {
      const fieldBottom = y + height;
      const targetBottom = keyboardTop - KEYBOARD_GAP_PX;
      if (fieldBottom <= targetBottom) return;
      const delta = fieldBottom - targetBottom;
      scrollRef.current?.scrollTo({
        y: Math.max(0, scrollOffsetY.current + delta),
        animated: true,
      });
    });
  }, []);

  const ensureFocusedVisible = useCallback(() => {
    const run = () => scrollFocusedInputAboveKeyboard(lastKeyboardEvent.current);
    requestAnimationFrame(() => {
      run();
      setTimeout(run, 120);
    });
  }, [scrollFocusedInputAboveKeyboard]);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, (event) => {
      lastKeyboardEvent.current = event;
      setKeyboardVisible(true);
      ensureFocusedVisible();
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      lastKeyboardEvent.current = null;
      setKeyboardVisible(false);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [ensureFocusedVisible]);

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      scrollOffsetY.current = event.nativeEvent.contentOffset.y;
      onScroll?.(event);
    },
    [onScroll],
  );

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
            keyboardDismissMode="on-drag"
            automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
            scrollEventThrottle={16}
            onScroll={handleScroll}
            contentContainerStyle={[
              padded && { paddingHorizontal: theme.layoutSpacing.screenHorizontal },
              {
                paddingBottom: theme.layoutSpacing.sectionGap,
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
