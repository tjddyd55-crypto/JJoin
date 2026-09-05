import { StyleSheet, View, Pressable } from 'react-native';
import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import {
  Button,
  Card,
  ScrollScreenFrame,
  Spacer,
  Text,
  useTheme,
} from '@jjoin/design-system';
import {
  formatCoinTransactionLabelKo,
  formatCoinWithLabel,
  formatSignedCoinAmount,
  matchesWalletTransactionFilter,
  type WalletTransactionFilter,
} from '@jjoin/domain';
import { t } from '@jjoin/i18n';
import type { WalletTransactionDto } from '@jjoin/types';
import { getApiClient } from '../../../lib/api';
import { getSecureSessionStore } from '../../../session/SessionContext';
import { NESTED_SCREEN_EDGES } from '../../../ui/nested-screen';

const FILTERS: Array<{ id: WalletTransactionFilter; label: string }> = [
  { id: 'ALL', label: '전체' },
  { id: 'CREDIT', label: '적립' },
  { id: 'DEBIT', label: '사용' },
  { id: 'HOLD', label: 'HOLD' },
];

export function WalletTransactionsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const api = useMemo(() => getApiClient(getSecureSessionStore()), []);
  const [items, setItems] = useState<WalletTransactionDto[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [filter, setFilter] = useState<WalletTransactionFilter>('ALL');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const loadInitial = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getWalletTransactions({ limit: 20 });
      setItems(res.items);
      setCursor(res.nextCursor);
    } catch {
      setError('거래내역을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [api]);

  const loadMore = useCallback(async () => {
    if (!cursor || loading) return;
    setLoading(true);
    try {
      const res = await api.getWalletTransactions({ cursor, limit: 20 });
      setItems((prev) => [...prev, ...res.items]);
      setCursor(res.nextCursor);
    } finally {
      setLoading(false);
    }
  }, [api, cursor, loading]);

  useFocusEffect(
    useCallback(() => {
      void loadInitial();
    }, [loadInitial]),
  );

  const visible = items.filter((row) =>
    matchesWalletTransactionFilter(filter, { direction: row.direction, type: row.type }),
  );

  return (
    <ScrollScreenFrame edges={[...NESTED_SCREEN_EDGES]}>
      <View style={styles.filters}>
        {FILTERS.map((f) => (
          <Pressable
            key={f.id}
            accessibilityRole="button"
            onPress={() => setFilter(f.id)}
            style={[
              styles.chip,
              {
                borderColor:
                  filter === f.id ? theme.colors.action.primary : theme.colors.border.subtle,
              },
            ]}
          >
            <Text variant="caption" tone={filter === f.id ? 'primary' : 'secondary'}>
              {f.label}
            </Text>
          </Pressable>
        ))}
      </View>
      <Spacer size="md" />
      {error ? <Text variant="body" tone="error">{error}</Text> : null}
      {visible.length === 0 && !loading ? (
        <Text variant="body" tone="secondary">{t('wallet.emptyTx')}</Text>
      ) : (
        visible.map((tx) => (
          <Card key={tx.id} variant="base" padding="md" style={styles.row}>
            <View style={styles.rowTop}>
              <Text variant="bodyStrong" tone="primary">
                {formatSignedCoinAmount(tx.amount)}
              </Text>
              <Text variant="caption" tone="tertiary">
                {new Date(tx.createdAt).toLocaleString('ko-KR')}
              </Text>
            </View>
            <Text variant="body" tone="secondary">
              {tx.label || formatCoinTransactionLabelKo(tx.type)}
            </Text>
            {tx.reference.refType === 'JOIN' && tx.reference.refId ? (
              <Button
                label="관련 조인"
                variant="secondary"
                fullWidth={false}
                onPress={() => router.push(`/join/${tx.reference.refId}`)}
              />
            ) : null}
          </Card>
        ))
      )}
      {cursor ? (
        <>
          <Spacer size="md" />
          <Button label="더 보기" variant="secondary" loading={loading} onPress={() => void loadMore()} />
        </>
      ) : null}
    </ScrollScreenFrame>
  );
}

const styles = StyleSheet.create({
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  row: { marginBottom: 8 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
