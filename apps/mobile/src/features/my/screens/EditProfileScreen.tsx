import { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import {
  AppText,
  BottomActionBar,
  Button,
  FormField,
  ScreenContainer,
  Stack,
  spacing,
} from '@jjoin/design-system';
import { t } from '@jjoin/i18n';
import { profileEditSchema } from '@jjoin/validation';
import { SportSkillLevel } from '@jjoin/types';
import { useSession } from '../../../session/SessionContext';

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
    <ScreenContainer padded={false}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Stack gap="md">
          <AppText variant="title">{t('my.edit')}</AppText>
          <AppText variant="caption" color="textSecondary">
            Identity 데이터는 수정할 수 없습니다.
          </AppText>
          <FormField label={t('field.nickname')} value={nickname} onChangeText={setNickname} />
          <FormField label={t('field.region')} value={regionLabel} onChangeText={setRegionLabel} />
          <FormField label={t('field.bio')} value={bio} onChangeText={setBio} multiline />
          <FormField
            label={t('field.skill')}
            value={skillLevel}
            onChangeText={(v) => setSkillLevel(v as SportSkillLevel)}
          />
          {error ? (
            <AppText color="danger" variant="body">
              {error}
            </AppText>
          ) : null}
        </Stack>
      </ScrollView>
      <BottomActionBar>
        <Button label={t('common.save')} loading={loading} onPress={() => void onSave()} />
      </BottomActionBar>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.lg },
});
