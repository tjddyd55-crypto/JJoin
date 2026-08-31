import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { useFocusEffect, useRouter, type Href } from 'expo-router';
import {
  Badge,
  Button,
  Card,
  Row,
  ScrollScreenFrame,
  Section,
  Spacer,
  Text,
} from '@jjoin/design-system';
import { formatCoinWithLabel, formatKoreanPhoneDisplay } from '@jjoin/domain';
import {
  StoreOwnershipStatus,
  StoreVerificationStatus,
  type JoinListItemDto,
  type StoreOwnershipDto,
  type StoreOwnershipRequestDto,
} from '@jjoin/types';
import { getApiClient } from '../../../lib/api';
import { getSecureSessionStore } from '../../../session/SessionContext';
import {
  VERIFICATION_STATUS_LABELS,
  filterStoreJoins,
  groupStoreJoins,
  storeJoinCardCaption,
  type StoreJoinListFilter,
} from '../store-ui';
import { matchingCanConfirmAttendance, matchingDisplayStatusLabel } from '../matching-join-ui';

function joinDetailHref(joinId: string): Href {
  return { pathname: '/join/[joinId]', params: { joinId } } as Href;
}

const FILTERS: Array<{ id: StoreJoinListFilter; label: string }> = [
  { id: 'ALL', label: '전체' },
  { id: 'ACTIVE', label: '진행중' },
  { id: 'RECRUITING', label: '모집중' },
  { id: 'DONE', label: '완료' },
];

function StoreJoinRow({ item, onPress }: { item: JoinListItemDto; onPress: () => void }) {
  const start = new Date(item.startAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
  const statusLabel = matchingDisplayStatusLabel(item, 'host');
  const needsAttendance = matchingCanConfirmAttendance(item);
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }]}
    >
      <Card variant="interactive" padding="md" style={styles.joinCard}>
        <Row justify="space-between" align="center">
          <Text variant="body" tone="primary">
            {item.venueName}
          </Text>
          {statusLabel ? (
            <Badge label={statusLabel} variant={needsAttendance ? 'gold' : 'neutral'} />
          ) : null}
        </Row>
        <Text variant="caption" tone="secondary">
          {start}
        </Text>
        <Text variant="caption" tone="tertiary">
          {storeJoinCardCaption(item)}
        </Text>
        {needsAttendance ? (
          <Text variant="caption" tone="primary" style={styles.ctaHint}>
            참석 확인하기
          </Text>
        ) : null}
      </Card>
    </Pressable>
  );
}

function JoinSection({
  title,
  items,
  onPressItem,
}: {
  title: string;
  items: JoinListItemDto[];
  onPressItem: (joinId: string) => void;
}) {
  if (items.length === 0) {
    return (
      <Section title={title}>
        <Text variant="caption" tone="tertiary">
          없음
        </Text>
      </Section>
    );
  }
  return (
    <Section title={title}>
      {items.map((item) => (
        <StoreJoinRow key={item.joinId} item={item} onPress={() => onPressItem(item.joinId)} />
      ))}
    </Section>
  );
}

