import { View, StyleSheet } from 'react-native';
import { AppText } from '../primitives/AppText';
import { colors, radius, spacing } from '../tokens';

type Props = {
  amount: number | string;
  label?: string;
};

function formatBadgeAmount(amount: number | string): string {
  if (amount === '' || amount === '—') return String(amount);
  const n = typeof amount === 'number' ? amount : Number(String(amount).replace(/,/g, ''));
  if (!Number.isFinite(n)) return String(amount);
  return new Intl.NumberFormat('ko-KR').format(n);
}

export function CoinBadge({ amount, label = 'Coin' }: Props) {
  return (
    <View style={styles.base}>
      <AppText variant="caption" color="coin">
        {label} {formatBadgeAmount(amount)}
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

