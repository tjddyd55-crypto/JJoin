import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import {
  Badge,
  Card,
  Chip,
  Row,
  ScrollScreenFrame,
  Section,
  Spacer,
  Text,
  useTheme,
} from '@jjoin/design-system';
import type { OwnerDashboardPeriod, OwnerStoreDashboardDto } from '@jjoin/types';
import { getApiClient } from '../../../lib/api';
import { getSecureSessionStore } from '../../../session/SessionContext';
import { NESTED_SCREEN_EDGES } from '../../../ui/nested-screen';

const PERIODS: Array<{ id: OwnerDashboardPeriod; label: string }> = [
  { id: 'month', label: '이번 달' },
  { id: '30d', label: '30일' },
  { id: 'all', label: '전체' },
];

type KpiItem = { key: string; label: string; value: string };

function joinDetailHref(joinId: string): Href {
  return { pathname: '/join/[joinId]', params: { joinId } } as Href;
}

function formatRate(rate: number | null): string {
  if (rate == null || Number.isNaN(rate)) return '—';
  return `${Math.round(rate)}%`;
}

function buildKpiItems(dashboard: OwnerStoreDashboardDto): KpiItem[] {
  const { kpi } = dashboard;
  return [
    { key: 'attempt', label: '모집', value: String(kpi.attemptCount) },
    { key: 'succeeded', label: '성사', value: String(kpi.succeededCount) },
    { key: 'cancelled', label: '취소', value: String(kpi.cancelledCount) },
    { key: 'rate', label: '성사율', value: formatRate(kpi.successRatePercent) },
    { key: 'participants', label: '참가자', value: String(kpi.participantSum) },
    { key: 're', label: '재참가자', value: String(kpi.reParticipantCount) },
    { key: 'followers', label: '팔로워', value: String(kpi.followerCount) },
    { key: 'urgent', label: '긴급', value: String(kpi.urgentAttemptCount) },
    { key: 'urgentOk', label: '긴급성사', value: String(kpi.urgentSucceededCount) },
  ];
}

function KpiCard({ label, value }: { label: string; value: string }) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.kpiCell,
        {
          backgroundColor: theme.colors.surface.elevated,
          borderColor: theme.colors.border.subtle,
          borderRadius: theme.radius.md,
        },
      ]}
    >
      <Text variant="caption" tone="tertiary">
        {label}
      </Text>
      <Text variant="bodyStrong" style={{ color: theme.colors.reward.primary }}>
        {value}
      </Text>
    </View>
  );
}

export function StoreDashboardScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ ownershipId?: string }>();
  const ownershipId =
    typeof params.ownershipId === 'string' ? params.ownershipId : '';
  const api = useMemo(() => getApiClient(getSecureSessionStore()), []);

  const [period, setPeriod] = useState<OwnerDashboardPeriod>('month');
  const [dashboard, setDashboard] = useState<OwnerStoreDashboardDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!ownershipId) {
      setError('매장 정보가 없습니다.');
      setDashboard(null);
      return;
    }
    setLoading(true);
    try {
      const next = await api.getOwnerStoreDashboard(ownershipId, period);
      setDashboard(next);
      setError(null);
    } catch {
      setError('대시보드를 불러오지 못했습니다.');
      setDashboard(null);
    } finally {
      setLoading(false);
    }
  }, [api, ownershipId, period]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const kpiItems = useMemo(
    () => (dashboard ? buildKpiItems(dashboard) : []),
    [dashboard],
  );

  return (
    <ScrollScreenFrame edges={[...NESTED_SCREEN_EDGES]}>
      {dashboard?.facilityName ? (
        <Text variant="body" tone="secondary">
          {dashboard.facilityName}
        </Text>
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
          <Text variant="body" tone="error">
            {error}
          </Text>
        </>
      ) : null}

      {loading && !dashboard ? (
        <>
          <Spacer size="md" />
          <Text variant="caption" tone="tertiary">
            불러오는 중…
          </Text>
        </>
      ) : null}

      {kpiItems.length > 0 ? (
        <>
          <Spacer size="lg" />
          <View style={styles.kpiGrid}>
            {kpiItems.map((item) => (
              <KpiCard key={item.key} label={item.label} value={item.value} />
            ))}
          </View>
        </>
      ) : null}

      <Spacer size="lg" />
      <Section title="최근 조인" subtitle="최근 모집 내역">
        {!dashboard || dashboard.recentJoins.length === 0 ? (
          <Text variant="caption" tone="tertiary">
            최근 조인이 없습니다.
          </Text>
        ) : (
          dashboard.recentJoins.map((join) => {
            const start = new Date(join.startAt).toLocaleString('ko-KR', {
              timeZone: 'Asia/Seoul',
              month: 'numeric',
              day: 'numeric',
              weekday: 'short',
              hour: '2-digit',
              minute: '2-digit',
            });
            return (
              <Pressable
                key={join.joinId}
                accessibilityRole="button"
                onPress={() => router.push(joinDetailHref(join.joinId))}
                style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }]}
              >
                <Card variant="interactive" padding="md" style={styles.joinCard}>
                  <Row justify="space-between" align="center">
                    <Text variant="body" tone="primary" style={styles.joinTitle}>
                      {start}
                    </Text>
                    <Row gap="xs" align="center">
                      {join.isUrgent ? <Badge label="긴급" variant="warning" /> : null}
                      <Badge
                        label={
                          join.succeeded
                            ? '성사'
                            : join.status === 'CANCELLED'
                              ? '취소'
                              : join.status === 'COMPLETED'
                                ? '완료'
                                : join.status === 'OPEN' || join.status === 'FULL'
                                  ? '모집중'
                                  : '진행'
                        }
                        variant={join.succeeded ? 'success' : 'neutral'}
                      />
                    </Row>
                  </Row>
                  <Text variant="caption" tone="tertiary">
                    {join.confirmedPlayerCount}/{join.plannedPlayerCount}명
                  </Text>
                </Card>
              </Pressable>
            );
          })
        )}
      </Section>
    </ScrollScreenFrame>
  );
}

const styles = StyleSheet.create({
  chipRow: {
    flexWrap: 'wrap',
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  kpiCell: {
    width: '31%',
    flexGrow: 1,
    minWidth: 96,
    maxWidth: '33%',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderWidth: 1,
    gap: 4,
  },
  joinCard: {
    marginBottom: 8,
  },
  joinTitle: {
    flex: 1,
    paddingRight: 8,
  },
});
