import { View, TextInput, StyleSheet, type TextInputProps } from 'react-native';
import { AppText } from '../primitives/AppText';
import { spacing } from '../tokens';
import { useTheme } from '../theme';

type Props = TextInputProps & {
  label: string;
  error?: string;
};

/** @deprecated Prefer `Input` — kept for legacy screens; uses Club Minimal theme tokens. */
export function FormField({ label, error, style, editable = true, ...rest }: Props) {
  const theme = useTheme();
  const isDisabled = editable === false;

  return (
    <View style={styles.wrap}>
      <AppText variant="label" color="textSecondary">
        {label}
      </AppText>
      <TextInput
        placeholderTextColor={theme.colors.text.tertiary}
        editable={editable}
        style={[
          styles.input,
          {
            minHeight: theme.sizes.input.md,
            borderRadius: theme.radius.md,
            backgroundColor: theme.colors.surface.card,
            borderColor: error ? theme.colors.status.error : theme.colors.border.subtle,
            color: theme.colors.text.primary,
            opacity: isDisabled ? 0.5 : 1,
          },
          style,
        ]}
        {...rest}
      />
      {error ? (
        <AppText variant="caption" color="danger">
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.xxs },
  input: {
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    fontSize: 15,
  },
});
