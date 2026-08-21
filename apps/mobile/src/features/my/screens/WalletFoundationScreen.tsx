import { StyleSheet, View } from 'react-native';
import {
  AppText,
  CoinBadge,
  ScreenContainer,
  Stack,
  colors,
  spacing,
} from '@jjoin/design-system';
import { t } from '@jjoin/i18n';
import { useSession } from '../../../session/SessionContext';

export function WalletFoundationScreen() {
  const { me } = useSession();
  const wallet = me?.walletSummary;

  return (
    <ScreenContainer>
      <Stack gap="md">
        <AppText variant="title">{t('wallet.title')}</AppText>
        <AppText variant="caption" color="textSecondary">
          {t('wallet.foundationNote')}
        </AppText>
        <CoinBadge amount={wallet?.availableCoin ?? '0'} label={t('wallet.available')} />
        <CoinBadge amount={wallet?.heldCoin ?? '0'} label={t('wallet.hold')} />
        <AppText variant="subtitle">거래내역</AppText>
        {(wallet?.recentTransactions.length ?? 0) === 0 ? (
          <AppText color="textSecondary">{t('wallet.emptyTx')}</AppText>
        ) : (
          wallet?.recentTransactions.map((tx) => (
            <View key={tx.id} style={styles.tx}>
              <AppText variant="body">{tx.label}</AppText>
              <AppText variant="bodyStrong">{tx.amount}</AppText>
            </View>
          ))
        )}
      </Stack>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  tx: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
});
