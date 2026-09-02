import { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ScrollScreenFrame, Spacer, Text } from '@jjoin/design-system';
import { formatNumber } from '@jjoin/domain';
import { PaymentStatus, type PaymentListItemDto } from '@jjoin/types';
import { getApiClient } from '../../../lib/api';
import { getSecureSessionStore } from '../../../session/SessionContext';
import { NESTED_SCREEN_EDGES } from '../../../ui/nested-screen';

function statusLabel(status: PaymentStatus) {
  switch (status) {
    case PaymentStatus.PAID:
      return '결제완료';
    case PaymentStatus.FAILED:
      return '실패';
    case PaymentStatus.CANCELED:
      return '취소';
    case PaymentStatus.REFUNDED:
      return '환불';
    default:
      return '진행중';
  }
}

export function PaymentHistoryScreen() {
  const api = useMemo(() => getApiClient(getSecureSessionStore()), []);
  const [items, setItems] = useState<PaymentListItemDto[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await api.listMyPayments();
    setItems(res.items);
    setError(null);
  }, [api]);

  useEffect(() => {
    void load().catch(() => setError('결제 내역을 불러오지 못했습니다.'));
  }, [load]);

  return (
    <ScrollScreenFrame edges={[...NESTED_SCREEN_EDGES]}>
      {error ? (
        <Text variant="body" tone="error">
          {error}
        </Text>
      ) : null}
      {items.length === 0 ? (
        <Text variant="body" tone="secondary">
          결제 내역이 없습니다.
        </Text>
      ) : (
        items.map((item) => (
          <View key={item.id} style={styles.row}>
            <View>
              <Text variant="meta" tone="secondary">
                {new Date(item.approvedAt ?? item.createdAt).toLocaleDateString('ko-KR')}
              </Text>
              <Text variant="bodyStrong">{item.productName}</Text>
            </View>
            <View style={styles.right}>
              <Text variant="body">{formatNumber(item.amount)}원</Text>
              <Text variant="meta" tone="secondary">
                {statusLabel(item.status)}
              </Text>
            </View>
          </View>
        ))
      )}
      <Spacer size="lg" />
    </ScrollScreenFrame>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  right: { alignItems: 'flex-end', gap: 2 },
});
