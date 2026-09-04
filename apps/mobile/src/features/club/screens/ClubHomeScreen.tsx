import { useCallback, useMemo, useState } from 'react';
import { Dimensions, Pressable, StyleSheet, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Button,
  Card,
  ClubCover,
  ClubJoinPolicyBadge,
  ClubSection,
  ScrollScreenFrame,
  Stack,
  StickyActionFrame,
  Text,
  stickyActionScrollPadding,
  spacing,
  useTheme,
} from '@jjoin/design-system';
import {
  clubActivityTypeLabel,
  formatClubActivityRegionsCompact,
  isClubStaff,
} from '@jjoin/domain';
import {
  ClubEventAttendanceResponse,
  ClubJoinMode,
  ClubMembershipStatus,
  ClubVisibility,
  type ClubDetailDto,
  type ClubEventListItemDto,
} from '@jjoin/types';
import { ClubKpiGrid, ClubRecent30Row } from '../components/ClubKpiGrid';
import { getApiClient } from '../../../lib/api';
import { getSecureSessionStore } from '../../../session/SessionContext';
import { NESTED_SCREEN_EDGES } from '../../../ui/nested-screen';
import { clubCoverFallbackTone } from '../model/club-display';
import {
  resolveClubDetailPrimaryCta,
  shouldShowClubDetailStickyCta,
} from '../model/club-detail-cta';

export function ClubHomeScreen() {
  const { clubId } = useLocalSearchParams<{ clubId: string }>();
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const api = useMemo(() => getApiClient(getSecureSessionStore()), []);
  const [detail, setDetail] = useState<ClubDetailDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const heroWidth = Dimensions.get('window').width - 32;

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

  const primaryCta = detail
    ? resolveClubDetailPrimaryCta({ detail, isStaff })
    : null;
  const showStickyCta = primaryCta
    ? shouldShowClubDetailStickyCta(primaryCta.presentation)
    : false;
  const scrollBottomPadding = showStickyCta
    ? stickyActionScrollPadding(insets.bottom)
    : theme.layoutSpacing.sectionGap;

  async function onPrimaryCtaPress() {
    if (!clubId || !detail || !primaryCta || busy) return;
    if (primaryCta.presentation === 'manage') {
      router.push(`/my/clubs/${clubId}/edit` as Href);
      return;
    }
    if (primaryCta.presentation === 'members') {
      router.push(`/my/clubs/${clubId}/members` as Href);
      return;
    }
    setBusy(true);
    try {
      await api.joinClub(clubId);
      await load();
    } catch {
      setError('가입 신청에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  }

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

  const regionLabel = formatClubActivityRegionsCompact(detail.activityRegions ?? [], {
    maxParts: 3,
  });

  return (
    <View style={styles.root}>
      <ScrollScreenFrame
        edges={[...NESTED_SCREEN_EDGES]}
        contentPaddingBottom={scrollBottomPadding}
        padded={false}
      >
        <View style={styles.content}>
          <ClubCover
            uri={detail.coverImageUrl}
            variant="hero"
            heroWidth={heroWidth}
            fallbackTone={clubCoverFallbackTone(detail.id)}
            style={styles.hero}
            imageStyle={styles.hero}
          />

          <Stack gap="xs">
            <Text variant="screenTitle">{detail.name}</Text>
            {detail.intro ? (
              <Text variant="clubIntro" tone="secondary">
                {detail.intro}
              </Text>
            ) : null}
            <View style={styles.badgeRow}>
              <ClubJoinPolicyBadge label={clubActivityTypeLabel(detail.activityType) ?? '동호회'} />
              <ClubJoinPolicyBadge
                label={detail.joinMode === ClubJoinMode.INSTANT ? '즉시 가입' : '승인 가입'}
                tone={detail.joinMode === ClubJoinMode.INSTANT ? 'active' : 'neutral'}
              />
              <ClubJoinPolicyBadge
                label={detail.visibility === ClubVisibility.PUBLIC ? '공개' : '비공개'}
              />
            </View>
            <Text variant="clubMeta" tone="tertiary">
              {regionLabel || detail.region} · 회원 {detail.memberCount}명
              {detail.dashboard.recent30DayEvents > 0
                ? ` · 최근 30일 모임 ${detail.dashboard.recent30DayEvents}회`
                : ''}
            </Text>
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
            </View>
          ) : null}

          <ClubSection title="진행 중인 모임">
            {!detail.activeEvents.length ? (
              <Text variant="clubMeta" tone="tertiary">진행 중인 모임이 없습니다.</Text>
            ) : (
              detail.activeEvents.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  isStaff={isStaff}
                  onPress={() => router.push(`/my/clubs/${clubId}/events/${event.id}` as Href)}
                  onRespond={(response) => void respond(api, clubId, event.id, response, load)}
                />
              ))
            )}
          </ClubSection>
        </View>
      </ScrollScreenFrame>

      {showStickyCta && primaryCta ? (
        <StickyActionFrame>
          <Button
            label={primaryCta.label}
            disabled={primaryCta.disabled}
            loading={busy}
            size="lg"
            onPress={() => void onPrimaryCtaPress()}
          />
        </StickyActionFrame>
      ) : null}
    </View>
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
  isStaff,
  onPress,
  onRespond,
}: {
  event: ClubEventListItemDto;
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
  root: { flex: 1 },
  content: {
    paddingHorizontal: 16,
    gap: 16,
    paddingTop: 8,
  },
  hero: {
    alignSelf: 'center',
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
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
