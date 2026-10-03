import { StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { ScrollScreenFrame, spacing } from '@jjoin/design-system';
import { useSession } from '../../../session/SessionContext';
import { HomeCompactHeader } from '../components/HomeCompactHeader';
import { HomeBannerCarousel } from '../components/HomeBannerCarousel';
import { HomeQuickMenu } from '../components/HomeQuickMenu';
import { useHomeData } from '../hooks/useHomeData';
import { useNotificationUnreadCount } from '../../notifications/useNotificationUnreadCount';

export function HomeScreen() {
  const { me } = useSession();
  const router = useRouter();
  const regionLabel = me?.publicProfile?.regionLabel ?? '내 주변';
  const userId = me?.userId;
  const { unreadCount } = useNotificationUnreadCount();
  const { banners } = useHomeData(userId, false);

  return (
    <ScrollScreenFrame
      contentContainerStyle={styles.content}
      contentPaddingBottom={spacing.xl + 72}
    >
      <HomeCompactHeader
        regionLabel={regionLabel}
        unreadCount={unreadCount}
        onPressNotifications={() => router.push('/my/notifications')}
      />

      <HomeBannerCarousel banners={banners} />

      <HomeQuickMenu />
    </ScrollScreenFrame>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: spacing.lg,
  },
});
