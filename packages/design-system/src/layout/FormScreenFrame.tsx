import { useEffect, useState, type ReactNode } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  type ScrollViewProps,
} from 'react-native';
import { ScreenFrame, type ScreenFrameProps } from './ScreenFrame';
import { useTheme } from '../theme';

export type FormScreenFrameProps = ScreenFrameProps &
  ScrollViewProps & {
    footer?: ReactNode;
  };

/**
 * Form layout with keyboard-safe scroll.
 * - iOS/Android: KeyboardAvoidingView padding
 * - ScrollView: automaticallyAdjustKeyboardInsets + dismiss on drag
 * - Sticky footer hides while keyboard is open so it never covers focused inputs
 */
export function FormScreenFrame({
  padded = true,
  edges,
  footer,
  style,
  contentContainerStyle,
  children,
  ...rest
}: FormScreenFrameProps) {
  const theme = useTheme();
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  return (
    <ScreenFrame padded={false} edges={edges} style={style}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior="padding"
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          automaticallyAdjustKeyboardInsets
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
        {keyboardVisible ? null : footer}
      </KeyboardAvoidingView>
    </ScreenFrame>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
