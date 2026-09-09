import { Pressable, StyleSheet } from 'react-native';
import { Text } from '@jjoin/design-system';
import { formatNumber } from '@jjoin/domain';
import { mallColors, mallMetrics } from '../mallDesignTokens';

type Props = {
  availableCoin: string;
  onPress?: () => void;
};

export function MallHeaderCoinPill({ availableCoin, onPress }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={!onPress}
      style={styles.pill}
    >
      <Text style={styles.label}>🪙 {formatNumber(availableCoin)}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    height: mallMetrics.coinPillHeight,
    borderRadius: mallMetrics.coinPillRadius,
    backgroundColor: mallColors.accentGreenSoft,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    color: mallColors.accentGreen,
    fontSize: 13,
    fontWeight: '600',
  },
});