export function MyStoresScreen() {
  const router = useRouter();
  const api = useMemo(() => getApiClient(getSecureSessionStore()), []);
  const [stores, setStores] = useState<StoreOwnershipDto[]>([]);
  const [requests, setRequests] = useState<StoreOwnershipRequestDto[]>([]);
  const [joins, setJoins] = useState<JoinListItemDto[]>([]);
  const [filter, setFilter] = useState<StoreJoinListFilter>('ALL');
  const [error, setError] = useState<string | null>(null);

  const activeStores = useMemo(
    () => stores.filter((store) => store.status === StoreOwnershipStatus.ACTIVE),
    [stores],
  );
  const pendingRequests = useMemo(
    () =>
      requests.filter((r) => r.status === StoreVerificationStatus.PENDING),
    [requests],
  );
  const filteredJoins = useMemo(() => filterStoreJoins(joins, filter), [joins, filter]);
  const groups = useMemo(() => groupStoreJoins(filteredJoins), [filteredJoins]);

  const load = useCallback(async () => {
    try {
      const [storeItems, joinItems, requestItems] = await Promise.all([
        api.getMyStores({ includeWallet: true }),
        api.getMyStoreJoins(),
        api.getMyStoreVerifications(),
      ]);
      setStores(storeItems);
      setJoins(joinItems);
      setRequests(requestItems);
      setError(null);
    } catch {
      setError('매장 정보를 불러오지 못했습니다.');
    }
  }, [api]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const primaryStore = activeStores[0];

  return (
    <ScrollScreenFrame>
      <Text variant="screenTitle" tone="primary">
        내 매장
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

      {activeStores.length === 0 ? (
        <Card variant="base" padding="md">
          <Text variant="body" tone="secondary">
            승인된 매장이 없습니다. 매장 인증을 먼저 완료해 주세요.
          </Text>
          <Spacer size="md" />
          <Button
            label="매장 인증하기"
            variant="secondary"
            onPress={() => router.push('/my/store-verification')}
            fullWidth
          />
        </Card>
      ) : (
        activeStores.map((store) => (
          <Card key={store.id} variant="elevated" padding="md" style={styles.storeCard}>
            <Row justify="space-between" align="center">
              <Text variant="bodyStrong" tone="primary">
                {store.facilityName}
              </Text>
              <Badge label="승인됨" variant="success" />
            </Row>
            {store.facilityAddress ? (
              <Text variant="caption" tone="secondary">
                {store.facilityAddress}
              </Text>
            ) : null}
            <Spacer size="sm" />
            <Row gap="sm">
              <Badge label={`사용 가능 ${formatCoinWithLabel(store.walletAvailable ?? '0')}`} variant="success" />
              <Badge label={`홀드 ${formatCoinWithLabel(store.walletHeld ?? '0')}`} variant="neutral" />
            </Row>
            <Spacer size="sm" />
            <Button
              label="운영 대시보드"
              variant="secondary"
              size="sm"
              onPress={() =>
                router.push({
                  pathname: '/my/store-dashboard',
                  params: { ownershipId: store.id },
                })
              }
              fullWidth
            />
          </Card>
        ))
      )}

      {pendingRequests.length > 0 ? (
        <>
          <Spacer size="md" />
          <Text variant="sectionTitle" tone="primary">
            심사 중
          </Text>
          <Spacer size="sm" />
          {pendingRequests.map((req) => (
            <Card key={req.id} variant="base" padding="md" style={styles.storeCard}>
              <Row justify="space-between" align="center">
                <Text variant="bodyStrong" tone="primary">
                  {req.facilityName}
                </Text>
                <Badge
                  label={VERIFICATION_STATUS_LABELS[req.status]}
                  variant="warning"
                />
              </Row>
              {req.facilityAddress ? (
                <Text variant="caption" tone="secondary">
                  {req.facilityAddress}
                </Text>
              ) : null}
              <Text variant="caption" tone="tertiary">
                {req.applicantName} · {formatKoreanPhoneDisplay(req.applicantPhone)}
              </Text>
            </Card>
          ))}
        </>
      ) : null}

      <Spacer size="md" />
      <Button
        label="매장 인증 추가"
        variant="secondary"
        onPress={() => router.push('/my/store-verification')}
        fullWidth
      />

      <Spacer size="lg" />

      {activeStores.length > 0 ? (
        <>
          <Button
            label="모집 조인 만들기"
            onPress={() =>
              router.push({
                pathname: '/my/create-store-join',
                params: primaryStore ? { storeOwnershipId: primaryStore.id } : undefined,
              })
            }
            fullWidth
          />
          <Spacer size="sm" />
          <Button
            label="정기 조인"
            variant="secondary"
            onPress={() => router.push('/my/recurring-joins')}
            fullWidth
          />
        </>
      ) : null}

      <Spacer size="lg" />

      <Row gap="sm" style={styles.filterRow}>
        {FILTERS.map((item) => (
          <Pressable key={item.id} onPress={() => setFilter(item.id)}>
            <Badge
              label={item.label}
              variant={filter === item.id ? 'gold' : 'neutral'}
            />
          </Pressable>
        ))}
      </Row>

      <Spacer size="md" />

      <JoinSection
        title="참석 확인 대기"
        items={groups.attendancePending}
        onPressItem={(joinId) => router.push(joinDetailHref(joinId))}
      />
      <Spacer size="md" />
      <JoinSection
        title="진행중"
        items={groups.inProgress}
        onPressItem={(joinId) => router.push(joinDetailHref(joinId))}
      />
      <Spacer size="md" />
      <JoinSection
        title="진행 예정"
        items={groups.scheduled}
        onPressItem={(joinId) => router.push(joinDetailHref(joinId))}
      />
      <Spacer size="md" />
      <JoinSection
        title="모집중"
        items={groups.recruiting}
        onPressItem={(joinId) => router.push(joinDetailHref(joinId))}
      />
      <Spacer size="md" />
      <JoinSection
        title="완료"
        items={groups.ended}
        onPressItem={(joinId) => router.push(joinDetailHref(joinId))}
      />
      <Spacer size="md" />
      <JoinSection
        title="취소"
        items={groups.cancelled}
        onPressItem={(joinId) => router.push(joinDetailHref(joinId))}
      />
    </ScrollScreenFrame>
  );
}

const styles = StyleSheet.create({
  storeCard: {
    marginBottom: 8,
  },
  joinCard: {
    marginBottom: 8,
  },
  filterRow: {
    flexWrap: 'wrap',
  },
  ctaHint: {
    marginTop: 6,
  },
});
