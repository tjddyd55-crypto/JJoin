import { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import {
  ScrollScreenFrame,
  SectionHeader,
  Spacer,
  spacing,
} from '@jjoin/design-system';
import { useSession } from '../../../session/SessionContext';
import { HomeCompactHeader } from '../components/HomeCompactHeader';
import { HomeBannerCarousel } from '../components/HomeBannerCarousel';
import { HomeQuickMenu } from '../components/HomeQuickMenu';
import { HomeVenueJoinSection } from '../components/HomeVenueJoinSection';
import { HomeProfileDiscoverySection } from '../components/HomeProfileDiscoverySection';
import { HomeClubSection } from '../components/HomeClubSection';
import { useHomeData } from '../hooks/useHomeData';
import { useNotificationUnreadCount } from '../../notifications/useNotificationUnreadCount';
import { isClubsUiEnabled } from '../../clubs/clubs-ui-gate';

function joinDetailHref(joinId: string): Href {
  return { pathname: '/join/[joinId]', params: { joinId } } as Href;
}

function joinsListHref(venueType: 'FIELD' | 'SCREEN'): Href {
  return { pathname: '/(tabs)/joins', params: { venueType } } as Href;
}

export function HomeScreen() {
  const { me } = useSession();
  const router = useRouter();
  const regionLabel = me?.publicProfile?.regionLabel ?? '내 주변';
  const userId = me?.userId;

  const { unreadCount } = useNotificationUnreadCount();

  const clubsUiEnabled = isClubsUiEnabled(me?.featureFlags);
  const {
    fieldJoins,
    screenJoins,
    clubs,
    featuredClub,
    banners,
    discoveryFriends,
    initialLoading,
    hasLoadedOnce,
    loadingClub,
  } = useHomeData(userId, clubsUiEnabled);

  const openJoin = useCallback(
    (joinId: string) => {
      router.push(joinDetailHref(joinId));
    },
    [router],
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

      <View style={styles.section}>
        <SectionHeader
          title="필드 조인"
          titleVariant="joinSectionTitle"
          actionLabel="전체보기"
          onActionPress={() => router.push(joinsListHref('FIELD'))}
        />
        <HomeVenueJoinSection
          joins={fieldJoins}
          emptyMessage="현재 모집 중인 필드 조인이 없습니다"
          initialLoading={initialLoading}
          hasLoadedOnce={hasLoadedOnce}
          onPressJoin={openJoin}
        />
      </View>

      <View style={styles.section}>
        <SectionHeader
          title="스크린 조인"
          titleVariant="joinSectionTitle"
          actionLabel="전체보기"
          onActionPress={() => router.push(joinsListHref('SCREEN'))}
        />
        <HomeVenueJoinSection
          joins={screenJoins}
          emptyMessage="현재 모집 중인 스크린 조인이 없습니다"
          initialLoading={initialLoading}
          hasLoadedOnce={hasLoadedOnce}
          onPressJoin={openJoin}
        />
      </View>

      <View style={styles.section}>
        <SectionHeader
          title="함께할 사람"
          titleVariant="joinSectionTitle"
          actionLabel="전체보기"
          onActionPress={() => router.push('/my/golf-friends' as Href)}
        />
        <HomeProfileDiscoverySection
          items={discoveryFriends}
          initialLoading={initialLoading}
          hasLoadedOnce={hasLoadedOnce}
          viewerUserId={userId}
          coinGiftEnabled={me?.featureFlags?.coinGiftEnabled !== false}
          messagingEnabled={me?.messagePolicy?.enabled !== false}
          onPressProfile={(profileUserId) =>
            router.push({ pathname: '/user/[userId]', params: { userId: profileUserId } } as Href)
          }
        />
      </View>

      <Spacer size="sm" />

      <HomeQuickMenu clubsUiEnabled={clubsUiEnabled} />

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
