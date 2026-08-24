import { Pressable, StyleSheet, ActivityIndicator, type StyleProp, type ViewStyle } from 'react-native';
import { Text, useTheme, opacity } from '@jjoin/design-system';
import type { SocialProvider } from '@jjoin/types';

export type SocialLoginButtonProps = {
  provider: SocialProvider;
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
};

const PROVIDER_BRAND: Record<
  SocialProvider,
  { background: string; text: string; border?: string }
> = {
  KAKAO: { background: '#FEE500', text: '#191600' },
  NAVER: { background: '#03C75A', text: '#FFFFFF' },
  GOOGLE: { background: '#FFFFFF', text: '#1F1F1F', border: '#DADCE0' },
};

/** Visual-only social CTA. OAuth handlers stay in the screen. */
export function SocialLoginButton({
  provider,
  label,
  onPress,
  loading,
  disabled,
}: SocialLoginButtonProps) {
  const theme = useTheme();
  const brand = PROVIDER_BRAND[provider];
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }): StyleProp<ViewStyle> => [
        styles.base,
        {
          minHeight: theme.sizes.button.lg,
          borderRadius: theme.radius.md,
          backgroundColor: brand.background,
          borderColor: brand.border ?? brand.background,
          opacity: isDisabled ? opacity.disabled : pressed ? opacity.pressed : 1,
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={brand.text} />
      ) : (
        <Text variant="button" style={{ color: brand.text }}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    alignSelf: 'stretch',
  },
});
