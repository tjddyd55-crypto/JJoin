import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect, type Href } from 'expo-router';
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
import { resolveVenueDisplayName } from '@jjoin/domain';
import { ClubEventType, type CreateClubEventRequest } from '@jjoin/types';
import { JoinCreateVenueSection } from '../../join-create/components/JoinCreateVenueSection';
import {
  type JoinCreateVenueSelection,
  venueSelectionHasPlace,
} from '../../join-create/model/join-create-venue';
import { composeKstIso, splitKstDateTime } from '../../store/matching-join-ui';
import { KstDatePickerField } from '../../../shared/date/KstDatePickerField';
import {
  clearClubEventVenueDraft,
  peekClubEventVenueDraft,
} from '../model/club-event-venue-draft';
import { getApiClient } from '../../../lib/api';
import { getSecureSessionStore } from '../../../session/SessionContext';
import { NESTED_SCREEN_EDGES } from '../../../ui/nested-screen';

function defaultEventDateTime() {
  const startsAt = new Date(Date.now() + 7 * 24 * 60 * 60_000);
  startsAt.setMinutes(0, 0, 0);
  return splitKstDateTime(startsAt.toISOString());
}

const TIME_PATTERN = /^(\d{1,2}):(\d{2})$/;

function isValidTimeHm(value: string): boolean {
  const match = TIME_PATTERN.exec(value.trim());
  if (!match) return false;
  const h = Number(match[1]);
  const m = Number(match[2]);
  return h >= 0 && h <= 23 && m >= 0 && m <= 59;
}

export function ClubCreateEventScreen() {
  const { clubId } = useLocalSearchParams<{ clubId: string }>();
  const router = useRouter();
  const theme = useTheme();
  const api = useMemo(() => getApiClient(getSecureSessionStore()), []);
  const defaults = useMemo(() => defaultEventDateTime(), []);
  const [title, setTitle] = useState('');
  const [eventType, setEventType] = useState<ClubEventType>(ClubEventType.SCREEN);
  const [selectedVenue, setSelectedVenue] = useState<JoinCreateVenueSelection | null>(null);
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

  useFocusEffect(
    useCallback(() => {
      if (!clubId) return;
      const picked = peekClubEventVenueDraft(clubId);
      if (picked) {
        setSelectedVenue(picked);
        clearClubEventVenueDraft();
      }
    }, [clubId]),
  );

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

  const isScreen = eventType === ClubEventType.SCREEN;
  const venueDisplayName = selectedVenue
    ? resolveVenueDisplayName({
        golfFacilityDisplayName: selectedVenue.name,
        activatedVenueName: selectedVenue.name,
      })
    : '';

  const onPickFromMap = useCallback(() => {
    router.push({
      pathname: '/(tabs)/screen',
      params: { venuePick: '1', clubEventPick: clubId ?? '' },
    } as Href);
  }, [clubId, router]);

  const onSubmit = async () => {
    if (!clubId || !title.trim()) {
      setError('모임명은 필수입니다.');
      return;
    }
    if (!isValidTimeHm(startTime) || !isValidTimeHm(deadlineTime)) {
      setError('시간은 HH:mm 형식으로 입력해 주세요.');
      return;
    }
    if (isScreen) {
      if (!selectedVenue?.venueId) {
        setError('스크린 모임은 GolfFacility(스크린장)를 선택해 주세요.');
        return;
      }
    } else if (!venueName.trim()) {
      setError('장소를 입력해 주세요.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const startsAt = composeKstIso(dateYmd, startTime);
      const responseDeadline = composeKstIso(deadlineDateYmd, deadlineTime);
      const resolvedName = isScreen
        ? resolveVenueDisplayName({
            golfFacilityDisplayName: selectedVenue!.name,
            activatedVenueName: selectedVenue!.name,
          })
        : venueName.trim();
      const body: CreateClubEventRequest = {
        title: title.trim(),
        eventType,
        startsAt,
        venueName: resolvedName,
        venueAddress: isScreen
          ? selectedVenue!.address || null
          : venueAddress.trim() || null,
        venueId: isScreen ? selectedVenue!.venueId : null,
        golfFacilityId: isScreen ? selectedVenue!.golfFacilityId ?? null : null,
        capacity: capacity ? Number(capacity) : null,
        responseDeadline,
        memo: memo.trim() || null,
      };
      const created = await api.createClubEvent(clubId, body);
      router.replace(`/my/clubs/${clubId}/events/${created.id}` as Href);
    } catch {
      setError('모임 생성에 실패했습니다. 날짜·시간·장소를 확인하세요.');
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
        <TextInput value={title} onChangeText={setTitle} placeholder="모임명" style={inputStyle} />
        <View style={styles.chips}>
          {[ClubEventType.SCREEN, ClubEventType.FIELD, ClubEventType.OTHER].map((type) => (
            <Chip
              key={type}
              label={type === 'SCREEN' ? '스크린' : type === 'FIELD' ? '필드' : '기타'}
              selected={eventType === type}
              onPress={() => {
                setEventType(type);
                if (type !== ClubEventType.SCREEN) setSelectedVenue(null);
              }}
            />
          ))}
        </View>
        <KstDatePickerField label="날짜" dateYmd={dateYmd} onChange={setDateYmd} disallowPast />
        <Field label="시작 시간 (HH:mm)">
          <TextInput
            value={startTime}
            onChangeText={setStartTime}
            placeholder="19:00"
            keyboardType="numbers-and-punctuation"
            style={inputStyle}
          />
        </Field>

        {isScreen ? (
          <Field label="스크린장 (GolfFacility)">
            <JoinCreateVenueSection
              api={api}
              selected={selectedVenue}
              onChange={setSelectedVenue}
              onPickFromMap={onPickFromMap}
              restrictToFacilityPick
            />
            {selectedVenue && venueSelectionHasPlace(selectedVenue) ? (
              <Stack gap="xs">
                <Text variant="bodyStrong">{venueDisplayName}</Text>
                {selectedVenue.address ? (
                  <Text variant="caption" tone="secondary">{selectedVenue.address}</Text>
                ) : null}
              </Stack>
            ) : null}
          </Field>
        ) : (
          <>
            <TextInput value={venueName} onChangeText={setVenueName} placeholder="장소" style={inputStyle} />
            <TextInput
              value={venueAddress}
              onChangeText={setVenueAddress}
              placeholder="주소 (선택)"
              style={inputStyle}
            />
          </>
        )}

        <TextInput
          value={capacity}
          onChangeText={setCapacity}
          placeholder="정원 (선택)"
          keyboardType="number-pad"
          style={inputStyle}
        />
        <Field label="참석 응답 마감">
          <KstDatePickerField dateYmd={deadlineDateYmd} onChange={setDeadlineDateYmd} disallowPast />
          <TextInput
            value={deadlineTime}
            onChangeText={setDeadlineTime}
            placeholder="HH:mm"
            keyboardType="numbers-and-punctuation"
            style={inputStyle}
          />
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
