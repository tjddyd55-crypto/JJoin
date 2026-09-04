import { View, StyleSheet } from 'react-native';
import { Text } from '../../primitives/Text';
import { useTheme } from '../../theme';

export type ClubStatusBadgeTone = 'active' | 'pending' | 'new' | 'recruiting' | 'neutral';

export type ClubStatusBadgeProps = {
  label: string;
  tone?: ClubStatusBadgeTone;
};

function colorsForTone(
  tone: ClubStatusBadgeTone,
  theme: ReturnType<typeof import('../../theme').useTheme>,
) {
  switch (tone) {
    case 'active':
    case 'recruiting':
    case 'new':
      return {
        bg: theme.colors.join.status.openSurface,
        text: theme.colors.join.status.openText,
      };
    case 'pending':
      return {
        bg: theme.colors.status.warningSoft,
        text: theme.colors.status.warning,
      };
    default:
      return {
        bg: theme.colors.surface.soft,
        text: theme.colors.text.secondary,
      };
  }
}

export function ClubStatusBadge({ label, tone = 'neutral' }: ClubStatusBadgeProps) {
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
    minHeight: 24,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
  },
});
