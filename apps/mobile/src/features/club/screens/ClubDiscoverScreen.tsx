import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ClubPlaceholderImage } from '../components/ClubPlaceholderImage';
import { useFocusEffect, useRouter, type Href } from 'expo-router';
import {
  Button,
  Card,
  ScrollScreenFrame,
  Stack,
  Text,
  spacing,
  useTheme,
} from '@jjoin/design-system';
import {
  clubActivityTypeLabel,
  clubAgeGroupLabel,
  formatAttendanceRateDisplay,
  formatClubActivityRegionsCompact,
} from '@jjoin/domain';
import type { ClubDiscoverCardDto } from '@jjoin/types';
import { getApiClient } from '../../../lib/api';
import { getSecureSessionStore } from '../../../session/SessionContext';
import { NESTED_SCREEN_EDGES } from '../../../ui/nested-screen';

export function ClubDiscoverScreen() {
  const router = useRouter();
  const theme = useTheme();
  const api = useMemo(() => getApiClient(getSecureSessionStore()), []);
  const [items, setItems] = useState<ClubDiscoverCardDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [joiningId, setJoiningId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.discoverClubs();
      setItems(res.items);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const onJoin = async (club: ClubDiscoverCardDto) => {
    if (club.myStatus === 'ACTIVE') {
      router.push(`/my/clubs/${club.id}` as Href);
      return;
    }
    setJoiningId(club.id);
    try {
      await api.joinClub(club.id);
      await load();
    } finally {
      setJoiningId(null);
    }
  };

  return (
    <ScrollScreenFrame edges={[...NESTED_SCREEN_EDGES]}>
      <Stack gap="md">
        {loading ? <Text tone="secondary">불러오는 중…</Text> : null}
        {!loading && !items.length ? (
          <Text tone="secondary">공개 동호회가 아직 없습니다.</Text>
        ) : null}
        {items.map((club) => (
          <Card key={club.id} padding="md">
            <Stack gap="sm">
              <ClubPlaceholderImage uri={club.coverImageUrl} height={120} label={club.name.slice(0, 1)} />
              <Text variant="bodyStrong">{club.name}</Text>
              <Text variant="caption" tone="secondary">
                {formatClubActivityRegionsCompact(club.activityRegions ?? [], { maxParts: 3 })} ·{' '}
                {clubActivityTypeLabel(club.activityType)}
              </Text>
              {club.primaryAgeGroup ? (
                <Text variant="caption" tone="tertiary">
                  주요 연령대 {clubAgeGroupLabel(club.primaryAgeGroup)}
                </Text>
              ) : null}
              <Text variant="caption" tone="secondary">
                회원 {club.memberCount} · 올해 모임 {club.eventsThisYear} · 누적 참석{' '}
                {club.totalAttended} · 평균 참석률{' '}
                {formatAttendanceRateDisplay(club.averageAttendanceRate)}
              </Text>
              <View style={styles.actions}>
                <Button
                  label={
                    club.myStatus === 'ACTIVE'
                      ? '동호회 홈'
                      : club.myStatus === 'PENDING'
                        ? '승인 대기'
                        : '가입 신청'
                  }
                  size="sm"
                  variant={club.myStatus === 'ACTIVE' ? 'secondary' : 'primary'}
                  loading={joiningId === club.id}
                  disabled={club.myStatus === 'PENDING'}
                  onPress={() => void onJoin(club)}
                />
              </View>
            </Stack>
          </Card>
        ))}
      </Stack>
    </ScrollScreenFrame>
  );
}

const styles = StyleSheet.create({
  cover: {
    width: '100%',
    height: 120,
    borderRadius: 12,
    backgroundColor: '#1a1a1c',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
});
