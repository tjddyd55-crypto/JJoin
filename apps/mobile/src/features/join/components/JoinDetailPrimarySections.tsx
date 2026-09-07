import { Linking, Pressable, StyleSheet, View } from 'react-native';
import {
  Icon,
  JoinDdayBadge,
  JoinDetailCard,
  JoinHostSummary,
  JoinMiniStatGrid,
  JoinRequirementChips,
  JoinSeatsRemainingBanner,
  JoinStatusBadge,
  JoinVenueSummary,
  Badge,
  Text,
  useTheme,
} from '@jjoin/design-system';
import type { JoinDetailDto } from '@jjoin/types';
import { JoinParticipationSlotGrid } from './JoinParticipationSlotGrid';
import {
  buildJoinBenefitLines,
  buildJoinGameInfoLines,
  buildJoinMemberPreferenceLabels,
  buildJoinParticipationSummary,
  buildJoinRecruitmentBreakdown,
  buildJoinRosterSlots,
  hasJoinBenefits,
  hasJoinGameInfoSection,
  hasJoinMemberPreferenceLabels,
} from '../../../ui/join-detail-display';
import {
  formatJoinScheduleDetailDate,
  formatJoinScheduleDetailTime,
  resolveJoinDdayForCard,
  resolveJoinDisplayTitle,
  resolveJoinListStatusBadges,
} from '../../../ui/join-display';

export type JoinDetailPrimarySectionsProps = {
  detail: JoinDetailDto;
  matching: boolean;
  bookmarked?: boolean;
  onToggleBookmark?: () => void;
  onShare?: () => void;
  onOpenHost?: () => void;
};

function formatHostMetaLine(detail: JoinDetailDto): string | null {
  const host = detail.host;
  const parts: string[] = [];
  if (host.averageRatingDisplay && (host.reviewCount ?? 0) > 0) {
    parts.push(`매너 ${host.averageRatingDisplay}`);
  }
  if (host.playedCountWithViewer != null && host.playedCountWithViewer > 0) {
    parts.push(`함께한 조인 ${host.playedCountWithViewer}회`);
  } else if (host.completedJoinCount != null) {
    parts.push(`함께한 조인 ${host.completedJoinCount}회`);
  }
  return parts.length > 0 ? parts.join(' · ') : null;
}

function requirementLabels(detail: JoinDetailDto, matching: boolean): string[] {
  const labels: string[] = [];
  if (!matching && detail.joinMethod) {
    labels.push(detail.joinMethod === 'OPEN' ? '참가 즉시 확정' : '승인 후 참가');
  }
  return labels;
}

function SectionDivider() {
  const theme = useTheme();
  return (
    <View
      style={[styles.divider, { backgroundColor: theme.colors.border.subtle }]}
    />
  );
}

type InfoRow = { label: string; value: string };

