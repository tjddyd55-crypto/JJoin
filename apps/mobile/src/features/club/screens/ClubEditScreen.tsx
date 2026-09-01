import { useEffect, useMemo, useState, type ReactNode } from 'react';
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
import {
  ClubActivityType,
  ClubAgeGroup,
  ClubJoinMode,
  ClubVisibility,
  type ClubActivityRegionDto,
  type UpdateClubRequest,
} from '@jjoin/types';
import { ClubCoverPicker } from '../components/ClubCoverPicker';
import { ClubActivityRegionPicker } from '../components/ClubActivityRegionPicker';
import { getApiClient } from '../../../lib/api';
import { getSecureSessionStore } from '../../../session/SessionContext';
import { NESTED_SCREEN_EDGES } from '../../../ui/nested-screen';

const ACTIVITY_OPTIONS = [
  { value: ClubActivityType.SCREEN, label: '스크린' },
  { value: ClubActivityType.FIELD, label: '필드' },
  { value: ClubActivityType.SCREEN_AND_FIELD, label: '스크린 + 필드' },
] as const;

const AGE_OPTIONS = [
  { value: ClubAgeGroup.TWENTIES, label: '20대' },
  { value: ClubAgeGroup.THIRTIES, label: '30대' },
  { value: ClubAgeGroup.FORTIES, label: '40대' },
  { value: ClubAgeGroup.FIFTIES, label: '50대' },
  { value: ClubAgeGroup.SIXTIES_PLUS, label: '60대+' },
] as const;

export function ClubEditScreen() {
  const { clubId } = useLocalSearchParams<{ clubId: string }>();
  const router = useRouter();
  const theme = useTheme();
  const api = useMemo(() => getApiClient(getSecureSessionStore()), []);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [intro, setIntro] = useState('');
  const [activityRegions, setActivityRegions] = useState<ClubActivityRegionDto[]>([]);
  const [primaryVenueName, setPrimaryVenueName] = useState('');
  const [activityType, setActivityType] = useState<ClubActivityType>(ClubActivityType.SCREEN);
  const [primaryAgeGroup, setPrimaryAgeGroup] = useState<ClubAgeGroup | null>(ClubAgeGroup.FORTIES);
  const [joinMode, setJoinMode] = useState<ClubJoinMode>(ClubJoinMode.APPROVAL);
  const [visibility, setVisibility] = useState<ClubVisibility>(ClubVisibility.PUBLIC);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!clubId) return;
    void (async () => {
      setLoading(true);
      try {
        const detail = await api.getClubDetail(clubId);
        setName(detail.name);
        setCoverImageUrl(detail.coverImageUrl);
        setIntro(detail.intro ?? '');
        setActivityRegions(detail.activityRegions ?? []);
        setPrimaryVenueName(detail.primaryVenueName ?? '');
        setActivityType(detail.activityType);
        setPrimaryAgeGroup(detail.primaryAgeGroup);
        setJoinMode(detail.joinMode);
        setVisibility(detail.visibility);
      } catch {
        setError('동호회 정보를 불러올 수 없습니다.');
      } finally {
        setLoading(false);
      }
    })();
  }, [api, clubId]);

  const inputStyle = useMemo(
    () => [
      styles.input,
      {
        borderColor: theme.colors.border.subtle,
        color: theme.colors.text.primary,
        backgroundColor: theme.colors.surface.card,
      },
    ],
    [theme],
  );

  const onPickCover = async (localUri: string) => {
    setUploadingCover(true);
    setError(null);
    try {
      const uploaded = await api.uploadClubCover({ localUri });
      setCoverImageUrl(uploaded.coverImageUrl);
    } catch {
      setError('대표사진 업로드에 실패했습니다.');
    } finally {
      setUploadingCover(false);
    }
  };

  const onSubmit = async () => {
    if (!clubId || !name.trim()) {
      setError('동호회명은 필수입니다.');
      return;
    }
    if (activityRegions.length < 1) {
      setError('활동 지역을 1개 이상 선택해 주세요.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const body: UpdateClubRequest = {
        name: name.trim(),
        coverImageUrl: coverImageUrl ?? null,
        intro: intro.trim() || null,
        activityRegions,
        activityType,
        primaryVenueName: primaryVenueName.trim() || null,
        joinMode,
        visibility,
        primaryAgeGroup,
      };
      await api.updateClub(clubId, body);
      router.replace(`/my/clubs/${clubId}` as Href);
    } catch {
      setError('동호회 정보 저장에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <FormScreenFrame edges={[...NESTED_SCREEN_EDGES]}>
        <Text tone="secondary">불러오는 중…</Text>
      </FormScreenFrame>
    );
  }

  return (
    <FormScreenFrame
      edges={[...NESTED_SCREEN_EDGES]}
      footer={
        <StickyActionFrame>
          <Button label="저장" loading={submitting} onPress={() => void onSubmit()} />
        </StickyActionFrame>
      }
    >
      <Stack gap="md">
        <Text variant="caption" tone="secondary">
          동호회 기본 정보를 수정합니다. 회원·회계·통계는 변경되지 않습니다.
        </Text>
        <Field label="대표사진 (선택)">
          <ClubCoverPicker
            coverImageUrl={coverImageUrl}
            uploading={uploadingCover}
            onPick={(uri) => void onPickCover(uri)}
            onClear={() => setCoverImageUrl(null)}
          />
        </Field>
        <Field label="동호회명">
          <TextInput value={name} onChangeText={setName} placeholder="예: 일산 골프 모임" style={inputStyle} />
        </Field>
        <Field label="짧은 소개">
          <TextInput value={intro} onChangeText={setIntro} placeholder="짧은 소개" style={inputStyle} />
        </Field>
        <Field label="활동 지역">
          <ClubActivityRegionPicker value={activityRegions} onChange={setActivityRegions} />
        </Field>
        <Field label="활동 유형">
          <View style={styles.chips}>
            {ACTIVITY_OPTIONS.map((opt) => (
              <Chip
                key={opt.value}
                label={opt.label}
                selected={activityType === opt.value}
                onPress={() => setActivityType(opt.value)}
              />
            ))}
          </View>
        </Field>
        <Field label="주 활동 매장 (선택)">
          <TextInput
            value={primaryVenueName}
            onChangeText={setPrimaryVenueName}
            placeholder="매장명"
            style={inputStyle}
          />
        </Field>
        <Field label="주요 연령대">
          <View style={styles.chips}>
            {AGE_OPTIONS.map((opt) => (
              <Chip
                key={opt.value}
                label={opt.label}
                selected={primaryAgeGroup === opt.value}
                onPress={() => setPrimaryAgeGroup(opt.value)}
              />
            ))}
          </View>
        </Field>
        <Field label="가입 방식">
          <View style={styles.chips}>
            <Chip
              label="승인제"
              selected={joinMode === ClubJoinMode.APPROVAL}
              onPress={() => setJoinMode(ClubJoinMode.APPROVAL)}
            />
            <Chip
              label="바로 가입"
              selected={joinMode === ClubJoinMode.INSTANT}
              onPress={() => setJoinMode(ClubJoinMode.INSTANT)}
            />
          </View>
        </Field>
        <Field label="공개 설정">
          <View style={styles.chips}>
            <Chip
              label="공개"
              selected={visibility === ClubVisibility.PUBLIC}
              onPress={() => setVisibility(ClubVisibility.PUBLIC)}
            />
            <Chip
              label="비공개"
              selected={visibility === ClubVisibility.PRIVATE}
              onPress={() => setVisibility(ClubVisibility.PRIVATE)}
            />
          </View>
        </Field>
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
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
});
