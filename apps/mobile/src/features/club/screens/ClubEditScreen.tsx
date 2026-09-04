import { useEffect, useMemo, useState } from 'react';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import {
  Button,
  FormScreenFrame,
  Stack,
  StickyActionFrame,
  Text,
} from '@jjoin/design-system';
import {
  ClubActivityType,
  ClubAgeGroup,
  ClubJoinMode,
  ClubVisibility,
  type UpdateClubRequest,
} from '@jjoin/types';
import type { ClubActivityRegionDtoShape } from '@jjoin/domain';
import { ClubFormBody } from '../components/ClubFormBody';
import { CLUB_SECTION_GAP } from '../components/ClubFormSection';
import { getApiClient } from '../../../lib/api';
import { getSecureSessionStore } from '../../../session/SessionContext';
import { NESTED_SCREEN_EDGES } from '../../../ui/nested-screen';

export function ClubEditScreen() {
  const { clubId } = useLocalSearchParams<{ clubId: string }>();
  const router = useRouter();
  const api = useMemo(() => getApiClient(getSecureSessionStore()), []);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [intro, setIntro] = useState('');
  const [activityRegions, setActivityRegions] = useState<ClubActivityRegionDtoShape[]>([]);
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

  const values = {
    name,
    coverImageUrl,
    intro,
    activityRegions,
    primaryVenueName,
    activityType,
    primaryAgeGroup,
    joinMode,
    visibility,
  };

  const onChange = <K extends keyof typeof values>(key: K, value: (typeof values)[K]) => {
    switch (key) {
      case 'name':
        setName(value as string);
        break;
      case 'coverImageUrl':
        setCoverImageUrl(value as string | null);
        break;
      case 'intro':
        setIntro(value as string);
        break;
      case 'activityRegions':
        setActivityRegions(value as ClubActivityRegionDtoShape[]);
        break;
      case 'primaryVenueName':
        setPrimaryVenueName(value as string);
        break;
      case 'activityType':
        setActivityType(value as ClubActivityType);
        break;
      case 'primaryAgeGroup':
        setPrimaryAgeGroup(value as ClubAgeGroup | null);
        break;
      case 'joinMode':
        setJoinMode(value as ClubJoinMode);
        break;
      case 'visibility':
        setVisibility(value as ClubVisibility);
        break;
    }
  };

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
      <Stack gap="md" style={{ gap: CLUB_SECTION_GAP }}>
        <Text variant="clubMeta" tone="secondary">
          동호회 기본 정보를 수정합니다. 회원·회계·통계는 변경되지 않습니다.
        </Text>
        <ClubFormBody
          values={values}
          clubId={clubId}
          uploadingCover={uploadingCover}
          onChange={onChange}
          onPickCover={(uri) => void onPickCover(uri)}
          onClearCover={() => setCoverImageUrl(null)}
        />
        {error ? <Text tone="error">{error}</Text> : null}
      </Stack>
    </FormScreenFrame>
  );
}
