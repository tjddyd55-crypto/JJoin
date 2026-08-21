import { useState } from 'react';
import { StyleSheet, View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import {
  AppText,
  BottomActionBar,
  Button,
  ScreenContainer,
  Stack,
  colors,
  spacing,
} from '@jjoin/design-system';
import { t } from '@jjoin/i18n';
import { MockAuthScenario, SocialProvider } from '@jjoin/types';
import { useSession } from '../../../session/SessionContext';

function routeForNextStep(nextStep: string) {
  switch (nextStep) {
    case 'TERMS':
      return '/auth/terms';
    case 'IDENTITY':
      return '/auth/identity';
    case 'PROFILE_SETUP':
      return '/auth/profile-setup';
    case 'PROFILE_PHOTO':
      return '/auth/profile-photo';
    default:
      return '/(tabs)';
  }
}

export function LoginScreen() {
  const { signInWithSocialProvider, mockScenario, setMockScenario, error } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState<SocialProvider | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  async function handleProvider(provider: SocialProvider) {
    setLoading(provider);
    setLocalError(null);
    try {
      const nextStep = await signInWithSocialProvider(provider);
      router.replace(routeForNextStep(nextStep));
    } catch (e) {
      if (__DEV__) {
        const msg = e instanceof Error ? e.message : String(e);
        // Dev-only diagnostic — no secrets / full server dumps
        console.warn('[auth.login]', {
          provider,
          path: '/auth/social/mock-sign-in',
          error: msg.slice(0, 200),
          apiBase: process.env.EXPO_PUBLIC_API_URL ? 'env_set' : 'default_localhost',
        });
      }
      setLocalError(t('auth.login.fail'));
    } finally {
      setLoading(null);
    }
  }

  return (
    <ScreenContainer>
      <Stack gap="lg" style={styles.body}>
        <AppText variant="title">{t('app.name')}</AppText>
        <AppText variant="body" color="textSecondary">
          {t('auth.login.title')}
        </AppText>
        <AppText variant="caption" color="textSecondary">
          {t('auth.login.subtitle')}
        </AppText>

        {__DEV__ ? (
          <View style={styles.devRow}>
            <AppText variant="caption" color="textSecondary">
              DEV scenario (not shown in production)
            </AppText>
            <View style={styles.devBtns}>
              <Pressable
                accessibilityRole="button"
                onPress={() => setMockScenario(MockAuthScenario.NEW_USER)}
                style={[
                  styles.devChip,
                  mockScenario === MockAuthScenario.NEW_USER && styles.devChipOn,
                ]}
              >
                <AppText variant="caption">NEW</AppText>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => setMockScenario(MockAuthScenario.RETURNING_USER)}
                style={[
                  styles.devChip,
                  mockScenario === MockAuthScenario.RETURNING_USER && styles.devChipOn,
                ]}
              >
                <AppText variant="caption">RETURNING</AppText>
              </Pressable>
            </View>
          </View>
        ) : null}

        {(localError || error) && (
          <AppText variant="body" color="danger">
            {localError ?? error}
          </AppText>
        )}
      </Stack>

      <BottomActionBar>
        <Button
          label={t('auth.login.kakao')}
          loading={loading === SocialProvider.KAKAO}
          onPress={() => void handleProvider(SocialProvider.KAKAO)}
        />
        <Button
          label={t('auth.login.naver')}
          variant="secondary"
          loading={loading === SocialProvider.NAVER}
          onPress={() => void handleProvider(SocialProvider.NAVER)}
        />
        <Button
          label={t('auth.login.google')}
          variant="secondary"
          loading={loading === SocialProvider.GOOGLE}
          onPress={() => void handleProvider(SocialProvider.GOOGLE)}
        />
      </BottomActionBar>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, justifyContent: 'center' },
  devRow: { gap: spacing.xs },
  devBtns: { flexDirection: 'row', gap: spacing.xs },
  devChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  devChipOn: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
});
