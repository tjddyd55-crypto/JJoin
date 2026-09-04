import { useCallback, useMemo, useRef, useState } from 'react';
import { RefreshControl, StyleSheet, View } from 'react-native';
import { useFocusEffect, useRouter, type Href } from 'expo-router';
import {
  Button,
  ClubCard,
  ClubCardSkeleton,
  ClubEmptyState,
  ScrollScreenFrame,
  Stack,
  Text,
  spacing,
} from '@jjoin/design-system';
import type { ClubSummaryDto } from '@jjoin/types';
import { getApiClient } from '../../../lib/api';
import { getSecureSessionStore } from '../../../session/SessionContext';
import { NESTED_SCREEN_EDGES } from '../../../ui/nested-screen';
import {
  clubCoverFallbackTone,
  formatClubCardMetaLine,
  formatClubMembershipStatusLabel,
} from '../model/club-display';

export function ClubRootScreen() {
  const router = useRouter();
  const api = useMemo(() => getApiClient(getSecureSessionStore()), []);
  const [items, setItems] = useState<ClubSummaryDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedRef = useRef(false);

  const load = useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      const showSkeleton = mode === 'initial' && !hasLoadedRef.current && items.length === 0;
      if (showSkeleton) setLoading(true);
      if (mode === 'refresh') setRefreshing(true);
      setError(null);
      try {
        const res = await api.listMyClubs();
        setItems(res.items);
        hasLoadedRef.current = true;
      } catch {
        setError('동호회 목록을 불러올 수 없습니다.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [api, items.length],
  );

  useFocusEffect(
    useCallback(() => {
      void load('initial');
    }, [load]),
  );

  const operating = items.filter(
    (club) => club.myRole === 'OWNER' || club.myRole === 'MANAGER',
  );
  const joined = items.filter(
    (club) =>
      club.myStatus === 'ACTIVE' &&
      club.myRole !== 'OWNER' &&
      club.myRole !== 'MANAGER',
  );
  const pending = items.filter((club) => club.myStatus === 'PENDING');

  const showSkeleton = loading && items.length === 0;

  const renderClub = (club: ClubSummaryDto, variant: 'myClub' | 'discovery' = 'myClub') => {
    const membership = formatClubMembershipStatusLabel(club.myStatus);
    return (
      <ClubCard
        key={club.id}
        variant={variant}
        name={club.name}
        intro={club.intro}
        metaLine={formatClubCardMetaLine(club)}
        coverImageUrl={club.coverImageUrl}
        fallbackTone={clubCoverFallbackTone(club.id)}
        statusLabel={membership?.label ?? null}
        statusTone={membership?.tone}
        onPress={() => router.push(`/my/clubs/${club.id}` as Href)}
      />
    );
  };

  return (
    <ScrollScreenFrame
      edges={[...NESTED_SCREEN_EDGES]}
      padded={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => void load('refresh')} />
      }
    >
      <View style={styles.actions}>
        <Button
          label="동호회 찾기"
          variant="secondary"
          size="sm"
          onPress={() => router.push('/my/clubs/discover' as Href)}
        />
        <Button
          label="동호회 만들기"
          size="sm"
          onPress={() => router.push('/my/clubs/create' as Href)}
        />
      </View>

      {error ? (
        <View style={styles.pad}>
          <ClubEmptyState
            title="불러오지 못했습니다"
            description="네트워크 연결을 확인한 뒤 다시 시도해 주세요."
            primaryAction={{ label: '다시 시도', onPress: () => void load('refresh') }}
          />
        </View>
      ) : null}

      {showSkeleton ? (
        <View>
          {Array.from({ length: 3 }).map((_, index) => (
            <ClubCardSkeleton key={index} />
          ))}
        </View>
      ) : null}

      {!showSkeleton && !error && !items.length ? (
        <View style={styles.pad}>
          <ClubEmptyState
            title="가입한 동호회가 없습니다"
            description="동호회를 찾아 가입하거나 새 동호회를 만들어 보세요."
            primaryAction={{
              label: '동호회 찾기',
              onPress: () => router.push('/my/clubs/discover' as Href),
            }}
            secondaryAction={{
              label: '동호회 만들기',
              onPress: () => router.push('/my/clubs/create' as Href),
            }}
          />
        </View>
      ) : null}

      {!showSkeleton && operating.length > 0 ? (
        <Stack gap="xs" style={styles.section}>
          <Text variant="joinSectionTitle" style={styles.sectionTitle}>운영 중</Text>
          {operating.map((club) => renderClub(club))}
        </Stack>
      ) : null}

      {!showSkeleton && joined.length > 0 ? (
        <Stack gap="xs" style={styles.section}>
          <Text variant="joinSectionTitle" style={styles.sectionTitle}>가입한 동호회</Text>
          {joined.map((club) => renderClub(club))}
        </Stack>
      ) : null}

      {!showSkeleton && pending.length > 0 ? (
        <Stack gap="xs" style={styles.section}>
          <Text variant="joinSectionTitle" style={styles.sectionTitle}>가입 승인 대기</Text>
          {pending.map((club) => renderClub(club))}
        </Stack>
      ) : null}
    </ScrollScreenFrame>
  );
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  pad: {
    paddingHorizontal: 16,
  },
  section: {
    marginTop: 8,
  },
  sectionTitle: {
    paddingHorizontal: 16,
    marginBottom: 4,
  },
});
