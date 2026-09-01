import { useCallback, useMemo, useState } from 'react';
import { Pressable } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { Card, ScrollScreenFrame, Stack, Text } from '@jjoin/design-system';
import type { ClubEventListItemDto } from '@jjoin/types';
import { getApiClient } from '../../../lib/api';
import { getSecureSessionStore } from '../../../session/SessionContext';
import { NESTED_SCREEN_EDGES } from '../../../ui/nested-screen';

export function ClubEventsScreen() {
  const { clubId } = useLocalSearchParams<{ clubId: string }>();
  const router = useRouter();
  const api = useMemo(() => getApiClient(getSecureSessionStore()), []);
  const [items, setItems] = useState<ClubEventListItemDto[]>([]);

  useFocusEffect(
    useCallback(() => {
      if (!clubId) return;
      void api.listClubEvents(clubId).then((res) => setItems(res.items));
    }, [api, clubId]),
  );

  return (
    <ScrollScreenFrame edges={[...NESTED_SCREEN_EDGES]}>
      <Stack gap="md">
        <Text variant="screenTitle">모임</Text>
        {items.map((event) => (
          <Pressable
            key={event.id}
            onPress={() => router.push(`/my/clubs/${clubId}/events/${event.id}` as Href)}
          >
            <Card variant="interactive" padding="md">
              <Text variant="bodyStrong">{event.title}</Text>
              <Text variant="caption" tone="secondary">
                {new Date(event.startsAt).toLocaleString('ko-KR')} · {event.venueName}
              </Text>
            </Card>
          </Pressable>
        ))}
      </Stack>
    </ScrollScreenFrame>
  );
}