function JoinDetailInfoPanel({
  title,
  rows,
}: {
  title: string;
  rows: InfoRow[];
}) {
  const theme = useTheme();
  if (rows.length === 0) return null;

  return (
    <View
      style={[
        styles.infoPanel,
        {
          backgroundColor: theme.colors.surface.soft,
          borderColor: theme.colors.border.subtle,
        },
      ]}
    >
      <Text variant="caption" tone="secondary" style={styles.infoPanelTitle}>
        {title}
      </Text>
      <View style={styles.infoPanelRows}>
        {rows.map((row) => (
          <View key={row.label} style={styles.infoRow}>
            <Text variant="caption" tone="secondary" style={styles.infoRowLabel}>
              {row.label}
            </Text>
            <Text variant="body" tone="primary" style={styles.infoRowValue}>
              {row.value}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function buildScheduleStatTiles(detail: JoinDetailDto) {
  const recruitment = buildJoinRecruitmentBreakdown(detail);
  const tiles = [
    { label: '날짜', value: formatJoinScheduleDetailDate(detail.startAt), surface: 'info' as const },
    {
      label: '시간',
      value: `${formatJoinScheduleDetailTime(detail.startAt)}~${formatJoinScheduleDetailTime(detail.scheduledEndAt)}`,
      surface: 'info' as const,
    },
    {
      label: '모집',
      value: `${detail.plannedPlayerCount}명`,
      surface: 'info' as const,
    },
    {
      label: '현재',
      value: `${detail.confirmedPlayerCount}/${detail.plannedPlayerCount}`,
      surface: 'success' as const,
    },
  ];
  const reward = Number(detail.rewardPerParticipant);
  if (Number.isFinite(reward) && reward > 0) {
    tiles.push({
      label: '보상',
      value: `${reward} 코인`,
      surface: 'success' as const,
    });
  }
  if (recruitment.recruitCloseLabel) {
    tiles.push({
      label: '마감',
      value: recruitment.recruitCloseLabel,
      surface: 'info' as const,
    });
  }
  return tiles;
}

export function JoinDetailPrimarySections({
  detail,
  matching,
  bookmarked = false,
  onToggleBookmark,
  onShare,
  onOpenHost,
}: JoinDetailPrimarySectionsProps) {
  const theme = useTheme();
  const displayTitle = resolveJoinDisplayTitle(detail.venue.name, detail.title);
  const dday = resolveJoinDdayForCard({
    startAt: detail.startAt,
    status: detail.status,
    scheduledEndAt: detail.scheduledEndAt,
  });
  const statusBadges = resolveJoinListStatusBadges({
    status: detail.status,
    sportCode: detail.sportCode,
    isUrgent: detail.isUrgent,
    seatsLeft: detail.availableSlots,
    scheduledEndAt: detail.scheduledEndAt,
  });
  const recruitment = buildJoinRecruitmentBreakdown(detail);
  const participation = buildJoinParticipationSummary(detail);
  const rosterSlots = buildJoinRosterSlots(detail);
  const scheduleTiles = buildScheduleStatTiles(detail);
  const requirements = requirementLabels(detail, matching);
  const benefitLines = buildJoinBenefitLines(detail);
  const showBenefits = hasJoinBenefits(detail);
  const memberPreferenceLabels = buildJoinMemberPreferenceLabels(detail);
  const gameInfo = buildJoinGameInfoLines(detail);
  const showGameInfo = hasJoinGameInfoSection(detail);
  const hasRecruitmentTargets =
    (recruitment.maleTarget ?? 0) > 0 ||
    (recruitment.femaleTarget ?? 0) > 0 ||
    (recruitment.minimumPlayers ?? 0) > 0;

  const distanceLabel = detail.venue.regionLabel?.trim() || null;

  const openMap = () => {
    const { latitude, longitude } = detail.venue;
    void Linking.openURL(`https://map.kakao.com/link/map/${latitude},${longitude}`);
  };

  const conditionLabels = [...requirements, ...memberPreferenceLabels];
  if (hasRecruitmentTargets) {
    if ((recruitment.maleTarget ?? 0) > 0) {
      conditionLabels.push(`남성 ${recruitment.maleTarget}명`);
    }
    if ((recruitment.femaleTarget ?? 0) > 0) {
      conditionLabels.push(`여성 ${recruitment.femaleTarget}명`);
    }
    if ((recruitment.minimumPlayers ?? 0) > 0) {
      conditionLabels.push(`최소 ${recruitment.minimumPlayers}명`);
    }
  }

  const genderSummary = [participation.maleLine, participation.femaleLine]
    .filter(Boolean)
    .join(' · ');

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <View style={styles.summaryTopRow}>
          <View style={styles.badgeRow}>
            {dday ? <JoinDdayBadge label={dday.label} /> : null}
            {statusBadges.map((badge) => (
              <JoinStatusBadge key={badge.label} label={badge.label} tone={badge.tone} />
            ))}
            {detail.recurringScheduleId ? (
              <Badge label="반복 조인" variant="neutral" />
            ) : null}
          </View>
          {(onToggleBookmark || onShare) ? (
            <View style={styles.headerActions}>
              {onToggleBookmark ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={bookmarked ? '찜 해제' : '찜하기'}
                  onPress={onToggleBookmark}
                  hitSlop={10}
                  style={styles.headerActionHit}
                >
                  <Text
                    variant="sectionTitle"
                    style={{
                      color: bookmarked
                        ? theme.colors.action.primary
                        : theme.colors.text.tertiary,
                    }}
                  >
                    {bookmarked ? '♥' : '♡'}
                  </Text>
                </Pressable>
              ) : null}
              {onShare ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="공유"
                  onPress={onShare}
                  hitSlop={10}
                  style={styles.headerActionHit}
                >
                  <Icon name="share" size="md" tone="secondary" />
                </Pressable>
              ) : null}
            </View>
          ) : null}
        </View>
        <Text variant="joinScreenTitle" tone="primary" numberOfLines={2}>
          {displayTitle}
        </Text>
      </View>

      <JoinDetailCard>
        <JoinHostSummary
          nickname={detail.host.nickname}
          avatarUrl={detail.host.avatarUrl}
          metaLine={formatHostMetaLine(detail)}
          onPress={onOpenHost}
          embedded
        />
        <SectionDivider />
        <JoinVenueSummary
          venueName={detail.venue.name}
          address={detail.venue.address}
          distanceLabel={distanceLabel}
          onOpenMap={openMap}
          embedded
        />
      </JoinDetailCard>

      <JoinDetailCard>
        <JoinMiniStatGrid items={scheduleTiles} />
        <JoinSeatsRemainingBanner
          label={participation.seatsLeftLabel}
          tone={participation.seatsHighlightTone}
        />
        <Text variant="bodyStrong" tone="primary" style={styles.rosterTitle}>
          참가 현황
        </Text>
        {genderSummary ? (
          <Text variant="caption" tone="secondary">{genderSummary}</Text>
        ) : null}
        <JoinParticipationSlotGrid slots={rosterSlots} />
      </JoinDetailCard>

      {(conditionLabels.length > 0 || showBenefits) ? (
        <JoinDetailCard>
          {conditionLabels.length > 0 ? (
            <JoinRequirementChips labels={conditionLabels} />
          ) : null}
          {showBenefits ? (
            <View style={styles.benefitList}>
              {benefitLines.map((line) => (
                <Text key={line} variant="body" tone="primary" style={styles.benefitLine}>
                  {line}
                </Text>
              ))}
            </View>
          ) : null}
        </JoinDetailCard>
      ) : null}

      {showGameInfo ? (
        <JoinDetailCard>
          <Text variant="caption" tone="secondary" style={styles.eyebrow}>
            게임 · 애프터
          </Text>
          <JoinDetailInfoPanel
            title="게임 정보"
            rows={[
              ...(gameInfo.skillLabel
                ? [{ label: '참가 실력', value: gameInfo.skillLabel }]
                : []),
              { label: '게임 방식', value: gameInfo.gameStyleLabel },
              ...(gameInfo.gameMemo ? [{ label: '메모', value: gameInfo.gameMemo }] : []),
            ]}
          />
          <JoinDetailInfoPanel
            title="애프터 플랜"
            rows={[
              { label: '플랜', value: gameInfo.afterPlanLabel },
              ...(gameInfo.afterMemo ? [{ label: '메모', value: gameInfo.afterMemo }] : []),
            ]}
          />
        </JoinDetailCard>
      ) : null}

      {detail.description?.trim() ? (
        <JoinDetailCard>
          <Text variant="caption" tone="secondary" style={styles.eyebrow}>
            추가 안내
          </Text>
          <Text variant="body" tone="primary" style={styles.introBody}>
            {detail.description.trim()}
          </Text>
        </JoinDetailCard>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: 12,
  },
  header: {
    gap: 10,
    marginBottom: 4,
  },
  summaryTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  badgeRow: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
    minWidth: 0,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 0,
  },
  headerActionHit: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
  },
  eyebrow: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 4,
  },
  rosterTitle: {
    marginTop: 4,
  },
  benefitList: {
    gap: 6,
  },
  benefitLine: {
    fontSize: 15,
    lineHeight: 22,
  },
  introBody: {
    fontSize: 15,
    lineHeight: 22,
  },
  infoPanel: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    gap: 8,
  },
  infoPanelTitle: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  infoPanelRows: {
    gap: 8,
  },
  infoRow: {
    gap: 2,
  },
  infoRowLabel: {
    fontSize: 12,
    lineHeight: 16,
  },
  infoRowValue: {
    fontSize: 15,
    lineHeight: 22,
  },
});
