import { useState } from 'react';
import { StyleSheet, View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import {
  Text,
  ScreenFrame,
  StickyActionFrame,
  Spacer,
  useTheme,
} from '@jjoin/design-system';
import { t } from '@jjoin/i18n';
import { MockAuthPersona, MockAuthScenario, SocialProvider } from '@jjoin/types';
import { useSession } from '../../../session/SessionContext';
import { SocialLoginCancelledError } from '../social/social-auth-errors';
import { useMockSocialAuthFlow } from '../social/social-auth-config';
import { SocialLoginButton } from '../../../ui/patterns/SocialLoginButton';

function routeForNextStep(nextStep: string) {
  switch (nextStep) {
    case 'TERMS':
      return '/auth/terms';
    case 'IDENTITY':
      // Identity is deferred — browse Home; gate opens on protected actions.
      return '/(tabs)';
    case 'PROFILE_SETUP':
      return '/auth/profile-setup';
    case 'PROFILE_PHOTO':
      return '/auth/profile-photo';
    case 'LOCATION':
      return '/auth/location';
    default:
      return '/(tabs)';
  }
}

export function LoginScreen() {
  const {
    signInWithSocialProvider,
    mockScenario,
    setMockScenario,
    mockPersona,
    setMockPersona,
    error,
  } = useSession();
  const router = useRouter();
  const theme = useTheme();
  const [loading, setLoading] = useState<SocialProvider | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const mockSocialAuthEnabled = __DEV__ && useMockSocialAuthFlow();

  async function handleProvider(provider: SocialProvider) {
    setLoading(provider);
    setLocalError(null);
    try {
      const nextStep = await signInWithSocialProvider(provider);
      router.replace(routeForNextStep(nextStep));
    } catch (e) {
      if (e instanceof SocialLoginCancelledError) {
        return;
      }
      if (__DEV__) {
        const msg = e instanceof Error ? e.message : String(e);
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
    <ScreenFrame>
      <View style={styles.body}>
        <View style={styles.hero}>
          <View
            style={[
              styles.arc,
              { borderColor: theme.colors.action.primary },
            ]}
            pointerEvents="none"
          />
          <Text variant="display" style={{ color: theme.colors.action.primary }}>
            {t('app.name')}
          </Text>
          <Spacer size="sm" />
          <Text variant="sectionTitle" tone="primary">
            {t('auth.login.title')}
          </Text>
          <Spacer size="xs" />
          <Text variant="body" tone="secondary">
            {t('auth.login.subtitle')}
          </Text>
        </View>

        {__DEV__ ? (
          <View style={styles.devBlock}>
            <Text variant="caption" tone="tertiary">
              DEV USER (mock only)
            </Text>
            <View style={styles.devBtns}>
              <DevChip
                label="A 김진우"
                active={mockPersona === MockAuthPersona.DEV_A}
                onPress={() => {
                  setMockPersona(MockAuthPersona.DEV_A);
                  setMockScenario(MockAuthScenario.RETURNING_USER);
                }}
              />
              <DevChip
                label="B 박민수"
                active={mockPersona === MockAuthPersona.DEV_B}
                onPress={() => {
                  setMockPersona(MockAuthPersona.DEV_B);
                  setMockScenario(MockAuthScenario.RETURNING_USER);
                }}
              />
              <DevChip
                label="시나리오"
                active={mockPersona == null}
                onPress={() => setMockPersona(null)}
              />
            </View>

            {mockPersona == null && mockSocialAuthEnabled ? (
              <View style={styles.devBtns}>
                <DevChip
                  label="NEW"
                  active={mockScenario === MockAuthScenario.NEW_USER}
                  onPress={() => setMockScenario(MockAuthScenario.NEW_USER)}
                />
                <DevChip
                  label="RETURNING"
                  active={mockScenario === MockAuthScenario.RETURNING_USER}
                  onPress={() => setMockScenario(MockAuthScenario.RETURNING_USER)}
                />
              </View>
            ) : mockPersona == null ? (
              <Text variant="caption" tone="tertiary">
                소셜 버튼 = 실제 OAuth
              </Text>
            ) : (
              <Text variant="caption" tone="tertiary">
                {mockPersona === MockAuthPersona.DEV_A
                  ? '안정 DB 유저 A (Host 테스트용)'
                  : '안정 DB 유저 B (Participant 테스트용)'}
              </Text>
            )}
          </View>
        ) : null}

        {(localError || error) && (
          <Text variant="body" tone="error">
            {localError ?? error}
          </Text>
        )}
      </View>

      <StickyActionFrame>
        <SocialLoginButton
          provider={SocialProvider.KAKAO}
          label={t('auth.login.kakao')}
          loading={loading === SocialProvider.KAKAO}
          onPress={() => void handleProvider(SocialProvider.KAKAO)}
        />
        <SocialLoginButton
          provider={SocialProvider.NAVER}
          label={t('auth.login.naver')}
          loading={loading === SocialProvider.NAVER}
          onPress={() => void handleProvider(SocialProvider.NAVER)}
        />
        <SocialLoginButton
          provider={SocialProvider.GOOGLE}
          label={t('auth.login.google')}
          loading={loading === SocialProvider.GOOGLE}
          onPress={() => void handleProvider(SocialProvider.GOOGLE)}
        />
        <Text variant="caption" tone="tertiary" style={styles.legal}>
          계속하면 서비스 이용약관 및 개인정보 처리방침에 동의하게 됩니다.
        </Text>
      </StickyActionFrame>
    </ScreenFrame>
  );
}

function DevChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[
        styles.devChip,
        {
          borderColor: active ? theme.colors.action.primary : theme.colors.border.subtle,
          backgroundColor: active ? theme.colors.surface.floating : theme.colors.surface.card,
          borderRadius: theme.radius.sm,
        },
      ]}
    >
      <Text variant="caption" tone={active ? 'primary' : 'secondary'}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, justifyContent: 'center' },
  hero: { alignItems: 'flex-start', paddingTop: 24 },
  arc: {
    position: 'absolute',
    right: -40,
    top: -20,
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 1.5,
    opacity: 0.35,
  },
  devBlock: { gap: 8, marginTop: 24 },
  devBtns: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  devChip: {
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  legal: { textAlign: 'center', marginTop: 4 },
});
