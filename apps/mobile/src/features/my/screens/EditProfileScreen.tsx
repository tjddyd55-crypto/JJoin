import { useState } from 'react';
import { Alert, Linking, Switch, View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  Button,
  Chip,
  FormScreenFrame,
  Input,
  Spacer,
  StickyActionFrame,
  Text,
} from '@jjoin/design-system';
import {
  DRINKING_HABITS,
  FIELD_HANDICAP_MAX,
  FIELD_HANDICAP_MIN,
  MAX_PROFILE_GALLERY_PHOTOS,
  SCREEN_HANDICAP_MAX,
  SCREEN_HANDICAP_MIN,
  SMOKING_HABITS,
  formatDrinkingHabitLabel,
  formatSmokingHabitLabel,
} from '@jjoin/domain';
import { t } from '@jjoin/i18n';
import { profileEditSchema } from '@jjoin/validation';
import { SportSkillLevel, type DrinkingHabit, type SmokingHabit } from '@jjoin/types';
import { useSession } from '../../../session/SessionContext';
import { NESTED_SCREEN_EDGES } from '../../../ui/nested-screen';
import { ProfilePhotoEditorSection } from '../../profile/components/ProfilePhotoEditorSection';
import { messageForProfilePhotoError } from '../../profile/profile-photo-error';
import {
  pickProfileGalleryImagesFromLibrary,
  pickProfileImageFromLibrary,
  toUploadPayload,
} from '../../profile/profile-image-picker';

function parseScreenHandicapInput(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const n = Number.parseInt(trimmed, 10);
  if (!Number.isFinite(n) || !Number.isInteger(n)) return null;
  if (n < SCREEN_HANDICAP_MIN || n > SCREEN_HANDICAP_MAX) return null;
  return n;
}

function parseOptionalInt(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const n = Number.parseInt(trimmed, 10);
  return Number.isFinite(n) && Number.isInteger(n) ? n : null;
}

