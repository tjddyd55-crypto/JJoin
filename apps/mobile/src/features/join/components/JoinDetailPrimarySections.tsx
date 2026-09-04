import { Linking, Pressable, StyleSheet, View } from 'react-native';
import {
  Icon,
  JoinDdayBadge,
  JoinDetailSection,
  JoinHostAvatar,
  JoinHostSummary,
  JoinMiniStatGrid,
  JoinRequirementChips,
  JoinScheduleRow,
  JoinSeatsRemainingBanner,
  JoinStatusBadge,
  JoinVenueSummary,
  Text,
  useTheme,
} from '@jjoin/design-system';
import type { JoinDetailDto, JoinParticipantDto } from '@jjoin/types';
import {
  buildJoinBenefitLines,
  buildJoinParticipationStatTiles,
  buildJoinParticipationSummary,
  buildJoinRecruitmentBreakdown,
  buildJoinRecruitmentStatTiles,
  filterJoinDisplayParticipants,
  formatParticipantGenderLabel,
  formatParticipationStatusLabel,
  hasJoinBenefits,
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
  onOpenChat?: () => void;
  onInvite?: () => void;
  onOpenReviews?: () => void;
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

function RecruitmentCompositionRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.compositionRow}>
      <Text variant="meta" tone="secondary">{label}</Text>
      <Text variant="meta" tone="primary" style={styles.compositionValue}>{value}</Text>
    </View>
  );
}

