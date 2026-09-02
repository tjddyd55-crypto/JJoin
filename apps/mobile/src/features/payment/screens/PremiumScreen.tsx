import { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  Badge,
  Button,
  Card,
  ScrollScreenFrame,
  Spacer,
  Text,
} from '@jjoin/design-system';
import { formatNumber } from '@jjoin/domain';
import { PaymentProductType, type PaymentProductDto, type PremiumStatusDto } from '@jjoin/types';
import { getApiClient } from '../../../lib/api';
import { getSecureSessionStore, useSession } from '../../../session/SessionContext';
import { NESTED_SCREEN_EDGES } from '../../../ui/nested-screen';
import { runPaymentCheckout } from '../payment-checkout';

function formatKrw(price: number) {
  return `₩${formatNumber(price)}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ko-KR');
}

export function PremiumScreen() {
  const router = useRouter();
  const { me, refreshMe } = useSession();
  const api = useMemo(() => getApiClient(getSecureSessionStore()), []);
  const [product, setProduct] = useState<PaymentProductDto | null>(null);
  const [premium, setPremium] = useState<PremiumStatusDto | null>(me?.premiumStatus ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successPremium, setSuccessPremium] = useState<PremiumStatusDto | null>(null);

  const load = useCallback(async () => {
    const [items, status] = await Promise.all([
      api.listPaymentProducts(PaymentProductType.PREMIUM_PASS),
      api.getPremiumStatus(),
    ]);
    setProduct(items[0] ?? null);
    setPremium(status);
  }, [api]);

  useEffect(() => {
    void load().catch(() => setError('프리미엄 정보를 불러오지 못했습니다.'));
  }, [load]);

  const onPurchase = async () => {
    if (!product || busy) return;
    setBusy(true);
    setError(null);
    const result = await runPaymentCheckout(api, product.id);
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
    const status = await api.getPremiumStatus();
    setSuccessPremium(status);
    setBusy(false);
  };

  if (successPremium) {
    return (
      <ScrollScreenFrame edges={[...NESTED_SCREEN_EDGES]}>
        <Badge label="PREMIUM" variant="gold" />
        <Spacer size="sm" />
        <Text variant="sectionTitle">프리미엄 가입이 완료되었습니다.</Text>
        <Spacer size="sm" />
        <Text variant="body" tone="secondary">
          Premium 회원 혜택이 지금부터 적용됩니다.
        </Text>
        <Spacer size="md" />
        <Card variant="elevated" padding="md">
          <Text variant="meta" tone="secondary">
            이용기간
          </Text>
          <Text variant="bodyStrong">
            {successPremium.startedAt ? formatDate(successPremium.startedAt) : '-'} ~{' '}
            {successPremium.expiresAt ? formatDate(successPremium.expiresAt) : '-'}
          </Text>
        </Card>
        <Spacer size="lg" />
        <Button label="확인" onPress={() => router.back()} />
      </ScrollScreenFrame>
    );
  }

  const active = premium?.active ?? false;

  return (
    <ScrollScreenFrame edges={[...NESTED_SCREEN_EDGES]}>
      {active ? <Badge label="PREMIUM" variant="gold" /> : null}
      <Spacer size="sm" />
      <Text variant="screenTitle">프리미엄 회원</Text>
      <Spacer size="xs" />
      <Text variant="body" tone="secondary">
        조인을 더 자유롭게 만들어보세요.
      </Text>

      <Spacer size="lg" />
      <Card variant="base" padding="md">
        <Text variant="sectionTitle">Premium 혜택</Text>
        <Spacer size="sm" />
        <Text variant="body">✓ 조인방 생성 제한 해제</Text>
        <Text variant="body">✓ 프리미엄 이용기간 동안 반복 생성 가능</Text>
        <Text variant="body">✓ 향후 프리미엄 전용 혜택 제공</Text>
      </Card>

      {active && premium?.expiresAt ? (
        <>
          <Spacer size="md" />
          <Card variant="elevated" padding="md">
            <Text variant="meta" tone="secondary">
              현재 프리미엄 회원입니다.
            </Text>
            <Text variant="bodyStrong">{formatDate(premium.expiresAt)}까지</Text>
            {premium.startedAt ? (
              <Text variant="meta" tone="secondary">
                이용기간 {formatDate(premium.startedAt)} ~ {formatDate(premium.expiresAt)}
              </Text>
            ) : null}
          </Card>
        </>
      ) : null}

      {product ? (
        <>
          <Spacer size="lg" />
          <View style={styles.priceCard}>
            <Text variant="sectionTitle">{product.name}</Text>
            <Text variant="headline">{formatKrw(product.price)}</Text>
          </View>
          <Spacer size="md" />
          <Card variant="base" padding="md">
            <Text variant="bodyStrong">{product.name}</Text>
            <Spacer size="xs" />
            <Text variant="meta" tone="secondary">
              결제 금액 {formatKrw(product.price)}
            </Text>
            <Text variant="meta" tone="secondary">
              결제 완료 즉시 Premium 회원 혜택이 적용됩니다.
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
        label={
          product
            ? active
              ? `${formatKrw(product.price)} 연장하기`
              : `${formatKrw(product.price)} 프리미엄 시작하기`
            : '상품 준비 중'
        }
        disabled={!product || busy}
        loading={busy}
        onPress={() => void onPurchase()}
      />
    </ScrollScreenFrame>
  );
}

const styles = StyleSheet.create({
  priceCard: { gap: 4 },
});
