import { useCallback, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import {
  BrandMark,
  IconButton,
  ScrollScreenFrame,
  Spacer,
  Text,
  spacing,
} from '@jjoin/design-system';
import { useSession, getSecureSessionStore } from '../../../session/SessionContext';
import { getApiClient } from '../../../lib/api';
import { trackRecommendationClick } from '../../../lib/product-analytics';
import { HomeQuickMenu } from '../components/HomeQuickMenu';
import { HomeSectionHeader } from '../components/HomeSectionHeader';
import {
  HomeRecommendedList,
  HomeTodayJoinRow,
  HomeUrgentJoinCard,
} from '../components/HomeJoinSections';
import { HomeClubSection } from '../components/HomeClubSection';
import { useHomeData } from '../hooks/useHomeData';
import { isInternalToolsEnabled } from '../../../lib/internal-tools';

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
    urgentJoins,
    recommended,
    clubs,
    featuredClub,
    loadingToday,
    loadingRecommended,
    loadingClub,
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
    <ScrollScreenFrame contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <BrandMark
            variant="compact"
            showDevBadge={isInternalToolsEnabled()}
          />
          <Text variant="caption" tone="tertiary">
            {regionLabel}
          </Text>
        </View>
        <IconButton
          icon="notification"
          accessibilityLabel="알림"
          variant="surface"
          size="sm"
          onPress={() => router.push('/my/notifications')}
        />
      </View>

      <HomeQuickMenu />

      <View style={[styles.sectionBlock, styles.firstSection]}>
        <HomeSectionHeader
          title="오늘 참여 가능한 조인"
          actionLabel="전체"
          onActionPress={() => router.push('/(tabs)/joins')}
        />
        {loadingToday ? (
          <Text variant="caption" tone="tertiary">
            불러오는 중…
          </Text>
        ) : (
          <HomeTodayJoinRow items={todayJoins} onPress={(id) => openJoin(id)} />
        )}
      </View>

      {urgentJoins.length > 0 ? (
        <View style={styles.sectionBlock}>
          <HomeSectionHeader title="긴급 모집" />
          <HomeUrgentJoinCard items={urgentJoins} onPress={(id) => openJoin(id)} />
        </View>
      ) : null}

      {(loadingRecommended || recommended.length > 0) && (
        <View style={styles.sectionBlock}>
          <HomeSectionHeader
            title="추천 조인"
            actionLabel="더보기"
            onActionPress={() => router.push('/(tabs)/joins')}
          />
          {loadingRecommended ? (
            <Text variant="caption" tone="tertiary">
              불러오는 중…
            </Text>
          ) : (
            <HomeRecommendedList
              items={recommended}
              onPress={(id) => openJoin(id, true)}
            />
          )}
        </View>
      )}

      <View style={styles.sectionBlock}>
        <HomeSectionHeader
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  headerText: {
    flex: 1,
    gap: 2,
    paddingRight: spacing.sm,
  },
  sectionBlock: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  firstSection: {
    marginTop: spacing.sm,
  },
});
