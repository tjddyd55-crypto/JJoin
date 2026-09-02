import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  findNodeHandle,
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
import { useTheme } from '../theme';

export type FormScreenFrameProps = ScreenFrameProps &
  ScrollViewProps & {
    footer?: ReactNode;
  };

export { useFormScroll } from './FormScrollContext';

const KEYBOARD_GAP_PX = 24;
/** Extra clearance for IME toolbars (Samsung / Gboard suggestion strip). */
const KEYBOARD_TOOLBAR_EXTRA_PX = 40;
const KEYBOARD_SCROLL_EXTRA_PX = KEYBOARD_GAP_PX + KEYBOARD_TOOLBAR_EXTRA_PX;

type ScrollResponderWithKeyboard = {
  scrollResponderScrollNativeHandleToKeyboard?: (
    nodeHandle: number,
    additionalOffset?: number,
    preventNegativeScrollOffset?: boolean,
  ) => void;
};

/**
 * Form layout with keyboard-safe scroll.
 *
 * - Scroll drag must NOT dismiss the keyboard (manual scroll while typing).
 * - Sticky footer collapses while keyboard is open so it cannot cover inputs.
 * - Focused TextInput is scrolled above the keyboard after it is actually shown.
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

  const scrollFocusedInputAboveKeyboard = useCallback((event: KeyboardEvent | null) => {
    const focused = TextInput.State.currentlyFocusedInput?.();
    if (!focused || !scrollRef.current || !event) return;

    const scrollView = scrollRef.current as ScrollView & {
      getScrollResponder?: () => ScrollResponderWithKeyboard | null;
    };
    const nodeHandle = findNodeHandle(focused as never);
    const responder = scrollView.getScrollResponder?.();

    // Prefer RN's native keyboard scroll when available (stable on Android).
    if (nodeHandle != null && responder?.scrollResponderScrollNativeHandleToKeyboard) {
      responder.scrollResponderScrollNativeHandleToKeyboard(
        nodeHandle,
        KEYBOARD_SCROLL_EXTRA_PX,
        true,
      );
    }

    // Verify with window coords — native scroll offset alone often leaves the
    // field under Samsung/Gboard IME toolbars.
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
    const generation = ++scrollGeneration.current;
    const run = () => {
      if (generation !== scrollGeneration.current) return;
      scrollFocusedInputAboveKeyboard(lastKeyboardEvent.current);
    };

    // Wait for keyboard + footer collapse layout, not an arbitrary long timeout.
    requestAnimationFrame(() => {
      requestAnimationFrame(run);
    });
    InteractionManager.runAfterInteractions(run);
  }, [scrollFocusedInputAboveKeyboard]);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, (event) => {
      lastKeyboardEvent.current = event;
      setKeyboardVisible(true);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      lastKeyboardEvent.current = null;
      setKeyboardVisible(false);
      scrollGeneration.current += 1;
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Scroll after keyboardVisible re-render collapses the sticky footer.
  useEffect(() => {
    if (!keyboardVisible || !lastKeyboardEvent.current) return;
    ensureFocusedVisible();
  }, [keyboardVisible, ensureFocusedVisible]);

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
            // Keep keyboard open during manual scroll. System back / explicit
            // Keyboard.dismiss (e.g. date/time picker) still dismiss normally.
            keyboardDismissMode="none"
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
