import { StyleSheet, View } from 'react-native';
import {
  Badge,
  Button,
  Card,
  Row,
  ScreenFrame,
  Spacer,
  StickyActionFrame,
  Text,
  useTheme,
} from '@jjoin/design-system';
import { t } from '@jjoin/i18n';
import { useRouter } from 'expo-router';
import { SocialLinkStatus, SocialProvider } from '@jjoin/types';
import { useSession } from '../../../session/SessionContext';
import { NESTED_SCREEN_EDGES } from '../../../ui/nested-screen';

const PROVIDER_LABELS: Record<SocialProvider, string> = {
  KAKAO: 'Kakao',
  NAVER: 'Naver',
  GOOGLE: 'Google',
};

export function AccountScreen() {
  const { me, logout } = useSession();
  const router = useRouter();
  const theme = useTheme();

  return (
    <ScreenFrame edges={[...NESTED_SCREEN_EDGES]}>
      <View style={styles.body}>
        <Text variant="body" tone="secondary">
          {t('auth.account.subtitle')}
        </Text>

        <Card variant="base" padding="md" style={styles.card}>
          {(me?.socialLinks ?? []).map((link, index, array) => (
            <View
              key={link.provider}
              style={[
                styles.row,
                {
                  borderBottomWidth: index < array.length - 1 ? StyleSheet.hairlineWidth : 0,
                  borderBottomColor: theme.colors.border.subtle,
                },
              ]}
            >
              <Row justify="space-between" align="center" style={styles.rowInner}>
                <View style={styles.providerBlock}>
                  <Text variant="bodyStrong" tone="primary">
                    {PROVIDER_LABELS[link.provider]}
                  </Text>
                  <Text variant="caption" tone="tertiary">
                    {link.provider}
                  </Text>
                </View>
                <Badge
                  label={
                    link.status === SocialLinkStatus.CONNECTED
                      ? t('auth.account.connected')
                      : t('auth.account.notConnected')
                  }
                  variant={link.status === SocialLinkStatus.CONNECTED ? 'success' : 'neutral'}
                />
              </Row>
            </View>
          ))}
        </Card>
      </View>
      <StickyActionFrame>
        <Button
          label={t('my.logout')}
          variant="danger"
          onPress={() => {
            void logout().then(() => router.replace('/auth/login'));
          }}
        />
      </StickyActionFrame>
    </ScreenFrame>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    gap: 12,
  },
  card: {
    marginTop: 12,
    paddingVertical: 0,
  },
  row: {
    minHeight: 56,
    justifyContent: 'center',
  },
  rowInner: {
    flex: 1,
  },
  providerBlock: {
    gap: 2,
  },
});
