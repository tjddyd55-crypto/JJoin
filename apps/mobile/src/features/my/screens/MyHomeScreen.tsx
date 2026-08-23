import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  AppText,
  CoinBadge,
  ScreenContainer,
  Stack,
  StatusBadge,
  UserAvatar,
  colors,
  spacing,
} from '@jjoin/design-system';
import { t } from '@jjoin/i18n';
import { useSession } from '../../../session/SessionContext';

export function MyHomeScreen() {
  const { me, logout } = useSession();
  const router = useRouter();
  const profile = me?.publicProfile;

  if (!profile) {
    return (
      <ScreenContainer>
        <AppText>{t('common.empty')}</AppText>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer padded={false}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Stack gap="md">
          <AppText variant="title">{t('my.home.title')}</AppText>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push(`/user/${profile.id}`)}
            style={styles.header}
          >
            <UserAvatar uri={profile.avatarUrl} name={profile.nickname} size="lg" />
            <View style={{ flex: 1, gap: spacing.xxs }}>
              <AppText variant="subtitle">{profile.nickname}</AppText>
              {profile.verifiedBadge ? (
                <StatusBadge label={t('profile.verified')} tone="success" />
              ) : (
                <StatusBadge label="UNVERIFIED" tone="warning" />
              )}
            </View>
          </Pressable>

          <View style={styles.walletCard}>
            <CoinBadge amount={me?.walletSummary.availableCoin ?? '0'} label={t('wallet.available')} />
            <CoinBadge amount={me?.walletSummary.heldCoin ?? '0'} label={t('wallet.hold')} />
            <Pressable accessibilityRole="button" onPress={() => router.push('/my/wallet')}>
              <AppText variant="bodyStrong" color="primary">
                {t('my.wallet')}
              </AppText>
            </Pressable>
          </View>

          <MenuItem label={t('my.edit')} onPress={() => router.push('/my/edit-profile')} />
          <MenuItem label={t('my.hosted')} onPress={() => router.push('/(tabs)/my-joins')} />
          <MenuItem label={t('my.joined')} onPress={() => router.push('/(tabs)/my-joins')} />
          <MenuItem label={t('my.account')} onPress={() => router.push('/my/account')} />
          <MenuItem label={t('my.notifications')} onPress={() => router.push('/my/notifications')} />
          <MenuItem label={t('my.terms')} onPress={() => undefined} />
          <MenuItem label={t('my.privacy')} onPress={() => undefined} />
          <MenuItem
            label={t('my.logout')}
            onPress={() => {
              void logout().then(() => router.replace('/auth/login'));
            }}
          />
          <MenuItem label={t('my.withdraw')} onPress={() => undefined} />
        </Stack>
      </ScrollView>
    </ScreenContainer>
  );
}

function MenuItem({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.menu}>
      <AppText variant="body">{label}</AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxl },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  walletCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  menu: {
    minHeight: 44,
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: spacing.sm,
  },
});
