import { View, StyleSheet } from 'react-native';
import { AppText } from '../primitives/AppText';
import { colors, radius, spacing } from '../tokens';

type Props = {
  amount: number | string;
  label?: string;
};

/** Local display helper — keep design-system free of @jjoin/domain. */
function formatBadgeAmount(amount: number | string): string {
  if (amount === '' || amount === '—') return String(amount);
  const n = typeof amount === 'number' ? amount : Number(String(amount).replace(/,/g, ''));
  if (!Number.isFinite(n)) return '0';
  const truncated = Math.trunc(n);
  const sign = truncated < 0 ? '-' : '';
  const digits = String(Math.abs(truncated));
  return `${sign}${digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
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
