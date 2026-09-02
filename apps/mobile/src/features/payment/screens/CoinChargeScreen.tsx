import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  Button,
  Card,
  ScrollScreenFrame,
  Spacer,
  Text,
  useTheme,
} from '@jjoin/design-system';
import { formatCoinWithLabel, formatNumber } from '@jjoin/domain';
import { PaymentProductType, type PaymentProductDto } from '@jjoin/types';
import { getApiClient } from '../../../lib/api';
import { getSecureSessionStore, useSession } from '../../../session/SessionContext';
import { NESTED_SCREEN_EDGES } from '../../../ui/nested-screen';
import { runPaymentCheckout } from '../payment-checkout';

function formatKrw(price: number) {
  return `₩${formatNumber(price)}`;
}

export function CoinChargeScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { refreshMe } = useSession();
  const api = useMemo(() => getApiClient(getSecureSessionStore()), []);
  const [products, setProducts] = useState<PaymentProductDto[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [balance, setBalance] = useState<string>('0');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successCoin, setSuccessCoin] = useState<string | null>(null);
  const [successBalance, setSuccessBalance] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [items, wallet] = await Promise.all([
      api.listPaymentProducts(PaymentProductType.COIN_CHARGE),
      api.getWallet(),
    ]);
    setProducts(items);
    setBalance(wallet.availableCoin);
    if (!selectedId && items[0]) setSelectedId(items[0].id);
  }, [api, selectedId]);

  useEffect(() => {
    void load().catch(() => setError('상품을 불러오지 못했습니다.'));
  }, [load]);

  const selected = products.find((p) => p.id === selectedId) ?? null;

  const onCharge = async () => {
    if (!selected || busy) return;
    setBusy(true);
    setError(null);
    const result = await runPaymentCheckout(api, selected.id);
    if (!result.ok) {
      setError(
        result.reason === 'cancelled'
          ? '결제가 취소되었습니다.'
          : '결제를 완료하지 못했습니다. 다시 시도해주세요.',
      );
      setBusy(false);
      return;
    }
    await refreshMe();
    const wallet = await api.getWallet();
    setSuccessCoin(result.data.coinCredited ?? selected.coinAmount ?? '0');
    setSuccessBalance(wallet.availableCoin);
    setBusy(false);
  };

  if (successCoin) {
    return (
      <ScrollScreenFrame edges={[...NESTED_SCREEN_EDGES]}>
        <Text variant="sectionTitle">충전이 완료되었습니다.</Text>
        <Spacer size="sm" />
        <Text variant="body" tone="secondary">
          {formatCoinWithLabel(successCoin)}가 충전되었습니다.
        </Text>
        <Spacer size="md" />
        <Card variant="elevated" padding="md">
          <Text variant="meta" tone="secondary">
            현재 보유 코인
          </Text>
          <Text variant="coinLarge" style={{ color: theme.colors.reward.primary }}>
            {formatCoinWithLabel(successBalance ?? balance)}
          </Text>
        </Card>
        <Spacer size="lg" />
        <Button label="확인" onPress={() => router.back()} />
      </ScrollScreenFrame>
    );
  }

  return (
    <ScrollScreenFrame edges={[...NESTED_SCREEN_EDGES]}>
      <Text variant="meta" tone="secondary">
        보유 코인
      </Text>
      <Text variant="coinLarge" style={{ color: theme.colors.reward.primary }}>
        {formatCoinWithLabel(balance)}
      </Text>

      <Spacer size="lg" />
      <Text variant="sectionTitle">충전 상품</Text>
      <Spacer size="sm" />
      {products.map((product) => (
        <Pressable key={product.id} onPress={() => setSelectedId(product.id)}>
          <Card
            variant={product.id === selectedId ? 'elevated' : 'base'}
            padding="md"
            style={styles.productCard}
          >
            <View style={styles.productRow}>
              <Text variant="bodyStrong">{formatCoinWithLabel(product.coinAmount ?? '0')}</Text>
              <Text variant="body" tone="secondary">
                {formatKrw(product.price)}
              </Text>
            </View>
          </Card>
        </Pressable>
      ))}

      {selected ? (
        <>
          <Spacer size="md" />
          <Card variant="base" padding="md">
            <Text variant="bodyStrong">{selected.name}</Text>
            <Spacer size="xs" />
            <Text variant="meta" tone="secondary">
              충전 코인 {formatCoinWithLabel(selected.coinAmount ?? '0')}
            </Text>
            <Text variant="meta" tone="secondary">
              결제 금액 {formatKrw(selected.price)}
            </Text>
          </Card>
        </>
      ) : null}

      {error ? (
        <>
          <Spacer size="sm" />
          <Text variant="body" tone="error">
            {error}
          </Text>
        </>
      ) : null}

      <Spacer size="lg" />
      <Button
        label={selected ? `${formatKrw(selected.price)} 충전하기` : '상품을 선택하세요'}
        disabled={!selected || busy}
        loading={busy}
        onPress={() => void onCharge()}
      />
    </ScrollScreenFrame>
  );
}

const styles = StyleSheet.create({
  productCard: { marginBottom: 8 },
  productRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
