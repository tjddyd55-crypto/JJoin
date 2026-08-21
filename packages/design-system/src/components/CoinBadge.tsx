import { View, StyleSheet } from 'react-native';
import { AppText } from '../primitives/AppText';
import { colors, radius, spacing } from '../tokens';

type Props = {
  amount: number | string;
  label?: string;
};

export function CoinBadge({ amount, label = 'Coin' }: Props) {
  return (
    <View style={styles.base}>
      <AppText variant="caption" color="coin">
        {label} {amount}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignSelf: 'flex-start',
    backgroundColor: colors.coinSoft,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xxs,
  },
});

