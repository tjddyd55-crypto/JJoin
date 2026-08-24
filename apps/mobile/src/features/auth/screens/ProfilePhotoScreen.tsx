import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  Button,
  Card,
  FormScreenFrame,
  StickyActionFrame,
  Text,
  UserAvatar,
  useTheme,
} from '@jjoin/design-system';
import { t } from '@jjoin/i18n';
import { useRouter } from 'expo-router';
import { useSession } from '../../../session/SessionContext';
import { OnboardingHeader } from '../../../ui/patterns';

export function ProfilePhotoScreen() {
  const { setAvatar, me } = useSession();
  const router = useRouter();
  const theme = useTheme();
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
    <FormScreenFrame
      footer={
        <StickyActionFrame>
          <Button
            label={t('auth.profilePhoto.save')}
            loading={loading}
            disabled={!uri}
            onPress={() => void save(false)}
          />
          <Button
            label={t('auth.profilePhoto.skip')}
            variant="secondary"
            loading={loading}
            onPress={() => void save(true)}
          />
        </StickyActionFrame>
      }
    >
      <OnboardingHeader
        step={3}
        title={t('auth.profilePhoto.title')}
        description={t('auth.profilePhoto.subtitle')}
      />

      <Card variant="elevated" padding="md" style={styles.previewCard}>
        <View
          style={[
            styles.avatarShell,
            {
              borderColor: theme.colors.border.subtle,
              backgroundColor: theme.colors.surface.base,
              borderRadius: theme.radius.full,
            },
          ]}
        >
          <UserAvatar uri={uri} name={me?.publicProfile?.nickname ?? 'J'} size="lg" />
        </View>
        <Text variant="bodyStrong" tone="primary">
          {me?.publicProfile?.nickname ?? 'JJOIN'}
        </Text>
        <Text variant="caption" tone="secondary" style={styles.centerText}>
          {uri ? '선택한 이미지를 프로필로 저장합니다.' : t('auth.profilePhoto.empty')}
        </Text>
      </Card>

      <View style={styles.actions}>
        <Button
          label={t('auth.profilePhoto.mockPick')}
          variant="secondary"
          onPress={() => setUri(`https://i.pravatar.cc/200?u=${Date.now()}`)}
          accessibilityLabel="Mock 프로필 사진 선택"
        />
        <Text variant="caption" tone="tertiary">
          {t('auth.profilePhoto.hint')}
        </Text>
      </View>

      {error ? (
        <Text variant="body" tone="error">
          {error}
        </Text>
      ) : null}
    </FormScreenFrame>
  );
}

const styles = StyleSheet.create({
  previewCard: {
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
  },
  avatarShell: {
    width: 120,
    height: 120,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerText: {
    textAlign: 'center',
  },
  actions: {
    gap: 8,
    marginBottom: 24,
  },
});