export function EditProfileScreen() {
  const {
    me,
    editProfile,
    uploadProfilePhoto,
    deleteProfilePhoto,
    addProfileGalleryPhoto,
    deleteProfileGalleryPhoto,
    reorderProfileGalleryPhotos,
    setPrimaryProfilePhoto,
  } = useSession();
  const router = useRouter();
  const golfProfile = me?.publicProfile?.sportProfiles.find((s) => s.sportCode === 'SCREEN_GOLF');
  const privacy = me?.publicProfile?.privacy;
  const [nickname, setNickname] = useState(me?.publicProfile?.nickname ?? '');
  const [regionLabel, setRegionLabel] = useState(me?.publicProfile?.regionLabel ?? '');
  const [bio, setBio] = useState(me?.publicProfile?.bio ?? '');
  const [personality, setPersonality] = useState(me?.publicProfile?.personality ?? '');
  const [ageText, setAgeText] = useState(
    me?.publicProfile?.age != null ? String(me.publicProfile.age) : '',
  );
  const [heightText, setHeightText] = useState(
    me?.publicProfile?.heightCm != null ? String(me.publicProfile.heightCm) : '',
  );
  const [drinking, setDrinking] = useState<DrinkingHabit | null>(
    me?.publicProfile?.drinking ?? null,
  );
  const [smoking, setSmoking] = useState<SmokingHabit | null>(me?.publicProfile?.smoking ?? null);
  const [fieldHandicapText, setFieldHandicapText] = useState(
    golfProfile?.fieldHandicap != null ? String(golfProfile.fieldHandicap) : '',
  );
  const [showAge, setShowAge] = useState(privacy?.showAge ?? true);
  const [showHeight, setShowHeight] = useState(privacy?.showHeight ?? true);
  const [showDrinking, setShowDrinking] = useState(privacy?.showDrinking ?? true);
  const [showSmoking, setShowSmoking] = useState(privacy?.showSmoking ?? true);
  const [showHandicap, setShowHandicap] = useState(privacy?.showHandicap ?? true);
  const [screenHandicapText, setScreenHandicapText] = useState(
    golfProfile?.screenHandicap != null ? String(golfProfile.screenHandicap) : '',
  );
  const [skillLevel] = useState<SportSkillLevel>(
    golfProfile?.skillLevel ?? SportSkillLevel.BEGINNER,
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [photoLoading, setPhotoLoading] = useState(false);

  const gallery = me?.publicProfile?.profilePhotos ?? [];
  const avatarUrl = me?.publicProfile?.avatarUrl ?? null;
  const nicknameLabel = me?.publicProfile?.nickname ?? '쪼인존';

  async function onSave() {
    const parsed = profileEditSchema.safeParse({
      nickname,
      regionLabel,
      bio,
      personality: personality.trim() || null,
      age: parseOptionalInt(ageText),
      heightCm: parseOptionalInt(heightText),
      drinking,
      smoking,
      skillLevel,
      screenHandicap: parseScreenHandicapInput(screenHandicapText),
      fieldHandicap: parseScreenHandicapInput(fieldHandicapText),
      showAge,
      showHeight,
      showDrinking,
      showSmoking,
      showHandicap,
      sportCode: 'SCREEN_GOLF',
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? t('common.error'));
      return;
    }
    setLoading(true);
    try {
      await editProfile(parsed.data);
      router.back();
    } catch {
      setError(t('common.error'));
    } finally {
      setLoading(false);
    }
  }

  async function runPhotoAction(action: () => Promise<void>) {
    setPhotoLoading(true);
    setError(null);
    try {
      await action();
    } catch (e) {
      setError(messageForProfilePhotoError(e));
      if (__DEV__) {
        console.warn('[profile-photo-upload]', e);
      }
    } finally {
      setPhotoLoading(false);
    }
  }

  function handleImagePickFailure(
    result: { status: 'cancelled' } | { status: 'permission_denied' } | { status: 'error'; message: string },
  ): null {
    if (result.status === 'cancelled') {
      return null;
    }
    if (result.status === 'permission_denied') {
      Alert.alert(
        '사진 접근 권한',
        '프로필 사진을 선택하려면 사진 라이브러리 접근이 필요합니다.',
        [
          { text: '취소', style: 'cancel' },
          {
            text: '설정 열기',
            onPress: () => void Linking.openSettings(),
          },
        ],
      );
      return null;
    }
    setError(messageForProfilePhotoError(new Error(result.message)));
    return null;
  }

  async function pickProfileImageForUpload() {
    const picked = await pickProfileImageFromLibrary();
    if (picked.status !== 'ok') {
      return handleImagePickFailure(picked);
    }
    return picked.image;
  }

  async function pickProfileGalleryImagesForUpload() {
    const remaining = MAX_PROFILE_GALLERY_PHOTOS - gallery.length;
    if (remaining <= 0) {
      return null;
    }
    const picked = await pickProfileGalleryImagesFromLibrary(remaining);
    if (picked.status !== 'ok') {
      return handleImagePickFailure(picked);
    }
    return picked.images;
  }

  async function onPickAvatar() {
    const picked = await pickProfileImageForUpload();
    if (!picked) return;
    await runPhotoAction(() => uploadProfilePhoto(toUploadPayload(picked)));
  }

  async function onAddGalleryPhoto() {
    if (gallery.length >= MAX_PROFILE_GALLERY_PHOTOS) return;
    const picked = await pickProfileGalleryImagesForUpload();
    if (!picked?.length) return;

    setPhotoLoading(true);
    setError(null);
    try {
      for (const image of picked) {
        await addProfileGalleryPhoto(toUploadPayload(image));
      }
    } catch (e) {
      setError(messageForProfilePhotoError(e));
      if (__DEV__) {
        console.warn('[profile-photo-upload]', e);
      }
    } finally {
      setPhotoLoading(false);
    }
  }

  async function onMoveGalleryPhoto(photoId: string, direction: 'left' | 'right') {
    const ids = gallery.map((photo) => photo.id);
    const index = ids.indexOf(photoId);
    if (index < 0) return;
    const target = direction === 'left' ? index - 1 : index + 1;
    if (target < 0 || target >= ids.length) return;
    const next = ids.slice();
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item);
    await runPhotoAction(() => reorderProfileGalleryPhotos(next));
  }

  return (
    <FormScreenFrame
      edges={[...NESTED_SCREEN_EDGES]}
      footer={
        <StickyActionFrame>
          <Button label={t('common.save')} loading={loading} onPress={() => void onSave()} />
        </StickyActionFrame>
      }
    >
      <Text variant="screenTitle" tone="primary">프로필 수정</Text>
      <Spacer size="md" />
      <Text variant="caption" tone="secondary">
        사진, 나이, 핸디, 음주·흡연, 성격 등을 변경할 수 있습니다.
      </Text>
      <Spacer size="md" />
      <ProfilePhotoEditorSection
        avatarUrl={avatarUrl}
        nickname={nicknameLabel}
        gallery={gallery}
        loading={photoLoading}
        onPickAvatar={() => void onPickAvatar()}
        onDeleteAvatar={() => void runPhotoAction(() => deleteProfilePhoto())}
        onAddGalleryPhoto={() => void onAddGalleryPhoto()}
        onDeleteGalleryPhoto={(photoId) => void runPhotoAction(() => deleteProfileGalleryPhoto(photoId))}
        onMoveGalleryPhoto={(photoId, direction) => void onMoveGalleryPhoto(photoId, direction)}
        onSetPrimaryGalleryPhoto={(photoId) =>
          void runPhotoAction(() => setPrimaryProfilePhoto(photoId))
        }
      />
      <Spacer size="lg" />
      <Text variant="caption" tone="secondary">
        Identity 데이터는 수정할 수 없습니다.
      </Text>
      <Spacer size="md" />
      <Input
        label={t('field.nickname')}
        value={nickname}
        onChangeText={setNickname}
        autoCapitalize="none"
        autoCorrect={false}
      />
      <Spacer size="sm" />
      <Input
        label={t('field.region')}
        value={regionLabel}
        onChangeText={setRegionLabel}
      />
      <Spacer size="sm" />
      <Input
        label={t('field.bio')}
        value={bio}
        onChangeText={setBio}
        multiline
        textAlignVertical="top"
        style={{ minHeight: 96 }}
      />
      <Spacer size="sm" />
      <Input
        label="성격 / 한줄 소개"
        value={personality}
        onChangeText={setPersonality}
        placeholder="예: 차분한 라운드"
      />
      <Spacer size="sm" />
      <Input
        label="나이"
        value={ageText}
        onChangeText={(v) => setAgeText(v.replace(/[^\d]/g, ''))}
        keyboardType="number-pad"
        placeholder="미입력 가능"
      />
      <Spacer size="sm" />
      <Input
        label="키 (cm)"
        value={heightText}
        onChangeText={(v) => setHeightText(v.replace(/[^\d]/g, ''))}
        keyboardType="number-pad"
        placeholder="120~220, 미입력 가능"
      />
      <Spacer size="sm" />
      <Text variant="label" tone="secondary">음주</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
        <Chip label="미설정" selected={drinking == null} onPress={() => setDrinking(null)} />
        {DRINKING_HABITS.map((habit) => (
          <Chip
            key={habit}
            label={formatDrinkingHabitLabel(habit) ?? habit}
            selected={drinking === habit}
            onPress={() => setDrinking(habit as DrinkingHabit)}
          />
        ))}
      </View>
      <Spacer size="sm" />
      <Text variant="label" tone="secondary">흡연</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
        <Chip label="미설정" selected={smoking == null} onPress={() => setSmoking(null)} />
        {SMOKING_HABITS.map((habit) => (
          <Chip
            key={habit}
            label={formatSmokingHabitLabel(habit) ?? habit}
            selected={smoking === habit}
            onPress={() => setSmoking(habit as SmokingHabit)}
          />
        ))}
      </View>
      <Spacer size="sm" />
      <Input
        label="필드 핸디"
        value={fieldHandicapText}
        onChangeText={(v) => setFieldHandicapText(v.replace(/[^\d-]/g, ''))}
        keyboardType="numbers-and-punctuation"
        placeholder={`${FIELD_HANDICAP_MIN}~${FIELD_HANDICAP_MAX}, 미입력 가능`}
        autoCorrect={false}
      />
      <Spacer size="sm" />
      <Input
        label="스크린 핸디"
        value={screenHandicapText}
        onChangeText={(v) => setScreenHandicapText(v.replace(/[^\d-]/g, ''))}
        keyboardType="numbers-and-punctuation"
        placeholder={`${SCREEN_HANDICAP_MIN}~${SCREEN_HANDICAP_MAX}, 미입력 가능`}
        autoCorrect={false}
      />
      <Spacer size="md" />
      <Text variant="sectionTitle" tone="primary">공개 범위</Text>
      <Spacer size="sm" />
      {[
        { label: '나이 공개', value: showAge, set: setShowAge },
        { label: '키 공개', value: showHeight, set: setShowHeight },
        { label: '음주 공개', value: showDrinking, set: setShowDrinking },
        { label: '흡연 공개', value: showSmoking, set: setShowSmoking },
        { label: '핸디 공개', value: showHandicap, set: setShowHandicap },
      ].map((row) => (
        <View
          key={row.label}
          style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 }}
        >
          <Text variant="body">{row.label}</Text>
          <Switch value={row.value} onValueChange={row.set} />
        </View>
      ))}
      {error ? (
        <>
          <Spacer size="sm" />
          <Text variant="body" tone="error">
            {error}
          </Text>
        </>
      ) : null}
    </FormScreenFrame>
  );
}
