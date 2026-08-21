import { View, StyleSheet } from 'react-native';
import { AppText } from '../primitives/AppText';
import { colors, radius, spacing } from '../tokens';

type Props = {
  label: string;
  tone?: 'neutral' | 'success' | 'warning' | 'danger';
};

export function StatusBadge({ label, tone = 'neutral' }: Props) {
  const bg =
    tone === 'success'
      ? colors.primarySoft
      : tone === 'warning'
        ? colors.warningSoft
        : tone === 'danger'
          ? colors.dangerSoft
          : colors.background;
  const color =
    tone === 'success'
      ? 'primary'
      : tone === 'warning'
        ? 'warning'
        : tone === 'danger'
          ? 'danger'
          : 'textSecondary';

  return (
    <View style={[styles.base, { backgroundColor: bg }]}>
      <AppText variant="caption" color={color}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignSelf: 'flex-start',
    borderRadius: radius.sm,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xxs,
  },
});

