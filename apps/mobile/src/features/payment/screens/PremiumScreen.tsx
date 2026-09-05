import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Badge,
  Button,
  Card,
  ScrollScreenFrame,
  Spacer,
  Text,
} from '@jjoin/design-system';
import { formatNumber } from '@jjoin/domain';
import {
  PremiumPlanCode,
  type PremiumPlanSettingsDto,
  type PremiumStatusDto,
} from '@jjoin/types';
import { getApiClient } from '../../../lib/api';
import { getSecureSessionStore, useSession } from '../../../session/SessionContext';
import { NESTED_SCREEN_EDGES } from '../../../ui/nested-screen';

function formatKrw(price: number) {
  return `₩${formatNumber(price)}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ko-KR');
}

function planLabel(plan: PremiumPlanCode | null) {
  if (plan === PremiumPlanCode.PREMIUM_YEARLY) return '연간 Premium';
  if (plan === PremiumPlanCode.PREMIUM_MONTHLY) return '월간 Premium';
  return 'Premium';
}

export function PremiumScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ paymentSuccess?: string; paymentError?: string }>();
  const { me, refreshMe } = useSession();
  const api = useMemo(() => getApiClient(getSecureSessionStore()), []);
  const [plans, setPlans] = useState<PremiumPlanSettingsDto | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<PremiumPlanCode>(PremiumPlanCode.PREMIUM_MONTHLY);
  const [premium, setPremium] = useState<PremiumStatusDto | null>(me?.premiumStatus ?? null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [successPremium, setSuccessPremium] = useState<PremiumStatusDto | null>(null);

  const load = useCallback(async () => {
    const [planSettings, status] = await Promise.all([
      api.getPremiumPlans(),
      api.getPremiumStatus(),
    ]);
    setPlans(planSettings);
    setPremium(status);
  }, [api]);

  useEffect(() => {
    void load().catch(() => setError('프리미엄 정보를 불러오지 못했습니다.'));
  }, [load]);

  useEffect(() => {
    if (params.paymentSuccess === '1') {
      void (async () => {
        await refreshMe();
        const status = await api.getPremiumStatus();
        setSuccessPremium(status);
        setPremium(status);
      })();
      return;
    }
    if (params.paymentError === 'cancelled') {
      setError('결제가 취소되었습니다.');
    }
  }, [api, params.paymentError, params.paymentSuccess, refreshMe]);

  const onSubscribe = async () => {
    if (!plans) return;
    setBusy(true);
    setError(null);
    try {
      const init = await api.initPremiumSubscription({ plan: selectedPlan });
      router.push({
        pathname: '/my/payment-checkout',
        params: {
          billingAuthUrl: init.billingAuthUrl,
          customerKey: init.customerKey,
          plan: selectedPlan,
          returnTo: 'premium-billing',
        },
      });
    } catch {
      setError('Premium 가입을 시작하지 못했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setBusy(false);
    }
  };

  const onCancelSubscription = async () => {
    setBusy(true);
    setError(null);
    try {
      const status = await api.cancelPremiumSubscription();
      setPremium(status);
      await refreshMe();
    } catch {
      setError('구독 해지 예약에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  };

  if (successPremium) {
    return (
      <ScrollScreenFrame edges={[...NESTED_SCREEN_EDGES]}>
        <Badge label="PREMIUM" variant="gold" />
        <Spacer size="sm" />
        <Text variant="sectionTitle">Premium 가입이 완료되었습니다.</Text>
        <Spacer size="sm" />
        <Text variant="body" tone="secondary">
          {planLabel(successPremium.plan)} 혜택이 적용됩니다.
        </Text>
        <Spacer size="md" />
        <Card variant="elevated" padding="md">
          <Text variant="meta" tone="secondary">이용기간</Text>
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
  const monthlyPrice = plans?.monthlyPriceKrw ?? 0;
  const yearlyPrice = plans?.yearlyPriceKrw ?? 0;

  return (
    <ScrollScreenFrame edges={[...NESTED_SCREEN_EDGES]}>
      {active ? <Badge label="PREMIUM" variant="gold" /> : null}
      <Spacer size="sm" />
      <Text variant="screenTitle">Premium</Text>
      <Spacer size="xs" />
      <Text variant="body" tone="secondary">
        {active ? 'Premium 이용 중' : '더 많은 혜택을 이용해보세요.'}
      </Text>

      <Spacer size="lg" />
      <Card variant="base" padding="md">
        <Text variant="sectionTitle">Premium 혜택</Text>
        <Spacer size="sm" />
        <Text variant="body">✓ 조인방 생성 제한 해제</Text>
        <Text variant="body">✓ 조인방 생성 비용 혜택 (정책에 따라 적용)</Text>
        <Text variant="body">✓ Premium 배지</Text>
      </Card>

      {active && premium ? (
        <>
          <Spacer size="md" />
          <Card variant="elevated" padding="md">
            <Text variant="meta" tone="secondary">현재 플랜</Text>
            <Text variant="bodyStrong">{planLabel(premium.plan)}</Text>
            {premium.expiresAt ? (
              <Text variant="meta" tone="secondary">
                {premium.cancelAtPeriodEnd ? '이용 종료일' : '다음 결제일'}{' '}
                {formatDate(premium.nextBillingAt ?? premium.expiresAt)}
              </Text>
            ) : null}
            {premium.cancelAtPeriodEnd ? (
              <Text variant="meta" tone="secondary">해지 예약됨 · 기간 종료 시 만료</Text>
            ) : null}
          </Card>
          {!premium.cancelAtPeriodEnd ? (
            <>
              <Spacer size="md" />
              <Button label="구독 해지 예약" variant="secondary" disabled={busy} onPress={() => void onCancelSubscription()} />
            </>
          ) : null}
        </>
      ) : (
        <>
          <Spacer size="lg" />
          <Text variant="sectionTitle">플랜 선택</Text>
          <Spacer size="sm" />
          {plans?.monthlyEnabled ? (
            <Pressable onPress={() => setSelectedPlan(PremiumPlanCode.PREMIUM_MONTHLY)}>
              <Card
                variant={selectedPlan === PremiumPlanCode.PREMIUM_MONTHLY ? 'elevated' : 'base'}
                padding="md"
                style={styles.planCard}
              >
                <View style={styles.planRow}>
                  <Text variant="bodyStrong">월간 Premium</Text>
                  <Text variant="body">{formatKrw(monthlyPrice)}</Text>
                </View>
              </Card>
            </Pressable>
          ) : null}
          {plans?.yearlyEnabled ? (
            <Pressable onPress={() => setSelectedPlan(PremiumPlanCode.PREMIUM_YEARLY)}>
              <Card
                variant={selectedPlan === PremiumPlanCode.PREMIUM_YEARLY ? 'elevated' : 'base'}
                padding="md"
                style={styles.planCard}
              >
                <View style={styles.planRow}>
                  <Text variant="bodyStrong">연간 Premium</Text>
                  <Text variant="body">{formatKrw(yearlyPrice)}</Text>
                </View>
                {plans.yearlySavingsPercent != null && plans.yearlySavingsPercent > 0 ? (
                  <Text variant="meta" tone="secondary">
                    월간 대비 {plans.yearlySavingsPercent}% 절약
                  </Text>
                ) : null}
              </Card>
            </Pressable>
          ) : null}
          <Spacer size="lg" />
          <Button
            label={
              selectedPlan === PremiumPlanCode.PREMIUM_YEARLY
                ? `${formatKrw(yearlyPrice)} 연간 Premium 시작`
                : `${formatKrw(monthlyPrice)} 월간 Premium 시작`
            }
            disabled={!plans || busy}
            onPress={() => void onSubscribe()}
          />
        </>
      )}

      {error ? (
        <>
          <Spacer size="sm" />
          <Text variant="body" tone="error">{error}</Text>
        </>
      ) : null}
    </ScrollScreenFrame>
  );
}

const styles = StyleSheet.create({
  planCard: { marginBottom: 8 },
  planRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
