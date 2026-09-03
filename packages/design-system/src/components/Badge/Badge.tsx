import { View, StyleSheet } from 'react-native';
import { Text } from '../../primitives/Text';
import { useTheme } from '../../theme';

export type BadgeVariant = 'neutral' | 'gold' | 'accent' | 'success' | 'warning' | 'error';

export type BadgeProps = {
  label: string;
  variant?: BadgeVariant;
};

export function Badge({ label, variant = 'neutral' }: BadgeProps) {
  const theme = useTheme();

  const { bg, tone, textColor } = (() => {
    switch (variant) {
      case 'gold':
        return { bg: theme.premium.badge, tone: 'primary' as const, textColor: theme.premium.gold };
      case 'accent':
        return { bg: theme.colors.state.selectedSurface, tone: 'success' as const, textColor: undefined };
      case 'success':
        return { bg: theme.colors.status.successSoft, tone: 'success' as const, textColor: undefined };
      case 'warning':
        return { bg: theme.colors.status.warningSoft, tone: 'warning' as const, textColor: undefined };
      case 'error':
        return { bg: theme.colors.status.errorSoft, tone: 'error' as const, textColor: undefined };
      case 'neutral':
      default:
        return { bg: theme.colors.surface.elevated, tone: 'secondary' as const, textColor: undefined };
    }
  })();

  return (
    <View style={[styles.base, { backgroundColor: bg, borderRadius: theme.radius.sm }]}>
      <Text variant="caption" tone={tone} style={textColor ? { color: textColor } : undefined}>
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
