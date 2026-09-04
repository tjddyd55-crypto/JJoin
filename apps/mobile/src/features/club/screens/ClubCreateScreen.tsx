import { useMemo, useState } from 'react';
import { useRouter, type Href } from 'expo-router';
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
  type CreateClubRequest,
} from '@jjoin/types';
import type { ClubActivityRegionDtoShape } from '@jjoin/domain';
import { ClubFormBody } from '../components/ClubFormBody';
import { CLUB_SECTION_GAP } from '../components/ClubFormSection';
import { getApiClient } from '../../../lib/api';
import { getSecureSessionStore } from '../../../session/SessionContext';
import { NESTED_SCREEN_EDGES } from '../../../ui/nested-screen';

export function ClubCreateScreen() {
  const router = useRouter();
  const api = useMemo(() => getApiClient(getSecureSessionStore()), []);
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

  const values = {
    name,
    coverImageUrl,
    intro,
    activityRegions: activityRegions ?? [],
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
    if (!name.trim() || !activityRegions || activityRegions.length < 1) {
      setError('동호회명과 활동 지역은 필수입니다.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const body: CreateClubRequest = {
        name: name.trim(),
        coverImageUrl: coverImageUrl ?? undefined,
        intro: intro.trim() || null,
        activityRegions,
        activityType,
        primaryVenueName: primaryVenueName.trim() || null,
        joinMode,
        visibility,
        primaryAgeGroup,
      };
      const created = await api.createClub(body);
      router.replace(`/my/clubs/${created.id}` as Href);
    } catch {
      setError('동호회 생성에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <FormScreenFrame
      edges={[...NESTED_SCREEN_EDGES]}
      footer={
        <StickyActionFrame>
          <Button label="동호회 만들기" loading={submitting} onPress={() => void onSubmit()} />
        </StickyActionFrame>
      }
    >
      <Stack gap="md" style={{ gap: CLUB_SECTION_GAP }}>
        <Text variant="clubMeta" tone="secondary">
          대표사진과 기본 정보만 입력하면 바로 생성됩니다.
        </Text>
        <ClubFormBody
          values={values}
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
