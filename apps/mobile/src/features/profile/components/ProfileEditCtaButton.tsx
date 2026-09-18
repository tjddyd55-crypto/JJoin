import { Pressable, StyleSheet } from 'react-native';
import { Text, useTheme } from '@jjoin/design-system';

type Props = {
  onPress: () => void;
};

/** MY / 공개 프로필 공통 — 소형 CTA (~40px), 폰트 스케일 영향 최소화 */
export function ProfileEditCtaButton({ onPress }: Props) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="프로필 수정"
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        {
          borderRadius: theme.radius.lg,
          borderColor: theme.colors.border.subtle,
          backgroundColor: theme.colors.action.secondary,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <Text variant="caption" tone="primary" allowFontScaling={false} style={styles.label}>
        프로필 수정
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignSelf: 'flex-start',
    height: 40,
    minHeight: 40,
    maxHeight: 40,
    paddingHorizontal: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontWeight: '600',
    fontSize: 13,
    lineHeight: 16,
  },
});