function JoinParticipantRow({ participant }: { participant: JoinParticipantDto }) {
  const gender = formatParticipantGenderLabel(participant.gender);
  const statusLabel = formatParticipationStatusLabel(participant.participationStatus);
  const meta = [gender, statusLabel].filter(Boolean).join(' · ');

  return (
    <View style={styles.participantRow}>
      <JoinHostAvatar profileImageUrl={null} hostName={participant.nickname} size="sm" />
      <View style={styles.participantText}>
        <Text variant="bodyStrong" tone="primary" numberOfLines={1}>
          {participant.nickname}
        </Text>
        {meta ? (
          <Text variant="caption" tone="secondary" numberOfLines={1}>
            {meta}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

function InlineLink({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      hitSlop={8}
      style={styles.inlineLink}
    >
      <Text variant="caption" style={{ color: theme.colors.join.dday.text, fontWeight: '600' }}>
        {label}
      </Text>
    </Pressable>
  );
}

export function JoinDetailPrimarySections({
  detail,
  matching,
  bookmarked = false,
  onToggleBookmark,
  onShare,
  onOpenHost,
  onOpenChat,
  onInvite,
  onOpenReviews,
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
  const recruitmentTiles = buildJoinRecruitmentStatTiles(detail);
  const participation = buildJoinParticipationSummary(detail);
  const participationTiles = buildJoinParticipationStatTiles(detail);
  const displayParticipants = filterJoinDisplayParticipants(detail.participants);
  const requirements = requirementLabels(detail, matching);
  const benefitLines = buildJoinBenefitLines(detail);
  const showBenefits = hasJoinBenefits(detail);

  const distanceLabel = detail.venue.regionLabel?.trim() || null;

  const openMap = () => {
    const { latitude, longitude } = detail.venue;
    void Linking.openURL(`https://map.kakao.com/link/map/${latitude},${longitude}`);
  };

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <View style={styles.summaryTopRow}>
          <View style={styles.badgeRow}>
            {dday ? <JoinDdayBadge label={dday.label} /> : null}
            {statusBadges.map((badge) => (
              <JoinStatusBadge key={badge.label} label={badge.label} tone={badge.tone} />
            ))}
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

      <JoinDetailSection title="기본 정보">
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
        <SectionDivider />
        <View style={styles.scheduleBlock}>
          <JoinScheduleRow label={formatJoinScheduleDetailDate(detail.startAt)} />
          <View style={styles.scheduleTimes}>
            <Text variant="meta" tone="secondary" style={styles.scheduleTimeLabel}>
              시작 {formatJoinScheduleDetailTime(detail.startAt)}
            </Text>
            <Text variant="meta" tone="secondary" style={styles.scheduleTimeLabel}>
              종료 {formatJoinScheduleDetailTime(detail.scheduledEndAt)}
            </Text>
          </View>
        </View>
      </JoinDetailSection>

      <JoinDetailSection title="모집 정보">
        <JoinMiniStatGrid items={recruitmentTiles} />
        {recruitment.recruitCloseLabel ? (
          <RecruitmentCompositionRow label="모집 마감" value={recruitment.recruitCloseLabel} />
        ) : null}

        {requirements.length > 0 ? (
          <>
            <SectionDivider />
            <Text variant="caption" tone="secondary" style={styles.subLabel}>참가 조건</Text>
            <JoinRequirementChips labels={requirements} />
          </>
        ) : null}

        <SectionDivider />
        <Text variant="caption" tone="secondary" style={styles.subLabel}>혜택 및 보상</Text>
        {showBenefits ? (
          <View style={styles.benefitList}>
            {benefitLines.map((line) => (
              <Text key={line} variant="body" tone="primary" style={styles.benefitLine}>
                {line}
              </Text>
            ))}
          </View>
        ) : (
          <Text variant="meta" tone="tertiary">별도 참가 혜택 없음</Text>
        )}

        {detail.description?.trim() ? (
          <>
            <SectionDivider />
            <Text variant="caption" tone="secondary" style={styles.subLabel}>조인 소개</Text>
            <Text variant="body" tone="primary" style={styles.introBody}>
              {detail.description.trim()}
            </Text>
          </>
        ) : null}
      </JoinDetailSection>

      <JoinDetailSection title="참가 현황">
        <Text variant="bodyStrong" tone="primary" style={styles.participationHeadline}>
          {participation.headline}
        </Text>
        <JoinMiniStatGrid items={participationTiles} />
        <JoinSeatsRemainingBanner
          label={participation.seatsLeftLabel}
          tone={participation.seatsHighlightTone}
        />

        <SectionDivider />

        {displayParticipants.length > 0 ? (
          <View style={styles.participantList}>
            {displayParticipants.map((p) => (
              <JoinParticipantRow key={p.participantId} participant={p} />
            ))}
          </View>
        ) : (
          <View style={styles.emptyParticipants}>
            <Text variant="meta" tone="secondary">아직 참가자가 없습니다.</Text>
            <Text variant="caption" tone="tertiary">첫 번째 참가자가 되어보세요.</Text>
          </View>
        )}

        {(onOpenChat || onInvite || onOpenReviews) ? (
          <View style={styles.auxLinks}>
            {onOpenChat ? (
              <InlineLink label="조인 채팅" onPress={onOpenChat} />
            ) : null}
            {onInvite ? (
              <InlineLink label="참가자 초대" onPress={onInvite} />
            ) : null}
            {onOpenReviews ? (
              <InlineLink label="함께한 사람 평가하기" onPress={onOpenReviews} />
            ) : null}
          </View>
        ) : null}
      </JoinDetailSection>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: 16,
  },
  header: {
    gap: 10,
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
    marginVertical: 12,
  },
  scheduleBlock: {
    gap: 8,
  },
  scheduleTimes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  scheduleTimeLabel: {
    fontSize: 14,
    lineHeight: 20,
  },
  participationHeadline: {
    fontSize: 15,
    lineHeight: 22,
  },
  compositionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    minHeight: 22,
  },
  compositionValue: {
    fontSize: 14,
    lineHeight: 20,
  },
  subLabel: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 4,
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
  participantList: {
    gap: 10,
  },
  participantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 44,
  },
  participantText: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  emptyParticipants: {
    gap: 4,
    paddingVertical: 4,
  },
  auxLinks: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginTop: 4,
  },
  inlineLink: {
    minHeight: 44,
    justifyContent: 'center',
  },
});
