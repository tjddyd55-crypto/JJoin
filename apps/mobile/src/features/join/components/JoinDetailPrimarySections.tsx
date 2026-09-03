import { Linking, StyleSheet, View } from 'react-native';
import {
  JoinDdayBadge,
  JoinHostSummary,
  JoinRequirementChips,
  JoinStatusBadge,
  JoinSummaryGrid,
  JoinVenueSummary,
  ParticipantAvatarStack,
  Text,
  useTheme,
} from '@jjoin/design-system';
import type { JoinDetailDto } from '@jjoin/types';
import {
  formatJoinCapacityTileValue,
  formatJoinRewardTileValue,
  formatJoinScheduleDetailDate,
  formatJoinScheduleDetailTime,
  resolveJoinDdayForCard,
  resolveJoinDisplayTitle,
  resolveJoinListStatusBadges,
} from '../../../ui/join-display';

export type JoinDetailPrimarySectionsProps = {
  detail: JoinDetailDto;
  matching: boolean;
  slotLabel: string | null;
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
  if (detail.recruitmentLabel?.trim()) {
    labels.push(detail.recruitmentLabel.trim());
  }
  if (detail.minimumPlayers != null && detail.minimumPlayers > 0) {
    labels.push(`최소 ${detail.minimumPlayers}명`);
  }
  if (!matching && detail.joinMethod) {
    labels.push(detail.joinMethod === 'OPEN' ? '참가 즉시 확정' : '승인 후 참가');
  }
  return labels;
}

function participantStackItems(detail: JoinDetailDto) {
  return detail.participants.map((p) => ({
    id: p.participantId,
    nickname: p.role === 'HOST' ? `${p.nickname} · 방장` : p.nickname,
    avatarUrl: p.role === 'HOST' ? detail.host.avatarUrl : null,
    isHost: false,
  }));
}

export function JoinDetailPrimarySections({
  detail,
  matching,
  slotLabel,
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
  const requirements = requirementLabels(detail, matching);
  const rewardTile = formatJoinRewardTileValue(detail.rewardPerParticipant);
  const capacityValue =
    slotLabel ??
    formatJoinCapacityTileValue(detail.confirmedPlayerCount, detail.plannedPlayerCount);

  const summaryItems = [
    {
      label: '라운드 일자',
      value: formatJoinScheduleDetailDate(detail.startAt),
      variant: 'info' as const,
    },
    {
      label: '티타임',
      value: formatJoinScheduleDetailTime(detail.startAt),
      variant: 'info' as const,
    },
    {
      label: '모집 인원',
      value: capacityValue,
      variant: 'success' as const,
    },
    ...(rewardTile
      ? [{ label: '참가 보상', value: rewardTile, variant: 'success' as const }]
      : []),
  ];

  const distanceLabel = detail.venue.regionLabel
    ? detail.venue.regionLabel
    : null;

  const openMap = () => {
    const { latitude, longitude } = detail.venue;
    void Linking.openURL(`https://map.kakao.com/link/map/${latitude},${longitude}`);
  };

  return (
    <>
      <View style={styles.header}>
        <View style={styles.badgeRow}>
          {dday ? <JoinDdayBadge label={dday.label} /> : null}
          {statusBadges.map((badge) => (
            <JoinStatusBadge key={badge.label} label={badge.label} tone={badge.tone} />
          ))}
        </View>
        <Text variant="screenTitle" tone="primary" numberOfLines={2} style={styles.title}>
          {displayTitle}
        </Text>
      </View>

      <JoinHostSummary
        nickname={detail.host.nickname}
        avatarUrl={detail.host.avatarUrl}
        metaLine={formatHostMetaLine(detail)}
        onPress={onOpenHost}
      />

      <JoinVenueSummary
        venueName={detail.venue.name}
        address={detail.venue.address}
        distanceLabel={distanceLabel}
        onOpenMap={openMap}
      />

      <Text variant="screenTitle" tone="primary" style={styles.sectionTitle}>
        일정 및 모집 현황
      </Text>
      <JoinSummaryGrid items={summaryItems} />

      {detail.description?.trim() ? (
        <>
          <Text variant="screenTitle" tone="primary" style={styles.sectionTitle}>
            조인 소개
          </Text>
          <View
            style={[
              styles.introCard,
              {
                backgroundColor: theme.colors.surface.card,
                borderColor: theme.colors.border.subtle,
                borderRadius: theme.radius.lg,
              },
            ]}
          >
            <Text variant="body" tone="primary" style={styles.introBody}>
              {detail.description.trim()}
            </Text>
          </View>
        </>
      ) : null}

      {requirements.length > 0 ? (
        <>
          <Text variant="screenTitle" tone="primary" style={styles.sectionTitle}>
            참가 조건
          </Text>
          <JoinRequirementChips labels={requirements} />
        </>
      ) : null}

      <Text variant="screenTitle" tone="primary" style={styles.sectionTitle}>
        참가자 {detail.confirmedPlayerCount}/{detail.plannedPlayerCount}
      </Text>
      {detail.participants.length > 0 ? (
        <ParticipantAvatarStack items={participantStackItems(detail)} />
      ) : (
        <Text variant="meta" tone="tertiary">아직 참가자가 없습니다.</Text>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: 10,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '700',
    marginTop: 4,
  },
  introCard: {
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  introBody: {
    fontSize: 15,
    lineHeight: 22,
  },
});
