import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  AppText,
  Button,
  CoinBadge,
  StatusBadge,
  Stack,
  colors,
  spacing,
} from '@jjoin/design-system';
import { t } from '@jjoin/i18n';
import { SCREEN_GOLF_CODE } from '@jjoin/types';
import { useSession } from '../../src/session/SessionContext';

export default function HomeScreen() {
  const { me } = useSession();
  const router = useRouter();
  const nickname = me?.publicProfile?.nickname;

  return (
    <View style={styles.root}>
      <Stack gap="md">
        <AppText variant="title">{t('app.name')}</AppText>
        <AppText variant="body" color="textSecondary">
          {nickname ? `안녕하세요, ${nickname}님` : t('auth.login.title')}
        </AppText>
        <StatusBadge label={SCREEN_GOLF_CODE} tone="success" />
        <CoinBadge
          amount={me?.walletSummary.availableCoin ?? '—'}
          label={t('wallet.available')}
        />
        {me?.publicProfile ? (
          <Button
            label={t('profile.public.title')}
            variant="secondary"
            onPress={() => router.push(`/user/${me.userId}`)}
          />
        ) : null}
      </Stack>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
    justifyContent: 'center',
  },
});
