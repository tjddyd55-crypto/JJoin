import { Pressable, StyleSheet, View } from 'react-native';
import { Card, Icon, Text, spacing, useTheme } from '@jjoin/design-system';
import { formatCoinWithLabel } from '@jjoin/domain';

type Props = {
  availableCoin: string;
  onPressOrders?: () => void;
};

export function MallCoinBalanceCard({ availableCoin, onPressOrders }: Props) {
  const theme = useTheme();

  return (
    <Card variant="elevated" padding="md" style={styles.card}>
      <View style={styles.row}>
        <View style={[styles.iconPlate, { backgroundColor: theme.colors.reward.light }]}>
          <Icon name="coin" size="md" tone="gold" />
        </View>
        <View style={styles.copy}>
          <Text variant="caption" tone="secondary">보유 코인</Text>
          <Text variant="sectionTitle">{formatCoinWithLabel(availableCoin)}</Text>
        </View>
        {onPressOrders ? (
          <Pressable accessibilityRole="button" onPress={onPressOrders} style={styles.ordersLink}>
            <Text variant="caption" tone="primary">구매내역</Text>
            <Icon name="chevronRight" size="sm" tone="primary" />
          </Pressable>
        ) : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  iconPlate: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: { flex: 1, gap: 2 },
  ordersLink: { flexDirection: 'row', alignItems: 'center', gap: 2 },
});
