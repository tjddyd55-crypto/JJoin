import { Dimensions, ScrollView, StyleSheet, View } from 'react-native';
import { Redirect, useLocalSearchParams } from 'expo-router';
import {
  Button,
  Chip,
  ClubCard,
  ClubCover,
  ClubJoinPolicyBadge,
  ClubSection,
  Input,
  Stack,
  StickyActionFrame,
  Text,
  spacing,
  useTheme,
} from '@jjoin/design-system';
import { isInternalToolsEnabled } from '../../src/lib/internal-tools';
import {
  CLUB_FIGMA_QA_CARD_FALLBACK,
  CLUB_FIGMA_QA_CARD_LONG,
  CLUB_FIGMA_QA_CARD_WITH_COVER,
  CLUB_FIGMA_QA_MY_CLUB,
  parseClubFigmaQaScene,
  parseClubFigmaQaWidth,
} from '../../src/features/club/club-figma-qa-fixtures';

const FILTERS = ['전체', '활동 활발', '내 동호회'];

function DiscoverPreview() {
  return (
    <View style={styles.scene}>
      <Input value="" onChangeText={() => {}} placeholder="동호회 검색" />
      <View style={styles.filterRow}>
        {FILTERS.map((label, index) => (
          <Chip key={label} label={label} selected={index === 0} onPress={() => {}} />
        ))}
      </View>
      <Text variant="joinSectionTitle">활동이 활발한 동호회</Text>
      <ClubCard variant="discovery" {...CLUB_FIGMA_QA_CARD_WITH_COVER} onPress={() => {}} />
      <Text variant="joinSectionTitle">추천 동호회</Text>
      <ClubCard variant="discovery" {...CLUB_FIGMA_QA_CARD_LONG} onPress={() => {}} />
    </View>
  );
}

function SearchPreview() {
  return (
    <View style={styles.scene}>
      <Input value="일산" onChangeText={() => {}} placeholder="동호회 검색" />
      <View style={styles.filterRow}>
        {FILTERS.map((label, index) => (
          <Chip key={label} label={label} selected={index === 0} onPress={() => {}} />
        ))}
      </View>
      <ClubCard variant="discovery" {...CLUB_FIGMA_QA_CARD_WITH_COVER} onPress={() => {}} />
      <ClubCard variant="discovery" {...CLUB_FIGMA_QA_CARD_LONG} onPress={() => {}} />
    </View>
  );
}

function FallbackPreview() {
  return (
    <View style={styles.scene}>
      <Text variant="joinSectionTitle">이미지 fallback</Text>
      <ClubCard variant="discovery" {...CLUB_FIGMA_QA_CARD_FALLBACK} onPress={() => {}} />
    </View>
  );
}

function MyClubsPreview() {
  return (
    <View style={styles.scene}>
      <ClubSection title="내가 운영하는 동호회">
        <ClubCard variant="myClub" {...CLUB_FIGMA_QA_MY_CLUB} onPress={() => {}} />
      </ClubSection>
      <ClubSection title="가입한 동호회">
        <ClubCard variant="myClub" {...CLUB_FIGMA_QA_CARD_WITH_COVER} onPress={() => {}} />
      </ClubSection>
      <ClubSection title="승인 대기">
        <ClubCard
          variant="myClub"
          {...CLUB_FIGMA_QA_CARD_LONG}
          statusLabel="승인 대기"
          statusTone="pending"
          onPress={() => {}}
        />
      </ClubSection>
    </View>
  );
}

function DetailPreview({ withCta }: { withCta?: boolean }) {
  const heroWidth = Dimensions.get('window').width - 32;
  const detail = CLUB_FIGMA_QA_CARD_WITH_COVER;

  return (
    <View style={styles.detailRoot}>
      <ScrollView contentContainerStyle={styles.detailScroll}>
        <View style={styles.scene}>
          <ClubCover
            uri={detail.coverImageUrl}
            variant="hero"
            heroWidth={heroWidth}
            fallbackTone="green"
            style={styles.hero}
          />
          <Text variant="screenTitle">{detail.name}</Text>
          <Text variant="clubIntro" tone="secondary">{detail.intro}</Text>
          <View style={styles.badgeRow}>
            <ClubJoinPolicyBadge label="스크린" />
            <ClubJoinPolicyBadge label="승인 가입" tone="neutral" />
            <ClubJoinPolicyBadge label="공개" />
          </View>
          <Text variant="clubMeta" tone="tertiary">{detail.metaLine}</Text>
          <ClubSection title="진행 중인 모임">
            <Text variant="clubMeta" tone="tertiary">진행 중인 모임이 없습니다.</Text>
          </ClubSection>
        </View>
      </ScrollView>
      {withCta ? (
        <StickyActionFrame>
          <Button label="가입 신청" size="lg" onPress={() => {}} />
        </StickyActionFrame>
      ) : null}
    </View>
  );
}

export default function ClubFigmaQaScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams<{ width?: string; scene?: string }>();
  if (!isInternalToolsEnabled()) {
    return <Redirect href="/(tabs)/my" />;
  }

  const frameWidth = parseClubFigmaQaWidth(params.width);
  const scene = parseClubFigmaQaScene(params.scene);

  const content =
    scene === 'discover' ? <DiscoverPreview /> :
    scene === 'search' ? <SearchPreview /> :
    scene === 'fallback' ? <FallbackPreview /> :
    scene === 'my-clubs' ? <MyClubsPreview /> :
    scene === 'join-cta' ? <DetailPreview withCta /> :
    <DetailPreview />;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.surface.base }}
      contentContainerStyle={styles.scroll}
      scrollEnabled={scene !== 'join-cta'}
    >
      <View style={[styles.frame, { width: frameWidth }]}>
        {content}
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
  },
  scene: {
    gap: 16,
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    minHeight: 36,
  },
  detailRoot: {
    flex: 1,
    minHeight: 700,
  },
  detailScroll: {
    paddingBottom: 120,
  },
  hero: {
    alignSelf: 'center',
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
});
