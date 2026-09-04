import { ScrollView, StyleSheet, View, Pressable } from 'react-native';
import { Redirect, useLocalSearchParams } from 'expo-router';
import {
  JoinCard,
  JoinDiscoveryAppBar,
  JoinListTextTabs,
  Section,
  Stack,
  Text,
  spacing,
  useTheme,
} from '@jjoin/design-system';
import { JoinStatus, JoinMethod } from '@jjoin/types';
import { isInternalToolsEnabled } from '../../src/lib/internal-tools';
import { JoinDetailPrimarySections } from '../../src/features/join/components/JoinDetailPrimarySections';
import {
  JOIN_FIGMA_QA_CARD,
  JOIN_FIGMA_QA_CARD_SECOND,
  JOIN_FIGMA_QA_WEEK_ANCHOR,
  JOIN_FIGMA_QA_SELECTED_DATE,
  JOIN_FIGMA_QA_CARD_COMPACT,
  JOIN_FIGMA_QA_CARD_MANAGEMENT,
  parseJoinFigmaQaScene,
  parseJoinFigmaQaWidth,
} from '../../src/features/join/join-figma-qa-fixtures';
import { WeekStrip } from '../../src/features/explore/discovery/components/WeekStrip';

const DETAIL_FIXTURE = {
  joinId: 'figma-qa',
  status: JoinStatus.OPEN,
  joinMethod: JoinMethod.OPEN,
  sportCode: 'SCREEN_GOLF',
  title: '오늘 저녁 초보 환영',
  description: '처음 오시는 분도 편하게 참여하세요. 즐겁고 매너 있게 라운드해요.',
  startAt: '2026-09-16T10:00:00.000Z',
  scheduledEndAt: '2026-09-16T14:00:00.000Z',
  plannedPlayerCount: 4,
  confirmedPlayerCount: 0,
  availableSlots: 4,
  targetMaleCount: 2,
  targetFemaleCount: 2,
  confirmedMaleCount: 0,
  confirmedFemaleCount: 0,
  minimumPlayers: 2,
  rewardPerParticipant: '0',
  roomCreationFeeAmount: '0',
  rewardHoldTotalAmount: '0',
  coinAccountingPending: false,
  recruitClosesAt: '2026-09-15T14:59:00.000Z',
  isUrgent: false,
  venue: {
    venueId: 'v1',
    provider: 'KAKAO',
    providerPlaceId: 'p1',
    name: '거제 오션스크린',
    address: '경상남도 거제시 고현동 123-4',
    regionLabel: '고현동',
    latitude: 34.88,
    longitude: 128.62,
  },
  host: {
    id: 'h1',
    nickname: '성용골퍼',
    verifiedBadge: true,
    avatarUrl: null,
    genderDisplay: null,
    ageBand: null,
    regionLabel: '거제',
    bio: null,
    sportProfiles: [],
    participationCount: 12,
    completedJoinCount: 18,
    averageRatingDisplay: '4.9',
    reviewCount: 6,
    playedCountWithViewer: null,
  },
  myParticipation: null,
  participants: [],
} as const;

function JoinListPreview() {
  const theme = useTheme();
  const today = JOIN_FIGMA_QA_SELECTED_DATE;
  const weekAnchor = JOIN_FIGMA_QA_WEEK_ANCHOR;
  const chips = ['전체', '시간순', '거리순'];

  return (
    <View style={styles.scene}>
      <JoinDiscoveryAppBar regionLabel="거제" />
      <JoinListTextTabs
        tabs={[{ id: 'LIST', label: '리스트' }, { id: 'REGION', label: '지역별' }]}
        activeId="LIST"
        onChange={() => {}}
      />
      <WeekStrip
        weekAnchorDate={weekAnchor}
        selectedDate={today}
        dayCounts={{ [today]: 2 }}
        onSelectDate={() => {}}
        onPrevWeek={() => {}}
        onNextWeek={() => {}}
      />
      <View style={styles.filterRow}>
        {chips.map((label, index) => (
          <View
            key={label}
            style={[
              styles.filterChip,
              index === 0
                ? { backgroundColor: theme.colors.action.primary, borderColor: theme.colors.action.primary }
                : { backgroundColor: theme.colors.surface.card, borderColor: theme.colors.border.subtle },
            ]}
          >
            <Text variant="joinFilterChip" tone={index === 0 ? 'onPrimary' : 'secondary'}>
              {label}
            </Text>
          </View>
        ))}
        <View style={styles.filterSpacer} />
        <Pressable accessibilityRole="button" accessibilityLabel="지도에서 보기">
          <Text variant="joinFilterChip" style={{ color: theme.colors.join.dday.text }}>
            지도에서 보기
          </Text>
        </Pressable>
      </View>
      <View style={styles.sectionTitleRow}>
        <Text variant="joinSectionTitle" tone="primary">오늘 참여 가능한 조인</Text>
        <Text variant="joinMeta" tone="tertiary">12개</Text>
      </View>
      <Stack gap="sm">
        <JoinCard {...JOIN_FIGMA_QA_CARD} onPress={() => {}} />
        <JoinCard {...JOIN_FIGMA_QA_CARD_SECOND} onPress={() => {}} />
      </Stack>
    </View>
  );
}

function MyJoinsPreview() {
  return (
    <View style={styles.scene}>
      <Text variant="joinScreenTitle" tone="primary">내 조인</Text>
      <Section title="내가 만든 조인" titleVariant="joinSectionTitle">
        <Stack gap="sm">
          <JoinCard {...JOIN_FIGMA_QA_CARD_MANAGEMENT} onPress={() => {}} />
        </Stack>
      </Section>
      <Section title="지난 조인" titleVariant="joinSectionTitle">
        <Text variant="joinMeta" tone="secondary">진행·예정</Text>
        <JoinCard {...JOIN_FIGMA_QA_CARD_MANAGEMENT} onPress={() => {}} />
      </Section>
    </View>
  );
}

function HomeJoinPreview() {
  return (
    <View style={styles.scene}>
      <Text variant="joinSectionTitle" tone="primary">오늘의 추천 조인</Text>
      <Stack gap="sm">
        <JoinCard {...JOIN_FIGMA_QA_CARD_COMPACT} onPress={() => {}} />
        <JoinCard {...JOIN_FIGMA_QA_CARD_COMPACT} onPress={() => {}} />
      </Stack>
    </View>
  );
}

function JoinDetailPreview() {
  return (
    <View style={styles.scene}>
      <JoinDetailPrimarySections detail={DETAIL_FIXTURE as never} matching={false} />
    </View>
  );
}

export default function JoinFigmaQaScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams<{ width?: string; scene?: string }>();
  if (!isInternalToolsEnabled()) {
    return <Redirect href="/(tabs)/my" />;
  }

  const frameWidth = parseJoinFigmaQaWidth(params.width);
  const scene = parseJoinFigmaQaScene(params.scene);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.surface.base }}
      contentContainerStyle={styles.scroll}
    >
      <View style={[styles.frame, { width: frameWidth }]}>
        {scene === 'join-list' ? <JoinListPreview /> : null}
        {scene === 'join-detail' ? <JoinDetailPreview /> : null}
        {scene === 'my-joins' ? <MyJoinsPreview /> : null}
        {scene === 'home-join-card' ? <HomeJoinPreview /> : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  frame: {
    alignSelf: 'center',
    paddingHorizontal: 0,
  },
  scene: {
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    minHeight: 36,
  },
  filterChip: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  filterSpacer: {
    flex: 1,
    minWidth: 8,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 8,
  },
});
