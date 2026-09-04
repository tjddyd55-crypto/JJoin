import { useCallback, useMemo, useState } from 'react';
import { RefreshControl, StyleSheet, View } from 'react-native';
import { useFocusEffect, useRouter, type Href } from 'expo-router';
import {
  Chip,
  ClubCard,
  ClubCardSkeleton,
  ClubEmptyState,
  Input,
  ScrollScreenFrame,
  Stack,
  Text,
  spacing,
} from '@jjoin/design-system';
import type { ClubDiscoverCardDto } from '@jjoin/types';
import { NESTED_SCREEN_EDGES } from '../../../ui/nested-screen';
import { useClubDiscoverData } from '../hooks/useClubDiscoverData';
import {
  clubCoverFallbackTone,
  filterClubsByQuery,
  filterDiscoverClubs,
  formatClubActivityLine,
  formatClubCardMetaLine,
  formatClubMembershipStatusLabel,
  partitionDiscoverSections,
  type ClubDiscoverFilter,
} from '../model/club-display';

const FILTERS: { id: ClubDiscoverFilter; label: string }[] = [
  { id: 'all', label: '전체' },
  { id: 'active', label: '활동 활발' },
  { id: 'mine', label: '내 동호회' },
];

export function ClubDiscoverScreen() {
  const router = useRouter();
  const { items, loading, refreshing, error, reload, initialLoad } = useClubDiscoverData();
  const [filter, setFilter] = useState<ClubDiscoverFilter>('all');
  const [query, setQuery] = useState('');

  useFocusEffect(
    useCallback(() => {
      void initialLoad();
    }, [initialLoad]),
  );

  const filtered = useMemo(() => {
    const byFilter = filterDiscoverClubs(items, filter);
    return filterClubsByQuery(byFilter, query);
  }, [filter, items, query]);

  const sections = useMemo(() => {
    if (filter !== 'all') {
      return { active: [], recommended: filtered };
    }
    return partitionDiscoverSections(filtered);
  }, [filter, filtered]);

  const renderCard = (club: ClubDiscoverCardDto) => {
    const membership = formatClubMembershipStatusLabel(club.myStatus);
    return (
      <ClubCard
        key={club.id}
        variant="discovery"
        name={club.name}
        intro={club.intro}
        metaLine={formatClubCardMetaLine(club)}
        activityLine={formatClubActivityLine(club)}
        coverImageUrl={club.coverImageUrl}
        fallbackTone={clubCoverFallbackTone(club.id)}
        statusLabel={membership?.label ?? null}
        statusTone={membership?.tone}
        onPress={() => router.push(`/my/clubs/${club.id}` as Href)}
      />
    );
  };

  const showSkeleton = loading && items.length === 0;

  return (
    <ScrollScreenFrame
      edges={[...NESTED_SCREEN_EDGES]}
      padded={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => void reload()} />
      }
    >
      <Stack gap="sm" style={styles.header}>
        <Input
          value={query}
          onChangeText={setQuery}
          placeholder="동호회 이름·지역 검색"
          returnKeyType="search"
          accessibilityLabel="동호회 검색"
        />
        <View style={styles.filters}>
          {FILTERS.map((item) => (
            <Chip
              key={item.id}
              label={item.label}
              selected={filter === item.id}
              onPress={() => setFilter(item.id)}
            />
          ))}
        </View>
      </Stack>

      {error ? (
        <View style={styles.sectionPad}>
          <ClubEmptyState
            title="불러오지 못했습니다"
            description="네트워크 연결을 확인한 뒤 다시 시도해 주세요."
            primaryAction={{ label: '다시 시도', onPress: () => void reload() }}
          />
        </View>
      ) : null}

      {showSkeleton ? (
        <View>
          {Array.from({ length: 4 }).map((_, index) => (
            <ClubCardSkeleton key={index} />
          ))}
        </View>
      ) : null}

      {!showSkeleton && !error && !filtered.length ? (
        <View style={styles.sectionPad}>
          <ClubEmptyState
            title={query ? '검색 결과가 없습니다' : '공개 동호회가 아직 없습니다'}
            description={
              query
                ? '다른 키워드로 검색하거나 필터를 변경해 보세요.'
                : '동호회를 만들거나 나중에 다시 확인해 주세요.'
            }
            primaryAction={
              query
                ? { label: '조건 변경', onPress: () => setQuery('') }
                : {
                    label: '동호회 만들기',
                    onPress: () => router.push('/my/clubs/create' as Href),
                  }
            }
          />
        </View>
      ) : null}

      {!showSkeleton && sections.active.length > 0 ? (
        <View style={styles.section}>
          <Text variant="joinSectionTitle" style={styles.sectionTitle}>
            활동이 활발한 동호회
          </Text>
          {sections.active.map(renderCard)}
        </View>
      ) : null}

      {!showSkeleton && sections.recommended.length > 0 ? (
        <View style={styles.section}>
          <Text variant="joinSectionTitle" style={styles.sectionTitle}>
            {filter === 'all' ? '추천 동호회' : '동호회'}
          </Text>
          {sections.recommended.map(renderCard)}
        </View>
      ) : null}
    </ScrollScreenFrame>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  filters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  section: {
    marginTop: 8,
  },
  sectionPad: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  sectionTitle: {
    paddingHorizontal: 16,
    marginBottom: 4,
  },
});
