import { useCallback, useMemo, useState } from 'react';
import { Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import {
  Badge,
  Button,
  Card,
  Chip,
  Row,
  ScrollScreenFrame,
  Section,
  Spacer,
  Text,
  useTheme,
} from '@jjoin/design-system';
import { formatCoinWithLabel, formatNumber } from '@jjoin/domain';
import type { OwnerDashboardPeriod, OwnerStoreDashboardDto } from '@jjoin/types';
import { getApiClient } from '../../../lib/api';
import { getSecureSessionStore } from '../../../session/SessionContext';
import { NESTED_SCREEN_EDGES } from '../../../ui/nested-screen';

const PERIODS: Array<{ id: OwnerDashboardPeriod; label: string }> = [
  { id: 'month', label: '이번 달' },
  { id: '30d', label: '30일' },
  { id: 'all', label: '전체' },
];

function joinDetailHref(joinId: string): Href {
  return { pathname: '/join/[joinId]', params: { joinId } } as Href;
}

function MetricCard({ label, value }: { label: string; value: string }) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.metricCell,
        {
          backgroundColor: theme.colors.surface.elevated,
          borderColor: theme.colors.border.subtle,
          borderRadius: theme.radius.md,
        },
      ]}
    >
      <Text variant="caption" tone="tertiary">{label}</Text>
      <Text variant="bodyStrong" style={{ color: theme.colors.reward.primary }}>{value}</Text>
    </View>
  );
}

