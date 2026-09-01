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
import { composeKstIso, splitKstDateTime } from '../../store/matching-join-ui';
import { getApiClient } from '../../../lib/api';
import { getSecureSessionStore } from '../../../session/SessionContext';
import { NESTED_SCREEN_EDGES } from '../../../ui/nested-screen';

function defaultEventDateTime() {
  const startsAt = new Date(Date.now() + 7 * 24 * 60 * 60_000);
  startsAt.setMinutes(0, 0, 0);
  return splitKstDateTime(startsAt.toISOString());
}

export function ClubCreateEventScreen() {
  const { clubId } = useLocalSearchParams<{ clubId: string }>();
  const router = useRouter();
  const theme = useTheme();
  const api = useMemo(() => getApiClient(getSecureSessionStore()), []);
  const defaults = useMemo(() => defaultEventDateTime(), []);
  const [title, setTitle] = useState('');
  const [eventType, setEventType] = useState<ClubEventType>(ClubEventType.SCREEN);
  const [dateYmd, setDateYmd] = useState(defaults.dateYmd);
  const [startTime, setStartTime] = useState('19:00');
  const [deadlineDateYmd, setDeadlineDateYmd] = useState(defaults.dateYmd);
  const [deadlineTime, setDeadlineTime] = useState('18:00');
  const [venueName, setVenueName] = useState('');
  const [venueAddress, setVenueAddress] = useState('');
  const [capacity, setCapacity] = useState('');
  const [memo, setMemo] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    if (!clubId || !title.trim() || !venueName.trim()) {
      setError('모임명과 장소는 필수입니다.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const startsAt = composeKstIso(dateYmd, startTime);
      const responseDeadline = composeKstIso(deadlineDateYmd, deadlineTime);
      const body: CreateClubEventRequest = {
        title: title.trim(),
        eventType,
        startsAt,
        venueName: venueName.trim(),
        venueAddress: venueAddress.trim() || null,
        capacity: capacity ? Number(capacity) : null,
        responseDeadline,
        memo: memo.trim() || null,
      };
      const created = await api.createClubEvent(clubId, body);
      router.replace(`/my/clubs/${clubId}/events/${created.id}` as Href);
    } catch {
      setError('모임 생성에 실패했습니다. 날짜·시간 형식을 확인하세요.');
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
        <Field label="날짜 (YYYY-MM-DD)">
          <TextInput value={dateYmd} onChangeText={setDateYmd} placeholder="2026-09-10" style={inputStyle} />
        </Field>
        <Field label="시작 시간 (HH:mm)">
          <TextInput value={startTime} onChangeText={setStartTime} placeholder="19:00" style={inputStyle} />
        </Field>
        <TextInput value={venueName} onChangeText={setVenueName} placeholder="장소" style={inputStyle} />
        <TextInput
          value={venueAddress}
          onChangeText={setVenueAddress}
          placeholder="주소 (선택)"
          style={inputStyle}
        />
        <TextInput
          value={capacity}
          onChangeText={setCapacity}
          placeholder="정원 (선택)"
          keyboardType="number-pad"
          style={inputStyle}
        />
        <Field label="참석 응답 마감">
          <TextInput value={deadlineDateYmd} onChangeText={setDeadlineDateYmd} placeholder="YYYY-MM-DD" style={inputStyle} />
          <TextInput value={deadlineTime} onChangeText={setDeadlineTime} placeholder="HH:mm" style={inputStyle} />
        </Field>
        <TextInput value={memo} onChangeText={setMemo} placeholder="간단 메모" style={inputStyle} />
        {error ? <Text tone="error">{error}</Text> : null}
      </Stack>
    </FormScreenFrame>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Stack gap="xs">
      <Text variant="bodyStrong">{label}</Text>
      {children}
    </Stack>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
