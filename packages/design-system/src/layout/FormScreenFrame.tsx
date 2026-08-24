import {
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
    footer?: React.ReactNode;
  };

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

  return (
    <ScreenFrame padded={false} edges={edges} style={style}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            padded && { paddingHorizontal: theme.layoutSpacing.screenHorizontal },
            { paddingBottom: theme.layoutSpacing.sectionGap, flexGrow: 1 },
            contentContainerStyle,
          ]}
          {...rest}
        >
          {children}
        </ScrollView>
        {footer}
      </KeyboardAvoidingView>
    </ScreenFrame>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