function formatJoinTime(iso: string): string {
  return new Date(iso).toLocaleString('ko-KR', {
    timeZone: 'Asia/Seoul',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function StoreDashboardScreen() {
  const router = useRouter();
  const theme = useTheme();
  const params = useLocalSearchParams<{ ownershipId?: string }>();
  const ownershipId = typeof params.ownershipId === 'string' ? params.ownershipId : '';
  const api = useMemo(() => getApiClient(getSecureSessionStore()), []);

  const [period, setPeriod] = useState<OwnerDashboardPeriod>('month');
  const [dashboard, setDashboard] = useState<OwnerStoreDashboardDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (!ownershipId) {
      setError('매장 정보가 없습니다.');
      setDashboard(null);
      return;
    }
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const next = await api.getOwnerStoreDashboard(ownershipId, period);
      setDashboard(next);
      setError(null);
    } catch {
      setError('대시보드를 불러오지 못했습니다.');
      setDashboard(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [api, ownershipId, period]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const onRefresh = useCallback(() => {
    void load(true);
  }, [load]);

  const settlementAlert = dashboard?.settlementSummary.pendingCount ?? 0;

  return (
    <ScrollScreenFrame
      edges={[...NESTED_SCREEN_EDGES]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {dashboard ? (
        <>
          <Text variant="sectionTitle">{dashboard.facilityName}</Text>
          <Spacer size="xs" />
          <Row gap="sm" align="center">
            <Badge label="승인됨" variant="success" />
            <Text variant="caption" tone="tertiary">{dashboard.todayDateKey}</Text>
          </Row>
        </>
      ) : null}

      <Spacer size="md" />
      <Row gap="sm" style={styles.chipRow}>
        {PERIODS.map((item) => (
          <Chip
            key={item.id}
            label={item.label}
            selected={period === item.id}
            onPress={() => setPeriod(item.id)}
          />
        ))}
      </Row>

      {error ? (
        <>
          <Spacer size="md" />
          <Text variant="body" tone="error">{error}</Text>
        </>
      ) : null}

      {loading && !dashboard ? (
        <>
          <Spacer size="md" />
          <Text variant="caption" tone="tertiary">불러오는 중…</Text>
        </>
      ) : null}

      {dashboard ? (
        <>
          <Spacer size="lg" />
          <Section title="오늘 운영">
            <View style={styles.metricGrid}>
              <MetricCard label="진행 예정" value={String(dashboard.todaySummary.scheduledCount)} />
              <MetricCard label="모집 중" value={String(dashboard.todaySummary.recruitingCount)} />
              <MetricCard label="정산 대기" value={String(dashboard.todaySummary.settlementPendingCount)} />
              <MetricCard label="완료" value={String(dashboard.todaySummary.completedCount)} />
            </View>
          </Section>

          <Spacer size="md" />
          <Row gap="sm" style={styles.chipRow}>
            <Button
              label="조인 만들기"
              variant="secondary"
              onPress={() => router.push('/join/create' as Href)}
            />
            <Button
              label="코인"
              variant="secondary"
              onPress={() => router.push('/my/coin-charge' as Href)}
            />
            <Button
              label="내 매장"
              variant="secondary"
              onPress={() => router.push('/my/stores' as Href)}
            />
          </Row>

          {settlementAlert > 0 ? (
            <>
              <Spacer size="md" />
              <Card variant="base" padding="md">
                <Text variant="body">
                  정산이 필요한 조인 {settlementAlert}건
                </Text>
                <Spacer size="sm" />
                {dashboard.todayJoins
                  .filter((j) => j.needsSettlement)
                  .slice(0, 3)
                  .map((join) => (
                    <Pressable
                      key={join.joinId}
                      onPress={() => router.push(joinDetailHref(join.joinId))}
                    >
                      <Text variant="caption" tone="secondary">
                        {formatJoinTime(join.startAt)} · {join.title ?? '조인'}
                      </Text>
                    </Pressable>
                  ))}
              </Card>
            </>
          ) : null}

          <Spacer size="lg" />
          <Section title="오늘 참가자">
            <View style={styles.metricGrid}>
              <MetricCard label="총 참가 예정" value={String(dashboard.participantSummary.totalExpected)} />
              <MetricCard label="확정" value={String(dashboard.participantSummary.confirmedCount)} />
              {dashboard.participantSummary.pendingCount > 0 ? (
                <MetricCard label="대기" value={String(dashboard.participantSummary.pendingCount)} />
              ) : null}
              <MetricCard label="노쇼" value={String(dashboard.participantSummary.noShowCount)} />
            </View>
          </Section>

          <Spacer size="lg" />
          <Section title="오늘 조인">
            {dashboard.todayJoins.length === 0 ? (
              <>
                <Text variant="caption" tone="tertiary">오늘 예정된 조인이 없습니다.</Text>
                <Spacer size="sm" />
                <Button label="조인 만들기" onPress={() => router.push('/join/create' as Href)} />
              </>
            ) : (
              dashboard.todayJoins.map((join) => (
                <Pressable
                  key={join.joinId}
                  onPress={() => router.push(joinDetailHref(join.joinId))}
                  style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }]}
                >
                  <Card variant="interactive" padding="md" style={styles.joinCard}>
                    <Row justify="space-between" align="center">
                      <Text variant="bodyStrong">{formatJoinTime(join.startAt)}</Text>
                      <Row gap="xs">
                        {join.isUrgent ? <Badge label="긴급" variant="warning" /> : null}
                        <Badge
                          label={join.recruitLabel}
                          variant={join.needsSettlement ? 'warning' : 'neutral'}
                        />
                      </Row>
                    </Row>
                    <Text variant="body" tone="secondary">
                      {join.title ?? '스토어 매칭 조인'}
                    </Text>
                    <Text variant="caption" tone="tertiary">
                      {join.confirmedPlayerCount}/{join.plannedPlayerCount}명
                    </Text>
                  </Card>
                </Pressable>
              ))
            )}
          </Section>

          <Spacer size="lg" />
          <Section title="정산 · Coin">
            <Card variant="base" padding="md">
              <Text variant="meta" tone="secondary">정산 대기 {dashboard.settlementSummary.pendingCount}건</Text>
              <Text variant="body">지급 예정 {formatCoinWithLabel(dashboard.settlementSummary.payoutDueCoin)}</Text>
              <Text variant="body">HOLD {formatCoinWithLabel(dashboard.settlementSummary.holdCoin)}</Text>
              <Text variant="body">오늘 지급 완료 {formatCoinWithLabel(dashboard.settlementSummary.paidTodayCoin)}</Text>
              <Spacer size="md" />
              <Text variant="meta" tone="secondary">보유 Coin</Text>
              <Text variant="coinLarge" style={{ color: theme.colors.reward.primary }}>
                {formatCoinWithLabel(dashboard.coinSummary.availableCoin)}
              </Text>
              <Text variant="caption" tone="tertiary">
                보류/HOLD {formatCoinWithLabel(dashboard.coinSummary.heldCoin)}
              </Text>
              <Spacer size="sm" />
              <Text variant="meta" tone="secondary">조인 생성 정책</Text>
              <Text variant="body">
                {dashboard.coinSummary.joinCreationBenefitLabel ??
                  (dashboard.coinSummary.joinCreationFeeCoin === 0
                    ? '무료'
                    : `${dashboard.coinSummary.joinCreationFeeCoin} Coin (${formatNumber(dashboard.joinPricing.effectiveFeeKrw)}원 상당)`)}
              </Text>
              {dashboard.coinSummary.joinCreationFeeCoin > 0 &&
              Number(dashboard.coinSummary.availableCoin) < dashboard.coinSummary.joinCreationFeeCoin ? (
                <>
                  <Spacer size="sm" />
                  <Text variant="caption" tone="error">
                    조인 생성에 필요한 Coin이 부족합니다.
                  </Text>
                  <Spacer size="xs" />
                  <Button
                    label="코인 충전"
                    variant="secondary"
                    onPress={() => router.push('/my/coin-charge' as Href)}
                  />
                </>
              ) : null}
            </Card>
          </Section>

          <Spacer size="lg" />
          <Section title="최근 7일">
            <Text variant="caption" tone="tertiary">
              생성 {dashboard.periodStats.last7Days.createdJoinCount} · 완료 {dashboard.periodStats.last7Days.completedJoinCount} · 참석 {dashboard.periodStats.last7Days.attendedCount} · 노쇼 {dashboard.periodStats.last7Days.noShowCount}
              {dashboard.periodStats.last7Days.fillRatePercent != null
                ? ` · 충원률 ${dashboard.periodStats.last7Days.fillRatePercent}%`
                : ''}
            </Text>
          </Section>

          <Spacer size="md" />
          <Section title="최근 30일">
            <Text variant="caption" tone="tertiary">
              생성 {dashboard.periodStats.last30Days.createdJoinCount} · 완료 {dashboard.periodStats.last30Days.completedJoinCount} · 참석 {dashboard.periodStats.last30Days.attendedCount} · 노쇼 {dashboard.periodStats.last30Days.noShowCount}
              {dashboard.periodStats.last30Days.fillRatePercent != null
                ? ` · 충원률 ${dashboard.periodStats.last30Days.fillRatePercent}%`
                : ''}
            </Text>
          </Section>

          <Spacer size="lg" />
          <Section title="최근 알림">
            {dashboard.recentNotifications.length === 0 ? (
              <Text variant="caption" tone="tertiary">알림이 없습니다.</Text>
            ) : (
              dashboard.recentNotifications.map((n) => (
                <Card key={n.id} variant="base" padding="md" style={styles.joinCard}>
                  <Text variant="bodyStrong">{n.title}</Text>
                  <Text variant="caption" tone="tertiary">{n.body}</Text>
                </Card>
              ))
            )}
            <Spacer size="sm" />
            <Button
              label="전체 알림"
              variant="secondary"
              onPress={() => router.push('/my/notifications' as Href)}
            />
          </Section>
        </>
      ) : null}
    </ScrollScreenFrame>
  );
}

const styles = StyleSheet.create({
  chipRow: { flexWrap: 'wrap' },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metricCell: {
    width: '47%',
    flexGrow: 1,
    minWidth: 120,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderWidth: 1,
    gap: 4,
  },
  joinCard: { marginBottom: 8 },
});
