import { useState, type ReactNode } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  type TextInputProps,
} from 'react-native';
import { Text } from '../../primitives/Text';
import { useTheme } from '../../theme';
import type { IconName } from '../../icons/iconTypes';
import { Icon } from '../../icons/Icon';
import { useFormScroll } from '../../layout/FormScrollContext';

export type InputProps = TextInputProps & {
  label?: string;
  helper?: string;
  error?: string;
  leftIcon?: IconName;
  rightElement?: ReactNode;
};

export function Input({
  label,
  helper,
  error,
  leftIcon,
  rightElement,
  editable = true,
  style,
  onFocus,
  onBlur,
  onContentSizeChange,
  multiline,
  ...rest
}: InputProps) {
  const theme = useTheme();
  const formScroll = useFormScroll();
  const [focused, setFocused] = useState(false);
  const hasError = Boolean(error);
  const isDisabled = editable === false;

  const borderColor = hasError
    ? theme.colors.status.error
    : focused
      ? theme.colors.action.primary
      : theme.colors.border.subtle;

  return (
    <View style={styles.wrap}>
      {label ? (
        <Text variant="meta" tone="secondary">
          {label}
        </Text>
      ) : null}
      <View
        style={[
          styles.field,
          {
            minHeight: theme.sizes.input.md,
            borderRadius: theme.radius.md,
            backgroundColor: theme.colors.surface.card,
            borderColor,
            opacity: isDisabled ? 0.5 : 1,
            alignItems: multiline ? 'flex-start' : 'center',
          },
        ]}
      >
        {leftIcon ? <Icon name={leftIcon} size="md" tone="tertiary" /> : null}
        <TextInput
          placeholderTextColor={theme.colors.text.tertiary}
          editable={editable}
          multiline={multiline}
          style={[
            styles.input,
            {
              color: theme.colors.text.primary,
              fontFamily: theme.typography.body.fontFamily,
              fontSize: theme.typography.body.fontSize,
            },
            multiline ? styles.multiline : null,
            style,
          ]}
          onFocus={(e) => {
            setFocused(true);
            formScroll?.ensureFocusedVisible();
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          onContentSizeChange={(e) => {
            onContentSizeChange?.(e);
            if (focused && multiline) {
              formScroll?.ensureFocusedVisible();
            }
          }}
          {...rest}
        />
        {rightElement}
      </View>
      {error ? (
        <Text variant="caption" tone="error">
          {error}
        </Text>
      ) : helper ? (
        <Text variant="caption" tone="tertiary">
          {helper}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  field: {
    flexDirection: 'row',
    borderWidth: 1,
    paddingHorizontal: 14,
    gap: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
  },
  multiline: {
    minHeight: 88,
    textAlignVertical: 'top',
  },
});
