import { View, StyleSheet } from 'react-native';
import { Text } from '../../primitives/Text';
import { useTheme } from '../../theme';

export type JoinStatusBadgeTone = 'open' | 'urgent' | 'full' | 'closed' | 'neutral' | 'ongoing';

export type JoinStatusBadgeProps = {
  label: string;
  tone?: JoinStatusBadgeTone;
};

function colorsForTone(
  tone: JoinStatusBadgeTone,
  theme: ReturnType<typeof import('../../theme').useTheme>,
) {
  switch (tone) {
    case 'urgent':
      return {
        bg: theme.colors.join.status.urgentSurface,
        text: theme.colors.join.status.urgentText,
      };
    case 'open':
    case 'ongoing':
      return {
        bg: theme.colors.join.status.openSurface,
        text: theme.colors.join.status.openText,
      };
    case 'full':
    case 'closed':
    case 'neutral':
      return {
        bg: theme.colors.join.status.fullSurface,
        text: theme.colors.join.status.full,
      };
    default:
      return {
        bg: theme.colors.join.status.fullSurface,
        text: theme.colors.join.status.full,
      };
  }
}

export function JoinStatusBadge({ label, tone = 'neutral' }: JoinStatusBadgeProps) {
  const theme = useTheme();
  const { bg, text } = colorsForTone(tone, theme);
  return (
    <View style={[styles.badge, { backgroundColor: bg, borderRadius: theme.radius.full }]}>
      <Text variant="caption" style={[styles.label, { color: text }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    minHeight: 32,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
});
