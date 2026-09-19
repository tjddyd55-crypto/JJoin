import { useCallback, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import {
  ScrollScreenFrame,
  SectionHeader,
  Spacer,
  spacing,
} from '@jjoin/design-system';
import { useSession } from '../../../session/SessionContext';
import { getApiClient } from '../../../lib/api';
import { trackRecommendationClick } from '../../../lib/product-analytics';
import { getSecureSessionStore } from '../../../session/SessionContext';
import { HomeCompactHeader } from '../components/HomeCompactHeader';
import { HomeBannerCarousel } from '../components/HomeBannerCarousel';
import { HomeQuickMenu } from '../components/HomeQuickMenu';
import { HomeTrackCtaRow } from '../components/HomeTrackCtaRow';
import { HomeTodaysJoinSection } from '../components/HomeTodaysJoinSection';
import { HomeProfileDiscoverySection } from '../components/HomeProfileDiscoverySection';
import { HomeClubSection } from '../components/HomeClubSection';
import { useHomeData } from '../hooks/useHomeData';
import { useNotificationUnreadCount } from '../../notifications/useNotificationUnreadCount';
import { isClubsUiEnabled } from '../../clubs/clubs-ui-gate';

function joinDetailHref(joinId: string): Href {
  return { pathname: '/join/[joinId]', params: { joinId } } as Href;
}

export function HomeScreen() {
  const { me } = useSession();
  const router = useRouter();
  const api = useMemo(() => getApiClient(getSecureSessionStore()), []);
  const regionLabel = me?.publicProfile?.regionLabel ?? '내 주변';
  const userId = me?.userId;

  const { unreadCount } = useNotificationUnreadCount();

  const clubsUiEnabled = isClubsUiEnabled(me?.featureFlags);
  const {
    todayJoins,
    recommended,
    clubs,
    featuredClub,
    banners,
    discoveryProfiles,
    initialLoading,
    isRefreshing,
    recommendError,
    hasLoadedOnce,
    loadingClub,
    reload,
  } = useHomeData(userId, clubsUiEnabled);

  const openJoin = useCallback(
    (joinId: string, trackRec = false) => {
      if (trackRec) {
        trackRecommendationClick(api, joinId, joinId);
      }
      router.push(joinDetailHref(joinId));
    },
    [api, router],
  );

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

      <Spacer size="sm" />

      <HomeTrackCtaRow />

      <Spacer size="sm" />

      <HomeQuickMenu clubsUiEnabled={clubsUiEnabled} />

      <View style={styles.section}>
        <SectionHeader
          title="오늘의 추천 조인"
          titleVariant="joinSectionTitle"
          actionLabel="더보기"
          onActionPress={() => router.push('/(tabs)/joins')}
        />
        <HomeTodaysJoinSection
          recommended={recommended}
          todayFallback={todayJoins}
          initialLoading={initialLoading}
          isRefreshing={isRefreshing}
          error={recommendError}
          hasLoadedOnce={hasLoadedOnce}
          onPressJoin={openJoin}
          onRetry={reload}
          onBrowseAll={() => router.push('/(tabs)/joins')}
        />
      </View>

      {discoveryProfiles.length > 0 ? (
        <View style={styles.section}>
          <SectionHeader
            title="함께 라운드할 사람"
            titleVariant="joinSectionTitle"
            actionLabel="더보기"
            onActionPress={() => router.push('/my/golf-friends' as Href)}
          />
          <HomeProfileDiscoverySection
            profiles={discoveryProfiles}
            onPressProfile={(userId) =>
              router.push({ pathname: '/user/[userId]', params: { userId } } as Href)
            }
          />
        </View>
      ) : null}

      {clubsUiEnabled ? (
        <View style={styles.section}>
          <SectionHeader
            title="내 동호회"
            actionLabel={clubs.length > 0 ? '전체' : undefined}
            onActionPress={clubs.length > 0 ? () => router.push('/my/clubs' as Href) : undefined}
          />
          <HomeClubSection clubs={clubs} featuredClub={featuredClub} loading={loadingClub} />
        </View>
      ) : null}

      <Spacer size="md" />
    </ScrollScreenFrame>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: spacing.lg,
  },
  section: {
    gap: spacing.xs,
    marginTop: spacing.sm,
    minHeight: 148,
  },
});
