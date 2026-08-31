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
import { t } from '@jjoin/i18n';
import { profileEditSchema } from '@jjoin/validation';
import { SportSkillLevel } from '@jjoin/types';
import { useSession } from '../../../session/SessionContext';
import { NESTED_SCREEN_EDGES } from '../../../ui/nested-screen';

export function EditProfileScreen() {
  const { me, editProfile } = useSession();
  const router = useRouter();
  const [nickname, setNickname] = useState(me?.publicProfile?.nickname ?? '');
  const [regionLabel, setRegionLabel] = useState(me?.publicProfile?.regionLabel ?? '');
  const [bio, setBio] = useState(me?.publicProfile?.bio ?? '');
  const [skillLevel, setSkillLevel] = useState<SportSkillLevel>(
    me?.publicProfile?.sportProfiles[0]?.skillLevel ?? SportSkillLevel.BEGINNER,
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSave() {
    const parsed = profileEditSchema.safeParse({
      nickname,
      regionLabel,
      bio,
      skillLevel,
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

  return (
    <FormScreenFrame
      edges={[...NESTED_SCREEN_EDGES]}
      footer={
        <StickyActionFrame>
          <Button label={t('common.save')} loading={loading} onPress={() => void onSave()} />
        </StickyActionFrame>
      }
    >
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
        label={t('field.skill')}
        value={skillLevel}
        onChangeText={(v) => setSkillLevel(v as SportSkillLevel)}
        autoCapitalize="characters"
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
