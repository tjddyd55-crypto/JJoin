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
import { JoinStatus, StoreOwnershipStatus, type JoinListItemDto, type StoreOwnershipDto } from '@jjoin/types';
import { getApiClient } from '../../../lib/api';
import { getSecureSessionStore } from '../../../session/SessionContext';
import { groupStoreJoins } from '../store-ui';

function joinDetailHref(joinId: string): Href {
  return { pathname: '/join/[joinId]', params: { joinId } } as Href;
}

function StoreJoinRow({ item, onPress }: { item: JoinListItemDto; onPress: () => void }) {
  const start = new Date(item.startAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }]}
    >
      <Card variant="interactive" padding="md" style={styles.joinCard}>
        <Text variant="body" tone="primary">
          {item.venueName}
        </Text>
        <Text variant="caption" tone="secondary">
          {start}
        </Text>
        <Text variant="caption" tone="tertiary">
          {item.confirmedPlayerCount}/{item.plannedPlayerCount}명 · {item.rewardPerParticipant} Coin
          {item.recruitmentLabel ? ` · ${item.recruitmentLabel}` : ''}
        </Text>
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
  const [joins, setJoins] = useState<JoinListItemDto[]>([]);
  const [error, setError] = useState<string | null>(null);

  const activeStores = useMemo(
    () => stores.filter((store) => store.status === StoreOwnershipStatus.ACTIVE),
    [stores],
  );
  const groups = useMemo(() => groupStoreJoins(joins), [joins]);

  const load = useCallback(async () => {
    try {
      const [storeItems, joinItems] = await Promise.all([
        api.getMyStores({ includeWallet: true }),
        api.getMyStoreJoins(),
      ]);
      setStores(storeItems);
      setJoins(joinItems);
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
            <Text variant="bodyStrong" tone="primary">
              {store.facilityName}
            </Text>
            {store.facilityAddress ? (
              <Text variant="caption" tone="secondary">
                {store.facilityAddress}
              </Text>
            ) : null}
            <Spacer size="sm" />
            <Row gap="sm">
              <Badge label={`사용 가능 ${store.walletAvailable ?? '0'} Coin`} variant="success" />
              <Badge label={`홀드 ${store.walletHeld ?? '0'} Coin`} variant="neutral" />
            </Row>
          </Card>
        ))
      )}

      <Spacer size="lg" />

      {activeStores.length > 0 ? (
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
      ) : null}

      <Spacer size="lg" />

      <JoinSection
        title="모집중"
        items={groups.recruiting}
        onPressItem={(joinId) => router.push(joinDetailHref(joinId))}
      />
      <Spacer size="md" />
      <JoinSection
        title="진행예정"
        items={groups.scheduled}
        onPressItem={(joinId) => router.push(joinDetailHref(joinId))}
      />
      <Spacer size="md" />
      <JoinSection
        title="종료"
        items={groups.ended.filter((j) => j.status !== JoinStatus.CANCELLED)}
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
});
