import { useState } from 'react';
import { useRouter } from 'expo-router';
import {
  AppText,
  BottomActionBar,
  Button,
  ScreenContainer,
  Stack,
  UserAvatar,
} from '@jjoin/design-system';
import { t } from '@jjoin/i18n';
import { useSession } from '../../../session/SessionContext';

export function ProfilePhotoScreen() {
  const { setAvatar, me } = useSession();
  const router = useRouter();
  const [uri, setUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(skip = false) {
    setLoading(true);
    setError(null);
    try {
      await setAvatar(skip ? { skip: true } : { localUri: uri });
      router.replace('/auth/location');
    } catch {
      setError(t('common.error'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScreenContainer>
      <Stack gap="md" style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <AppText variant="title">{t('auth.profilePhoto.title')}</AppText>
        <UserAvatar
          uri={uri}
          name={me?.publicProfile?.nickname ?? 'J'}
          size="lg"
        />
        <AppText variant="caption" color="textSecondary">
          {t('auth.profilePhoto.hint')}
        </AppText>
        {error ? (
          <AppText variant="body" color="danger">
            {error}
          </AppText>
        ) : null}
      </Stack>
      <BottomActionBar>
        <Button
          label={t('auth.profilePhoto.mockPick')}
          variant="secondary"
          onPress={() => setUri(`https://i.pravatar.cc/150?u=${Date.now()}`)}
        />
        <Button
          label={t('auth.profilePhoto.save')}
          loading={loading}
          onPress={() => void save(false)}
        />
        <Button
          label={t('auth.profilePhoto.skip')}
          variant="secondary"
          loading={loading}
          onPress={() => void save(true)}
        />
      </BottomActionBar>
    </ScreenContainer>
  );
}
