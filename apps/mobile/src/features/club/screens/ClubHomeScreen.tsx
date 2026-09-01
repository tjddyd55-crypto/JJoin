import { useCallback, useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import {
  Button,
  Card,
  ScrollScreenFrame,
  Stack,
  Text,
  spacing,
  useTheme,
} from '@jjoin/design-system';
import { clubActivityTypeLabel, formatClubActivityRegionsCompact, isClubStaff } from '@jjoin/domain';
import {
  ClubMembershipStatus,
  ClubEventAttendanceResponse,
  type ClubDetailDto,
  type ClubEventListItemDto,
} from '@jjoin/types';
import { ClubKpiGrid, ClubRecent30Row } from '../components/ClubKpiGrid';
import { ClubPlaceholderImage } from '../components/ClubPlaceholderImage';
import { getApiClient } from '../../../lib/api';
import { getSecureSessionStore } from '../../../session/SessionContext';
import { NESTED_SCREEN_EDGES } from '../../../ui/nested-screen';

export function ClubHomeScreen() {
  const { clubId } = useLocalSearchParams<{ clubId: string }>();
  const router = useRouter();
  const theme = useTheme();
  const api = useMemo(() => getApiClient(getSecureSessionStore()), []);
  const [detail, setDetail] = useState<ClubDetailDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!clubId) return;
    setLoading(true);
    setError(null);
    try {
      setDetail(await api.getClubDetail(clubId));
    } catch {
      setError('동호회 정보를 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  }, [api, clubId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const isStaff = detail?.myRole
    ? isClubStaff({ role: detail.myRole, status: detail.myStatus ?? ClubMembershipStatus.ACTIVE })
    : false;

  if (loading) {
    return (
      <ScrollScreenFrame edges={[...NESTED_SCREEN_EDGES]}>
        <Text tone="secondary">불러오는 중…</Text>
      </ScrollScreenFrame>
    );
  }

  if (error || !detail) {
    return (
      <ScrollScreenFrame edges={[...NESTED_SCREEN_EDGES]}>
        <Text tone="error">{error ?? '동호회를 찾을 수 없습니다.'}</Text>
      </ScrollScreenFrame>
    );
  }

  return (
    <ScrollScreenFrame edges={[...NESTED_SCREEN_EDGES]}>
      <Stack gap="md">
        <ClubPlaceholderImage uri={detail.coverImageUrl} height={180} label={detail.name.slice(0, 1)} />
        <Stack gap="xs">
          <Text variant="screenTitle">{detail.name}</Text>
          <Text variant="caption" tone="secondary">
            {formatClubActivityRegionsCompact(detail.activityRegions ?? [], { maxParts: 3 })} ·{' '}
            {clubActivityTypeLabel(detail.activityType)}
          </Text>
          {detail.intro ? (
            <Text variant="body" tone="secondary">
              {detail.intro}
            </Text>
          ) : null}
        </Stack>

        <Card padding="md">
          <ClubKpiGrid dashboard={detail.dashboard} />
        </Card>
        <ClubRecent30Row dashboard={detail.dashboard} />

        <View style={styles.navRow}>
          <NavChip label="모임" onPress={() => router.push(`/my/clubs/${clubId}/events` as Href)} />
          <NavChip label="회원" onPress={() => router.push(`/my/clubs/${clubId}/members` as Href)} />
          <NavChip label="회계" onPress={() => router.push(`/my/clubs/${clubId}/accounting` as Href)} />
          <NavChip label="공지" onPress={() => router.push(`/my/clubs/${clubId}/notices` as Href)} />
        </View>

        {isStaff ? (
          <View style={styles.staffActions}>
            <Button
              label="모임 만들기"
              size="sm"
              onPress={() => router.push(`/my/clubs/${clubId}/events/create` as Href)}
            />
            <Button
              label="동호회 정보 수정"
              size="sm"
              variant="secondary"
              onPress={() => router.push(`/my/clubs/${clubId}/edit` as Href)}
            />
          </View>
        ) : null}

        <Text variant="sectionTitle">진행 중인 모임</Text>
        {!detail.activeEvents.length ? (
          <Text variant="caption" tone="tertiary">
            진행 중인 모임이 없습니다.
          </Text>
        ) : (
          detail.activeEvents.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              clubId={clubId}
              isStaff={isStaff}
              onPress={() => router.push(`/my/clubs/${clubId}/events/${event.id}` as Href)}
              onRespond={(response) => void respond(api, clubId, event.id, response, load)}
            />
          ))
        )}
      </Stack>
    </ScrollScreenFrame>
  );
}

function NavChip({ label, onPress }: { label: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable onPress={onPress} style={[styles.navChip, { borderColor: theme.colors.border.subtle }]}>
      <Text variant="caption">{label}</Text>
    </Pressable>
  );
}

function EventCard({
  event,
  clubId,
  isStaff,
  onPress,
  onRespond,
}: {
  event: ClubEventListItemDto;
  clubId: string;
  isStaff: boolean;
  onPress: () => void;
  onRespond: (response: ClubEventAttendanceResponse) => void;
}) {
  return (
    <Pressable onPress={onPress}>
      <Card variant="interactive" padding="md">
        <Stack gap="xs">
          <Text variant="bodyStrong">{event.title}</Text>
          <Text variant="caption" tone="secondary">
            {new Date(event.startsAt).toLocaleString('ko-KR')} · {event.venueName}
          </Text>
          <Text variant="caption" tone="tertiary">
            참석 {event.attendingCount} · 불참 {event.declinedCount} · 미응답 {event.noResponseCount}
            {event.remainingCapacity != null ? ` · 남은 자리 ${event.remainingCapacity}` : ''}
          </Text>
          {!isStaff ? (
            <View style={styles.respondRow}>
              <Button label="참석" size="sm" variant="secondary" onPress={() => onRespond(ClubEventAttendanceResponse.ATTENDING)} />
              <Button label="불참" size="sm" variant="secondary" onPress={() => onRespond(ClubEventAttendanceResponse.DECLINED)} />
              <Button label="미정" size="sm" variant="secondary" onPress={() => onRespond(ClubEventAttendanceResponse.MAYBE)} />
            </View>
          ) : null}
        </Stack>
      </Card>
    </Pressable>
  );
}

async function respond(
  api: ReturnType<typeof getApiClient>,
  clubId: string,
  eventId: string,
  response: ClubEventAttendanceResponse,
  reload: () => Promise<void>,
) {
  await api.updateMyClubEventAttendance(clubId, eventId, { response });
  await reload();
}

const styles = StyleSheet.create({
  cover: {
    width: '100%',
    height: 160,
    borderRadius: 12,
    backgroundColor: '#1a1a1c',
  },
  navRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  staffActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  navChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  respondRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
});
