import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
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
import { consumeCoinChargePaymentHandoff } from '../payment-return-handoff';

function formatKrw(price: number) {
  return `₩${formatNumber(price)}`;
}

export function CoinChargeScreen() {
  const theme = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{
    successCoin?: string;
    successBalance?: string;
    paymentError?: string;
  }>();
  const { refreshMe } = useSession();
  const api = useMemo(() => getApiClient(getSecureSessionStore()), []);
  const [products, setProducts] = useState<PaymentProductDto[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [balance, setBalance] = useState<string>('0');
  const [error, setError] = useState<string | null>(null);
  const [successCoin, setSuccessCoin] = useState<string | null>(null);
  const [successBalance, setSuccessBalance] = useState<string | null>(null);

  const refreshBalance = useCallback(async () => {
    const wallet = await api.getWallet();
    setBalance(wallet.availableCoin);
    return wallet.availableCoin;
  }, [api]);

  const loadProducts = useCallback(async () => {
    const items = await api.listPaymentProducts(PaymentProductType.COIN_CHARGE);
    setProducts(items);
    setSelectedId((current) => current ?? items[0]?.id ?? null);
  }, [api]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      void (async () => {
        try {
          const handoff = consumeCoinChargePaymentHandoff();
          if (handoff) {
            if (cancelled) return;
            setSuccessCoin(handoff.credited);
            setSuccessBalance(handoff.balance);
            setBalance(handoff.balance);
            setError(null);
            await refreshMe();
            return;
          }

          const nextBalance = await refreshBalance();
          if (cancelled) return;
          setBalance(nextBalance);
          await refreshMe();
        } catch {
          if (!cancelled) setError('잔액을 불러오지 못했습니다.');
        }
      })();

      return () => {
        cancelled = true;
      };
    }, [refreshBalance, refreshMe]),
  );

  useEffect(() => {
    void loadProducts().catch(() => setError('상품을 불러오지 못했습니다.'));
  }, [loadProducts]);

  useEffect(() => {
    // Legacy deep-link / replace params fallback.
    if (params.successCoin) {
      setSuccessCoin(params.successCoin);
      setSuccessBalance(params.successBalance ?? null);
      if (params.successBalance) setBalance(params.successBalance);
      void refreshMe();
      return;
    }
    if (params.paymentError === 'cancelled') {
      setError('결제가 취소되었습니다.');
    }
  }, [params.paymentError, params.successBalance, params.successCoin, refreshMe]);

  const selected = products.find((p) => p.id === selectedId) ?? null;

  const onCharge = () => {
    if (!selected) return;
    setError(null);
    setSuccessCoin(null);
    setSuccessBalance(null);
    router.push({
      pathname: '/my/payment-checkout',
      params: { productId: selected.id, returnTo: 'coin-charge' },
    });
  };

  const onSuccessAck = () => {
    const next = successBalance ?? balance;
    setBalance(next);
    setSuccessCoin(null);
    setSuccessBalance(null);
    void refreshBalance().catch(() => undefined);
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
        <Button label="확인" onPress={onSuccessAck} />
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
        disabled={!selected}
        onPress={onCharge}
      />
    </ScrollScreenFrame>
  );
}

const styles = StyleSheet.create({
  productCard: { marginBottom: 8 },
  productRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
