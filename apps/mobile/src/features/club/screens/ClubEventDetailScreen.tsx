import { useCallback, useMemo, useState } from 'react';
import { Alert, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import {
  Button,
  Card,
  Chip,
  ScrollScreenFrame,
  Stack,
  Text,
  spacing,
} from '@jjoin/design-system';
import { isClubStaff } from '@jjoin/domain';
import {
  ClubEventAttendanceFinal,
  ClubEventAttendanceResponse,
  ClubMembershipStatus,
  type ClubEventDetailDto,
  type ClubEventAttendanceDto,
} from '@jjoin/types';
import { getApiClient } from '../../../lib/api';
import { getSecureSessionStore, useSession } from '../../../session/SessionContext';
import { NESTED_SCREEN_EDGES } from '../../../ui/nested-screen';

type AttendanceFilter = 'ALL' | 'ATTENDING' | 'DECLINED' | 'MAYBE' | 'NO_RESPONSE' | 'NO_SHOW';

function matchesFilter(row: ClubEventAttendanceDto, filter: AttendanceFilter) {
  if (filter === 'ALL') return true;
  if (filter === 'NO_SHOW') return row.finalStatus === ClubEventAttendanceFinal.NO_SHOW;
  if (filter === 'NO_RESPONSE') return row.response === ClubEventAttendanceResponse.NO_RESPONSE;
  return row.response === filter;
}

function defaultFinalStatus(row: ClubEventAttendanceDto): ClubEventAttendanceFinal {
  if (row.response === ClubEventAttendanceResponse.ATTENDING) {
    return ClubEventAttendanceFinal.ATTENDED;
  }
  return ClubEventAttendanceFinal.NO_SHOW;
}

export function ClubEventDetailScreen() {
  const { clubId, eventId } = useLocalSearchParams<{ clubId: string; eventId: string }>();
  const router = useRouter();
  const { me } = useSession();
  const api = useMemo(() => getApiClient(getSecureSessionStore()), []);
  const [event, setEvent] = useState<ClubEventDetailDto | null>(null);
  const [myRole, setMyRole] = useState<string | null>(null);
  const [filter, setFilter] = useState<AttendanceFilter>('ALL');
  const [finalizeOpen, setFinalizeOpen] = useState(false);
  const [finalizeDraft, setFinalizeDraft] = useState<Record<string, ClubEventAttendanceFinal>>({});

  const load = useCallback(async () => {
    if (!clubId || !eventId) return;
    const [detail, club] = await Promise.all([
      api.getClubEvent(clubId, eventId),
      api.getClubDetail(clubId),
    ]);
    setEvent(detail);
    setMyRole(club.myRole);
  }, [api, clubId, eventId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const staff = myRole
    ? isClubStaff({ role: myRole, status: ClubMembershipStatus.ACTIVE })
    : false;

  const myAttendance = useMemo(
    () => event?.attendances.find((a) => a.userId === me?.userId) ?? null,
    [event?.attendances, me?.userId],
  );

  const canOpenEventChat = Boolean(
    event?.linkedJoinId &&
      (myAttendance?.response === ClubEventAttendanceResponse.ATTENDING ||
        myAttendance?.finalStatus === ClubEventAttendanceFinal.ATTENDED),
  );

  const openFinalizePanel = () => {
    if (!event) return;
    const draft: Record<string, ClubEventAttendanceFinal> = {};
    for (const row of event.attendances) {
      draft[row.userId] = defaultFinalStatus(row);
    }
    setFinalizeDraft(draft);
    setFinalizeOpen(true);
  };

  const confirmFinalize = () => {
    if (!event || !clubId || !eventId) return;
    Alert.alert(
      '참석 확정 및 모임 종료',
      '참석 기록을 확정하면 회원 참석 통계에 반영됩니다.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '확정',
          style: 'destructive',
          onPress: () => {
            void api
              .finalizeClubEventAttendance(clubId, eventId, {
                items: Object.entries(finalizeDraft).map(([userId, finalStatus]) => ({
                  userId,
                  finalStatus,
                })),
              })
              .then(() => {
                setFinalizeOpen(false);
                return load();
              });
          },
        },
      ],
    );
  };

  if (!event) {
    return (
      <ScrollScreenFrame edges={[...NESTED_SCREEN_EDGES]}>
        <Text tone="secondary">불러오는 중…</Text>
      </ScrollScreenFrame>
    );
  }

  const filtered = event.attendances.filter((row) => matchesFilter(row, filter));
  const deadlinePassed = new Date(event.responseDeadline).getTime() < Date.now();

  return (
    <ScrollScreenFrame edges={[...NESTED_SCREEN_EDGES]}>
      <Stack gap="md">
        <Text variant="screenTitle">{event.title}</Text>
        <Text variant="caption" tone="secondary">
          {new Date(event.startsAt).toLocaleString('ko-KR')} · {event.venueName}
        </Text>
        {event.memo ? <Text tone="secondary">{event.memo}</Text> : null}

        <Card padding="md">
          <Text variant="caption" tone="secondary">
            참석 {event.attendingCount} · 불참 {event.declinedCount} · 미정 {event.maybeCount ?? 0} · 미응답{' '}
            {event.noResponseCount}
          </Text>
          <Text variant="caption" tone="secondary">
            동호회 회원 {event.memberAttendingCount ?? event.attendingCount} · 외부 참가{' '}
            {event.externalParticipantCount ?? 0}
            {event.capacity != null
              ? ` · 총 ${event.totalOccupiedCount ?? 0} / ${event.capacity}`
              : ''}
          </Text>
          {event.remainingCapacity != null ? (
            <Text variant="bodyStrong">남은 자리 {event.remainingCapacity}</Text>
          ) : null}
          {event.attendanceFinalized ? (
            <Text variant="bodyStrong">
              확정 — 참석 {event.finalizedAttendedCount ?? 0} · 노쇼 {event.finalizedNoShowCount ?? 0}
              {event.externalParticipantCount
                ? ` · 외부 ${event.externalParticipantCount}`
                : ''}
            </Text>
          ) : null}
        </Card>

        {canOpenEventChat ? (
          <Button
            label="모임 채팅"
            variant="secondary"
            size="sm"
            onPress={() => router.push(`/join/${event.linkedJoinId}/chat` as Href)}
          />
        ) : null}

        {!event.attendanceFinalized && !deadlinePassed ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {[
              ClubEventAttendanceResponse.ATTENDING,
              ClubEventAttendanceResponse.DECLINED,
              ClubEventAttendanceResponse.MAYBE,
            ].map((response) => (
              <Button
                key={response}
                label={response === 'ATTENDING' ? '참석' : response === 'DECLINED' ? '불참' : '미정'}
                size="sm"
                variant="secondary"
                onPress={() =>
                  void api.updateMyClubEventAttendance(clubId!, eventId!, { response }).then(load)
                }
              />
            ))}
          </View>
        ) : deadlinePassed && !event.attendanceFinalized ? (
          <Text variant="caption" tone="tertiary">
            응답 마감이 지났습니다.
          </Text>
        ) : null}

        {staff && event.remainingCapacity != null && event.remainingCapacity > 0 && !event.attendanceFinalized ? (
          <Button
            label={`쪼인존에서 긴급 모집 (${event.remainingCapacity}자리 부족)`}
            variant="secondary"
            size="sm"
            onPress={() =>
              void api.getClubUrgentRecruitPrefill(clubId!, eventId!).then((prefill) => {
                router.push({
                  pathname: '/(tabs)/create',
                  params: {
                    clubId: prefill.clubId,
                    clubEventId: prefill.clubEventId,
                    venueId: prefill.venueId ?? '',
                    venueName: prefill.venueName,
                    venueAddress: prefill.venueAddress ?? '',
                    startsAt: prefill.startsAt,
                    title: prefill.title,
                    players: String(Math.min(prefill.remainingSeats + 1, 4)),
                  },
                } as Href);
              })
            }
          />
        ) : null}

        {staff ? (
          <>
            {!event.attendanceFinalized && !finalizeOpen ? (
              <Button label="실제 참석 확인" size="sm" onPress={openFinalizePanel} />
            ) : null}

            {finalizeOpen ? (
              <Card padding="md">
                <Stack gap="sm">
                  <Text variant="sectionTitle">실제 참석 확인</Text>
                  {event.attendances.map((row) => (
                    <View key={row.userId} style={{ gap: spacing.xs }}>
                      <Text variant="body">{row.nickname}</Text>
                      <Text variant="caption" tone="secondary">
                        응답 {row.response}
                      </Text>
                      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                        <Chip
                          label="참석"
                          selected={finalizeDraft[row.userId] === ClubEventAttendanceFinal.ATTENDED}
                          onPress={() =>
                            setFinalizeDraft((prev) => ({
                              ...prev,
                              [row.userId]: ClubEventAttendanceFinal.ATTENDED,
                            }))
                          }
                        />
                        <Chip
                          label="노쇼"
                          selected={finalizeDraft[row.userId] === ClubEventAttendanceFinal.NO_SHOW}
                          onPress={() =>
                            setFinalizeDraft((prev) => ({
                              ...prev,
                              [row.userId]: ClubEventAttendanceFinal.NO_SHOW,
                            }))
                          }
                        />
                      </View>
                    </View>
                  ))}
                  <Button label="참석 확정 및 모임 종료" size="sm" onPress={confirmFinalize} />
                  <Button
                    label="취소"
                    size="sm"
                    variant="secondary"
                    onPress={() => setFinalizeOpen(false)}
                  />
                </Stack>
              </Card>
            ) : null}

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
              {(
                [
                  ['ALL', '전체'],
                  ['ATTENDING', '참석'],
                  ['DECLINED', '불참'],
                  ['MAYBE', '미정'],
                  ['NO_RESPONSE', '미응답'],
                  ['NO_SHOW', '노쇼'],
                ] as const
              ).map(([value, label]) => (
                <Chip
                  key={value}
                  label={label}
                  selected={filter === value}
                  onPress={() => setFilter(value)}
                />
              ))}
            </View>
            <Text variant="sectionTitle">참석자</Text>
            {filtered.map((row) => (
              <Card key={row.userId} padding="sm">
                <Stack gap="xxs">
                  <Text variant="body">{row.nickname}</Text>
                  <Text variant="caption" tone="secondary">
                    응답 {row.response}
                    {row.finalStatus ? ` · 확정 ${row.finalStatus}` : ''}
                  </Text>
                </Stack>
              </Card>
            ))}
          </>
        ) : null}

        {staff && event.eventAccounting ? (
          <Card padding="md">
            <Text variant="sectionTitle">관련 회계</Text>
            <Text variant="caption" tone="secondary">
              수입 {event.eventAccounting.income} · 지출 {event.eventAccounting.expense} · 잔액{' '}
              {event.eventAccounting.balance}
            </Text>
          </Card>
        ) : null}
      </Stack>
    </ScrollScreenFrame>
  );
}
