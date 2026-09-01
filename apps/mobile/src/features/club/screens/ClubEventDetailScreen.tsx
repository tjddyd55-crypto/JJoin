import { useCallback, useMemo, useState } from 'react';
import { View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import {
  Button,
  Card,
  ScrollScreenFrame,
  Stack,
  Text,
  spacing,
} from '@jjoin/design-system';
import {
  ClubEventAttendanceFinal,
  ClubEventAttendanceResponse,
  type ClubEventDetailDto,
} from '@jjoin/types';
import { getApiClient } from '../../../lib/api';
import { getSecureSessionStore } from '../../../session/SessionContext';
import { NESTED_SCREEN_EDGES } from '../../../ui/nested-screen';

export function ClubEventDetailScreen() {
  const { clubId, eventId } = useLocalSearchParams<{ clubId: string; eventId: string }>();
  const router = useRouter();
  const api = useMemo(() => getApiClient(getSecureSessionStore()), []);
  const [event, setEvent] = useState<ClubEventDetailDto | null>(null);

  const load = useCallback(async () => {
    if (!clubId || !eventId) return;
    setEvent(await api.getClubEvent(clubId, eventId));
  }, [api, clubId, eventId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  if (!event) {
    return (
      <ScrollScreenFrame edges={[...NESTED_SCREEN_EDGES]}>
        <Text tone="secondary">불러오는 중…</Text>
      </ScrollScreenFrame>
    );
  }

  return (
    <ScrollScreenFrame edges={[...NESTED_SCREEN_EDGES]}>
      <Stack gap="md">
        <Text variant="screenTitle">{event.title}</Text>
        <Text variant="caption" tone="secondary">
          {new Date(event.startsAt).toLocaleString('ko-KR')} · {event.venueName}
        </Text>
        {event.memo ? <Text tone="secondary">{event.memo}</Text> : null}
        <Text variant="caption" tone="tertiary">
          참석 {event.attendingCount} · 불참 {event.declinedCount} · 미응답 {event.noResponseCount}
        </Text>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          <Button
            label="참석"
            size="sm"
            variant="secondary"
            onPress={() =>
              void api
                .updateMyClubEventAttendance(clubId!, eventId!, {
                  response: ClubEventAttendanceResponse.ATTENDING,
                })
                .then(load)
            }
          />
          <Button
            label="불참"
            size="sm"
            variant="secondary"
            onPress={() =>
              void api
                .updateMyClubEventAttendance(clubId!, eventId!, {
                  response: ClubEventAttendanceResponse.DECLINED,
                })
                .then(load)
            }
          />
          <Button
            label="미정"
            size="sm"
            variant="secondary"
            onPress={() =>
              void api
                .updateMyClubEventAttendance(clubId!, eventId!, {
                  response: ClubEventAttendanceResponse.MAYBE,
                })
                .then(load)
            }
          />
        </View>

        {event.remainingCapacity != null && event.remainingCapacity > 0 ? (
          <Button
            label={`JJOINZONE에서 긴급 모집 (${event.remainingCapacity}자리)`}
            variant="secondary"
            size="sm"
            onPress={() =>
              void api.getClubUrgentRecruitPrefill(clubId!, eventId!).then((prefill) => {
                router.push({
                  pathname: '/(tabs)/create',
                  params: {
                    venueName: prefill.venueName,
                    venueAddress: prefill.venueAddress ?? '',
                    players: String(Math.min(prefill.remainingSeats + 1, 4)),
                  },
                } as Href);
              })
            }
          />
        ) : null}

        <Text variant="sectionTitle">참석자</Text>
        {event.attendances.map((row) => (
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

        {!event.attendanceFinalized ? (
          <Button
            label="참석 확정 (운영진)"
            size="sm"
            onPress={() =>
              void api
                .finalizeClubEventAttendance(clubId!, eventId!, {
                  items: event.attendances
                    .filter((a) => a.response === ClubEventAttendanceResponse.ATTENDING)
                    .map((a) => ({ userId: a.userId, finalStatus: ClubEventAttendanceFinal.ATTENDED })),
                })
                .then(load)
            }
          />
        ) : null}
      </Stack>
    </ScrollScreenFrame>
  );
}
