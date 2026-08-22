import { StyleSheet, View } from 'react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AppText,
  CoinBadge,
  ScreenContainer,
  Stack,
  colors,
  spacing,
} from '@jjoin/design-system';
import { t } from '@jjoin/i18n';
import type { WalletSummaryDto } from '@jjoin/types';
import { getApiClient } from '../../../lib/api';
import { getSecureSessionStore } from '../../../session/SessionContext';

export function WalletFoundationScreen() {
  const api = useMemo(() => getApiClient(getSecureSessionStore()), []);
  const [wallet, setWallet] = useState<WalletSummaryDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const summary = await api.getWallet();
      setWallet(summary);
      setError(null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'wallet_load_failed';
      setError(msg.includes('401') ? '로그인이 필요합니다.' : '월렛을 불러오지 못했습니다.');
    }
  }, [api]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <ScreenContainer>
      <Stack gap="md">
        <AppText variant="title">{t('wallet.title')}</AppText>
        <AppText variant="caption" color="textSecondary">
          {t('wallet.foundationNote')}
        </AppText>
        {error ? <AppText color="danger">{error}</AppText> : null}
        <CoinBadge amount={wallet?.totalCoin ?? '—'} label={t('wallet.total')} />
        <CoinBadge amount={wallet?.availableCoin ?? '—'} label={t('wallet.available')} />
        <CoinBadge amount={wallet?.heldCoin ?? '—'} label={t('wallet.hold')} />
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
