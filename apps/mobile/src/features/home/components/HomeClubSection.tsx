import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { Button, Text, spacing, useTheme } from '@jjoin/design-system';
import type { ClubDetailDto, ClubSummaryDto } from '@jjoin/types';
import { clubAttendanceLabel } from '../home-format';

type Props = {
  clubs: ClubSummaryDto[];
  featuredClub: ClubDetailDto | null;
  loading: boolean;
};

function nextEvent(club: ClubDetailDto | null) {
  if (!club?.activeEvents?.length) return null;
  return [...club.activeEvents].sort(
    (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
  )[0];
}

export function HomeClubSection({ clubs, featuredClub, loading }: Props) {
  const theme = useTheme();
  const router = useRouter();
  const activeClubs = clubs.filter((c) => c.myStatus === 'ACTIVE');

  if (loading) {
    return <Text variant="caption" tone="tertiary">동호회 불러오는 중…</Text>;
  }

  if (!activeClubs.length) {
    return (
      <View style={styles.emptyRow}>
        <Text variant="caption" tone="tertiary" style={{ flex: 1 }}>
          가입한 동호회가 없습니다.
        </Text>
        <Button
          label="동호회 둘러보기"
          size="sm"
          variant="secondary"
          onPress={() => router.push('/my/clubs/discover' as Href)}
        />
      </View>
    );
  }

  const club = featuredClub ?? null;
  const event = nextEvent(club);
  const attendance = clubAttendanceLabel(event?.myResponse ?? null);
  const clubId = club?.id ?? activeClubs[0]!.id;

  return (
    <View style={styles.wrap}>
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push(`/my/clubs/${clubId}` as Href)}
        style={({ pressed }) => [
          styles.card,
          {
            backgroundColor: theme.colors.surface.card,
            borderColor: theme.colors.border.subtle,
            opacity: pressed ? 0.92 : 1,
          },
        ]}
      >
        <Text variant="bodyStrong" tone="primary" numberOfLines={1}>
          {club?.name ?? activeClubs[0]!.name}
        </Text>
        {event ? (
          <>
            <Text variant="caption" tone="secondary" numberOfLines={1}>
              다음 모임 {new Date(event.startsAt).toLocaleString('ko-KR', {
                timeZone: 'Asia/Seoul',
                month: 'numeric',
                day: 'numeric',
                weekday: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })}{' '}
              · {event.venueName}
            </Text>
            {attendance ? (
              <Text variant="caption" style={{ color: theme.colors.action.primary }}>
                참석 응답 · {attendance}
              </Text>
            ) : null}
          </>
        ) : (
          <Text variant="caption" tone="tertiary">
            예정된 모임이 없습니다.
          </Text>
        )}
      </Pressable>
      {activeClubs.length > 1 ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/my/clubs' as Href)}
          hitSlop={8}
        >
          <Text variant="caption" tone="tertiary">
            전체 보기 ({activeClubs.length})
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.xs,
  },
  card: {
    padding: spacing.sm,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
  },
  emptyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
});
