import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  AppText,
  BottomActionBar,
  Button,
  ScreenContainer,
  Stack,
  StatusBadge,
  colors,
  spacing,
} from '@jjoin/design-system';
import { t } from '@jjoin/i18n';
import { SocialLinkStatus } from '@jjoin/types';
import { useSession } from '../../../session/SessionContext';

export function AccountScreen() {
  const { me, logout } = useSession();
  const router = useRouter();

  return (
    <ScreenContainer>
      <Stack gap="md" style={{ flex: 1 }}>
        <AppText variant="title">{t('my.account.title')}</AppText>
        <AppText variant="caption" color="textSecondary">
          {t('my.account.linkingTbd')}
        </AppText>
        {(me?.socialLinks ?? []).map((link) => (
          <View key={link.provider} style={styles.row}>
            <AppText variant="bodyStrong">{link.provider}</AppText>
            <StatusBadge
              label={link.status}
              tone={link.status === SocialLinkStatus.CONNECTED ? 'success' : 'neutral'}
            />
          </View>
        ))}
      </Stack>
      <BottomActionBar>
        <Button
          label={t('my.logout')}
          variant="danger"
          onPress={() => {
            void logout().then(() => router.replace('/auth/login'));
          }}
        />
      </BottomActionBar>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    minHeight: 44,
  },
});
