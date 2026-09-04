import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { ClubEmptyState, ClubSection, ScrollScreenFrame, Stack } from '@jjoin/design-system';
import { ClubEventStatus, type ClubEventListItemDto } from '@jjoin/types';
import { ClubEventRow } from '../components/ClubEventRow';
import { CLUB_SECTION_GAP } from '../components/ClubFormSection';
import { getApiClient } from '../../../lib/api';
import { getSecureSessionStore } from '../../../session/SessionContext';
import { NESTED_SCREEN_EDGES } from '../../../ui/nested-screen';

const PAST_STATUSES = new Set<ClubEventStatus>([
  ClubEventStatus.COMPLETED,
  ClubEventStatus.CANCELLED,
]);

function partitionEvents(items: ClubEventListItemDto[]) {
  const upcoming: ClubEventListItemDto[] = [];
  const past: ClubEventListItemDto[] = [];
  for (const event of items) {
    if (PAST_STATUSES.has(event.status)) {
      past.push(event);
    } else {
      upcoming.push(event);
    }
  }
  upcoming.sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
  past.sort((a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime());
  return { upcoming, past };
}

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

  const { upcoming, past } = useMemo(() => partitionEvents(items), [items]);

  return (
    <ScrollScreenFrame edges={[...NESTED_SCREEN_EDGES]}>
      <Stack gap="md" style={{ gap: CLUB_SECTION_GAP }}>
        {upcoming.length > 0 ? (
          <ClubSection title="예정 일정">
            {upcoming.map((event) => (
              <ClubEventRow
                key={event.id}
                title={event.title}
                startsAt={event.startsAt}
                venueName={event.venueName}
                attendingCount={event.attendingCount}
                capacity={event.capacity}
                onPress={() => router.push(`/my/clubs/${clubId}/events/${event.id}` as Href)}
              />
            ))}
          </ClubSection>
        ) : null}

        {past.length > 0 ? (
          <ClubSection title="지난 일정">
            {past.map((event) => (
              <ClubEventRow
                key={event.id}
                title={event.title}
                startsAt={event.startsAt}
                venueName={event.venueName}
                attendingCount={event.attendingCount}
                capacity={event.capacity}
                onPress={() => router.push(`/my/clubs/${clubId}/events/${event.id}` as Href)}
              />
            ))}
          </ClubSection>
        ) : null}

        {items.length === 0 ? (
          <ClubEmptyState
            title="등록된 일정이 없습니다"
            description="운영진이 일정을 등록하면 여기에 표시됩니다."
          />
        ) : null}
      </Stack>
    </ScrollScreenFrame>
  );
}
