import { StyleSheet, View } from 'react-native';
import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import {
  Badge,
  Button,
  Card,
  ScrollScreenFrame,
  Spacer,
  Text,
  useTheme,
} from '@jjoin/design-system';
import { formatCoinWithLabel, formatSignedCoinAmount } from '@jjoin/domain';
import { t } from '@jjoin/i18n';
import type { WalletSummaryDto } from '@jjoin/types';
import { getApiClient } from '../../../lib/api';
import { getSecureSessionStore } from '../../../session/SessionContext';
import { NESTED_SCREEN_EDGES } from '../../../ui/nested-screen';

export function WalletFoundationScreen() {
  const theme = useTheme();
  const router = useRouter();
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

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  return (
    <ScrollScreenFrame edges={[...NESTED_SCREEN_EDGES]}>
      <Text variant="body" tone="secondary">
        {t('wallet.foundationNote')}
      </Text>
      {error ? (
        <>
          <Spacer size="sm" />
          <Text variant="body" tone="error">
            {error}
          </Text>
        </>
      ) : null}

      <Spacer size="md" />
      <Card variant="elevated" padding="md">
        <Text variant="caption" tone="tertiary">
          {t('wallet.total')}
        </Text>
        <Text variant="headline" style={{ color: theme.colors.action.primary }}>
          {formatCoinWithLabel(wallet?.totalCoin ?? '0')}
        </Text>
        <Spacer size="sm" />
        <View style={styles.row}>
          <Badge
            label={`${t('wallet.available')} ${formatCoinWithLabel(wallet?.availableCoin ?? '0')}`}
            variant="gold"
          />
          <Badge
            label={`${t('wallet.hold')} ${formatCoinWithLabel(wallet?.heldCoin ?? '0')}`}
            variant="neutral"
          />
        </View>
      </Card>

      <Spacer size="lg" />
      <Text variant="sectionTitle" tone="primary">
        거래내역
      </Text>
      <Spacer size="sm" />
      <Button
        label="코인 충전"
        variant="secondary"
        onPress={() => router.push('/my/coin-charge')}
      />
      <Spacer size="sm" />
      <Button
        label="결제 내역"
        variant="secondary"
        onPress={() => router.push('/my/payment-history')}
      />
      <Spacer size="md" />
      {(wallet?.recentTransactions.length ?? 0) === 0 ? (
        <Text variant="body" tone="secondary">
          {t('wallet.emptyTx')}
        </Text>
      ) : (
        wallet?.recentTransactions.map((tx) => (
          <View
            key={tx.id}
            style={[
              styles.tx,
              { borderBottomColor: theme.colors.border.subtle },
            ]}
          >
            <Text variant="body" tone="primary">
              {tx.label}
            </Text>
            <Text variant="bodyStrong" tone="primary">
              {formatSignedCoinAmount(tx.amount)}
            </Text>
          </View>
        ))
      )}
    </ScrollScreenFrame>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  tx: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
