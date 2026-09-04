import { StyleSheet, View } from 'react-native';
import { Text } from '../../primitives/Text';
import { useTheme } from '../../theme';

export type JoinSeatsRemainingTone = 'available' | 'lastSeat' | 'full';

export type JoinSeatsRemainingBannerProps = {
  label: string;
  tone?: JoinSeatsRemainingTone;
};

export function JoinSeatsRemainingBanner({
  label,
  tone = 'available',
}: JoinSeatsRemainingBannerProps) {
  const theme = useTheme();
  const isLast = tone === 'lastSeat';
  const isFull = tone === 'full';

  const backgroundColor = isFull
    ? theme.colors.join.status.fullSurface
    : isLast
      ? theme.colors.join.status.urgentSurface
      : theme.colors.join.surface.success;

  const textColor = isFull
    ? theme.colors.text.tertiary
    : isLast
      ? theme.colors.join.capacity.lastSeat
      : theme.colors.join.capacity.available;

  return (
    <View style={[styles.banner, { backgroundColor }]}>
      <Text
        variant="joinTabLabel"
        numberOfLines={1}
        style={[styles.label, { color: textColor }]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
  },
  label: {
    textAlign: 'center',
  },
});
