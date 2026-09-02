import { useCallback, useMemo, useState, type ReactNode } from 'react';
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
import { KstTimePickerField } from '../../../shared/date/KstTimePickerField';
import { parseHm } from '../../../shared/date/kst-time';
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
    if (!parseHm(startTime) || !parseHm(deadlineTime)) {
      setError('시작·마감 시간을 선택해 주세요.');
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

    let startsAt: string;
    let responseDeadline: string;
    try {
      startsAt = composeKstIso(dateYmd, startTime);
      responseDeadline = composeKstIso(deadlineDateYmd, deadlineTime);
    } catch {
      setError('날짜와 시간을 확인해 주세요.');
      return;
    }
    if (new Date(responseDeadline).getTime() >= new Date(startsAt).getTime()) {
      setError('참석 응답 마감은 시작 시간보다 이전이어야 합니다.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
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
        <KstTimePickerField label="시작 시간" valueHm={startTime} onChange={setStartTime} />

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
                  <Text variant="caption" tone="secondary">
                    {selectedVenue.address}
                  </Text>
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
          <KstTimePickerField valueHm={deadlineTime} onChange={setDeadlineTime} />
        </Field>
        <TextInput
          value={memo}
          onChangeText={setMemo}
          placeholder="간단 메모"
          multiline
          textAlignVertical="top"
          style={[inputStyle, styles.memo]}
        />
        {error ? <Text tone="error">{error}</Text> : null}
      </Stack>
    </FormScreenFrame>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Stack gap="xs">
      <Text variant="bodyStrong">{label}</Text>
      {children}
    </Stack>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  memo: { minHeight: 96 },
});
