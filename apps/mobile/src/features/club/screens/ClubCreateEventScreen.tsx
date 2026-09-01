import { useMemo, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import {
  Button,
  Chip,
  FormScreenFrame,
  Stack,
  StickyActionFrame,
  Text,
  spacing,
  useTheme,
} from '@jjoin/design-system';
import { ClubEventType, type CreateClubEventRequest } from '@jjoin/types';
import { getApiClient } from '../../../lib/api';
import { getSecureSessionStore } from '../../../session/SessionContext';
import { NESTED_SCREEN_EDGES } from '../../../ui/nested-screen';

export function ClubCreateEventScreen() {
  const { clubId } = useLocalSearchParams<{ clubId: string }>();
  const router = useRouter();
  const theme = useTheme();
  const api = useMemo(() => getApiClient(getSecureSessionStore()), []);
  const [title, setTitle] = useState('');
  const [eventType, setEventType] = useState<ClubEventType>(ClubEventType.SCREEN);
  const [venueName, setVenueName] = useState('');
  const [venueAddress, setVenueAddress] = useState('');
  const [capacity, setCapacity] = useState('');
  const [memo, setMemo] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const inputStyle = useMemo(
    () => ({
      borderWidth: 1,
      borderRadius: 12,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderColor: theme.colors.border.subtle,
      color: theme.colors.text.primary,
      backgroundColor: theme.colors.surface.card,
    }),
    [theme],
  );

  const onSubmit = async () => {
    if (!clubId || !title.trim() || !venueName.trim()) return;
    setSubmitting(true);
    try {
      const startsAt = new Date(Date.now() + 7 * 24 * 60 * 60_000);
      startsAt.setHours(19, 0, 0, 0);
      const responseDeadline = new Date(startsAt.getTime() - 24 * 60 * 60_000);
      const body: CreateClubEventRequest = {
        title: title.trim(),
        eventType,
        startsAt: startsAt.toISOString(),
        venueName: venueName.trim(),
        venueAddress: venueAddress.trim() || null,
        capacity: capacity ? Number(capacity) : null,
        responseDeadline: responseDeadline.toISOString(),
        memo: memo.trim() || null,
      };
      const created = await api.createClubEvent(clubId, body);
      router.replace(`/my/clubs/${clubId}/events/${created.id}` as Href);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <FormScreenFrame
      edges={[...NESTED_SCREEN_EDGES]}
      footer={
        <StickyActionFrame>
          <Button label="모임 만들기" loading={submitting} onPress={() => void onSubmit()} />
        </StickyActionFrame>
      }
    >
      <Stack gap="md">
        <Text variant="screenTitle">모임 만들기</Text>
        <TextInput value={title} onChangeText={setTitle} placeholder="모임명" style={inputStyle} />
        <View style={styles.chips}>
          {[ClubEventType.SCREEN, ClubEventType.FIELD, ClubEventType.OTHER].map((type) => (
            <Chip
              key={type}
              label={type === 'SCREEN' ? '스크린' : type === 'FIELD' ? '필드' : '기타'}
              selected={eventType === type}
              onPress={() => setEventType(type)}
            />
          ))}
        </View>
        <TextInput value={venueName} onChangeText={setVenueName} placeholder="장소" style={inputStyle} />
        <TextInput
          value={venueAddress}
          onChangeText={setVenueAddress}
          placeholder="주소"
          style={inputStyle}
        />
        <TextInput
          value={capacity}
          onChangeText={setCapacity}
          placeholder="정원 (선택)"
          keyboardType="number-pad"
          style={inputStyle}
        />
        <TextInput value={memo} onChangeText={setMemo} placeholder="메모" style={inputStyle} />
      </Stack>
    </FormScreenFrame>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
