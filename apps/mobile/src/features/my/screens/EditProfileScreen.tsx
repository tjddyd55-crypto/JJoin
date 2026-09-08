import { useState } from 'react';
import { useRouter } from 'expo-router';
import {
  Button,
  FormScreenFrame,
  Input,
  Spacer,
  StickyActionFrame,
  Text,
} from '@jjoin/design-system';
import { MAX_PROFILE_GALLERY_PHOTOS, SCREEN_HANDICAP_MAX, SCREEN_HANDICAP_MIN } from '@jjoin/domain';
import { t } from '@jjoin/i18n';
import { profileEditSchema } from '@jjoin/validation';
import { SportSkillLevel } from '@jjoin/types';
import { useSession } from '../../../session/SessionContext';
import { NESTED_SCREEN_EDGES } from '../../../ui/nested-screen';
import { ProfilePhotoEditorSection } from '../../profile/components/ProfilePhotoEditorSection';
import { pickProfileImageFromLibrary, toUploadPayload } from '../../profile/profile-image-picker';

function parseScreenHandicapInput(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const n = Number.parseInt(trimmed, 10);
  if (!Number.isFinite(n) || !Number.isInteger(n)) return null;
  if (n < SCREEN_HANDICAP_MIN || n > SCREEN_HANDICAP_MAX) return null;
  return n;
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
  } = useSession();
  const router = useRouter();
  const golfProfile = me?.publicProfile?.sportProfiles.find((s) => s.sportCode === 'SCREEN_GOLF');
  const [nickname, setNickname] = useState(me?.publicProfile?.nickname ?? '');
  const [regionLabel, setRegionLabel] = useState(me?.publicProfile?.regionLabel ?? '');
  const [bio, setBio] = useState(me?.publicProfile?.bio ?? '');
  const [screenHandicapText, setScreenHandicapText] = useState(
    golfProfile?.screenHandicap != null ? String(golfProfile.screenHandicap) : '',
  );
  const [skillLevel, setSkillLevel] = useState<SportSkillLevel>(
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
      skillLevel,
      screenHandicap: parseScreenHandicapInput(screenHandicapText),
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
    } catch {
      setError(t('common.error'));
    } finally {
      setPhotoLoading(false);
    }
  }

  async function onPickAvatar() {
    const picked = await pickProfileImageFromLibrary();
    if (!picked) return;
    await runPhotoAction(() => uploadProfilePhoto(toUploadPayload(picked)));
  }

  async function onAddGalleryPhoto() {
    if (gallery.length >= MAX_PROFILE_GALLERY_PHOTOS) return;
    const picked = await pickProfileImageFromLibrary();
    if (!picked) return;
    await runPhotoAction(() => addProfileGalleryPhoto(toUploadPayload(picked)));
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
        label="스크린 핸디"
        value={screenHandicapText}
        onChangeText={(v) => setScreenHandicapText(v.replace(/[^\d-]/g, ''))}
        keyboardType="numbers-and-punctuation"
        placeholder={`${SCREEN_HANDICAP_MIN}~${SCREEN_HANDICAP_MAX}, 미입력 가능`}
        autoCorrect={false}
      />
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
