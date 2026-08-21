import { View, TextInput, StyleSheet, type TextInputProps } from 'react-native';
import { AppText } from '../primitives/AppText';
import { colors, radius, spacing } from '../tokens';

type Props = TextInputProps & {
  label: string;
  error?: string;
};

export function FormField({ label, error, style, ...rest }: Props) {
  return (
    <View style={styles.wrap}>
      <AppText variant="label" color="textSecondary">
        {label}
      </AppText>
      <TextInput
        placeholderTextColor={colors.textSecondary}
        style={[styles.input, error ? styles.inputError : null, style]}
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
    minHeight: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.surface,
    color: colors.textPrimary,
    fontSize: 15,
  },
  inputError: { borderColor: colors.danger },
});
