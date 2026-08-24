import { View, StyleSheet } from 'react-native';
import { Text } from '../../primitives/Text';
import { useTheme } from '../../theme';

export type BadgeVariant = 'neutral' | 'gold' | 'success' | 'warning' | 'error';

export type BadgeProps = {
  label: string;
  variant?: BadgeVariant;
};

export function Badge({ label, variant = 'neutral' }: BadgeProps) {
  const theme = useTheme();

  const { bg, tone } = (() => {
    switch (variant) {
      case 'gold':
        return { bg: theme.colors.reward.muted, tone: 'primary' as const };
      case 'success':
        return { bg: theme.colors.status.successSoft, tone: 'success' as const };
      case 'warning':
        return { bg: theme.colors.status.warningSoft, tone: 'warning' as const };
      case 'error':
        return { bg: theme.colors.status.errorSoft, tone: 'error' as const };
      case 'neutral':
      default:
        return { bg: theme.colors.surface.elevated, tone: 'secondary' as const };
    }
  })();

  return (
    <View style={[styles.base, { backgroundColor: bg, borderRadius: theme.radius.sm }]}>
      <Text variant="caption" tone={tone}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
});
