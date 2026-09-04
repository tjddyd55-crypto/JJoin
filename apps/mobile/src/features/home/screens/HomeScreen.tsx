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
import { HomeHeroBanner } from '../components/HomeHeroBanner';
import { HomeQuickMenu } from '../components/HomeQuickMenu';
import { HomeTodaysJoinSection } from '../components/HomeTodaysJoinSection';
import { HomeClubSection } from '../components/HomeClubSection';
import { useHomeData } from '../hooks/useHomeData';

function joinDetailHref(joinId: string): Href {
  return { pathname: '/join/[joinId]', params: { joinId } } as Href;
}

export function HomeScreen() {
  const { me } = useSession();
  const router = useRouter();
  const api = useMemo(() => getApiClient(getSecureSessionStore()), []);
  const regionLabel = me?.publicProfile?.regionLabel ?? '내 주변';
  const userId = me?.userId;

  const {
    todayJoins,
    recommended,
    clubs,
    featuredClub,
    initialLoading,
    isRefreshing,
    recommendError,
    hasLoadedOnce,
    loadingClub,
    reload,
  } = useHomeData(userId);

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
        onPressNotifications={() => router.push('/my/notifications')}
      />

      <HomeHeroBanner />

      <Spacer size="sm" />

      <HomeQuickMenu />

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

      <View style={styles.section}>
        <SectionHeader
          title="내 동호회"
          actionLabel={clubs.length > 0 ? '전체' : undefined}
          onActionPress={clubs.length > 0 ? () => router.push('/my/clubs' as Href) : undefined}
        />
        <HomeClubSection clubs={clubs} featuredClub={featuredClub} loading={loadingClub} />
      </View>

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
