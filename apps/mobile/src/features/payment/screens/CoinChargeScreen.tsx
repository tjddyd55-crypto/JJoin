import { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import {
  Button,
  Card,
  Chip,
  Input,
  Row,
  ScrollScreenFrame,
  Spacer,
  Text,
  useTheme,
} from '@jjoin/design-system';
import {
  COIN_CUSTOM_PRODUCT_CODE,
  COIN_KRW_RATE,
  COIN_PURCHASE_MIN_AMOUNT,
  COIN_PURCHASE_STEP,
  formatCoinWithLabel,
  formatNumber,
  parseCoinPurchaseInput,
  validateVariableCoinPurchaseAmount,
} from '@jjoin/domain';
import { PaymentProductType } from '@jjoin/types';
import { getApiClient } from '../../../lib/api';
import { getSecureSessionStore, useSession } from '../../../session/SessionContext';
import { NESTED_SCREEN_EDGES } from '../../../ui/nested-screen';
import { consumeCoinChargePaymentHandoff } from '../payment-return-handoff';

const QUICK_AMOUNTS = [100, 500, 1000];

function formatKrw(price: number) {
  return `${formatNumber(price)}원`;
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
  const [customProductId, setCustomProductId] = useState<string | null>(null);
  const [coinInput, setCoinInput] = useState('');
  const [balance, setBalance] = useState<string>('0');
  const [error, setError] = useState<string | null>(null);
  const [successCoin, setSuccessCoin] = useState<string | null>(null);
  const [successBalance, setSuccessBalance] = useState<string | null>(null);

  const parsedCoin = useMemo(() => parseCoinPurchaseInput(coinInput), [coinInput]);
  const validation = useMemo(
    () =>
      parsedCoin == null && coinInput.trim() === ''
        ? null
        : validateVariableCoinPurchaseAmount(parsedCoin),
    [coinInput, parsedCoin],
  );

  const refreshBalance = useCallback(async () => {
    const wallet = await api.getWallet();
    setBalance(wallet.availableCoin);
    return wallet.availableCoin;
  }, [api]);

  const loadCustomProduct = useCallback(async () => {
    const items = await api.listPaymentProducts(PaymentProductType.COIN_CHARGE);
    const custom = items.find((p) => p.code === COIN_CUSTOM_PRODUCT_CODE);
    setCustomProductId(custom?.id ?? null);
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
    void loadCustomProduct().catch(() => setError('충전 상품을 불러오지 못했습니다.'));
  }, [loadCustomProduct]);

  useEffect(() => {
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

  const onCharge = () => {
    if (!customProductId || !validation?.ok) return;
    setError(null);
    setSuccessCoin(null);
    setSuccessBalance(null);
    router.push({
      pathname: '/my/payment-checkout',
      params: {
        productId: customProductId,
        coinAmount: String(validation.coinAmount),
        returnTo: 'coin-charge',
      },
    });
  };

  const onSuccessAck = () => {
    const next = successBalance ?? balance;
    setBalance(next);
    setSuccessCoin(null);
    setSuccessBalance(null);
    void refreshBalance().catch(() => undefined);
  };

  const validationMessage =
    coinInput.trim() === ''
      ? null
      : validation && !validation.ok
        ? validation.message
        : null;

  const priceKrw = validation?.ok ? validation.priceKrw : null;
  const ctaLabel =
    priceKrw != null ? `${formatKrw(priceKrw)} 결제하기` : '충전할 코인을 입력하세요';

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
      <Text variant="sectionTitle">코인 충전</Text>
      <Spacer size="sm" />
      <Text variant="meta" tone="secondary">
        보유 코인 {formatCoinWithLabel(balance)}
      </Text>

      <Spacer size="lg" />
      <Text variant="bodyStrong">충전할 코인</Text>
      <Spacer size="xs" />
      <Row gap="sm" align="center">
        <View style={styles.inputWrap}>
          <Input
            value={coinInput}
            onChangeText={(text) => {
              const digits = text.replace(/[^\d]/g, '');
              setCoinInput(digits);
            }}
            keyboardType="number-pad"
            placeholder={`${COIN_PURCHASE_MIN_AMOUNT}`}
            accessibilityLabel="충전할 코인"
          />
        </View>
        <Text variant="bodyStrong">Coin</Text>
      </Row>
      <Spacer size="xs" />
      <Text variant="caption" tone="tertiary">
        {COIN_PURCHASE_STEP} Coin 단위로 충전할 수 있습니다.
      </Text>
      {validationMessage ? (
        <>
          <Spacer size="xs" />
          <Text variant="caption" tone="error">
            {validationMessage}
          </Text>
        </>
      ) : null}

      <Spacer size="md" />
      <Row gap="sm" style={styles.chipRow}>
        {QUICK_AMOUNTS.map((amount) => (
          <Chip
            key={amount}
            label={`${amount} Coin`}
            selected={parsedCoin === amount}
            onPress={() => setCoinInput(String(amount))}
          />
        ))}
      </Row>

      <Spacer size="lg" />
      <Card variant="base" padding="md">
        <Text variant="meta" tone="secondary">결제금액</Text>
        <Text variant="sectionTitle">
          {priceKrw != null ? formatKrw(priceKrw) : '—'}
        </Text>
        {validation?.ok ? (
          <>
            <Spacer size="xs" />
            <Text variant="meta" tone="secondary">
              충전 코인 {formatCoinWithLabel(String(validation.coinAmount))}
            </Text>
          </>
        ) : null}
        <Spacer size="sm" />
        <Text variant="caption" tone="tertiary">
          1 Coin = {COIN_KRW_RATE.toLocaleString('ko-KR')}원
        </Text>
      </Card>

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
        label={ctaLabel}
        disabled={!customProductId || !validation?.ok}
        onPress={onCharge}
      />
    </ScrollScreenFrame>
  );
}

const styles = StyleSheet.create({
  inputWrap: { flex: 1 },
  chipRow: { flexWrap: 'wrap' },
});
