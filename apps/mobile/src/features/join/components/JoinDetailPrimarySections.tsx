import { Linking, StyleSheet, View } from 'react-native';
import {
  JoinCapacitySummary,
  JoinDdayBadge,
  JoinHostSummary,
  JoinRequirementChips,
  JoinScheduleSummary,
  JoinStatusBadge,
  JoinVenueSummary,
  ParticipantAvatarStack,
  Section,
  Text,
  useTheme,
} from '@jjoin/design-system';
import { formatSignedCoin } from '@jjoin/domain';
import type { JoinDetailDto } from '@jjoin/types';
import {
  formatJoinScheduleDetailDate,
  formatJoinScheduleDetailTime,
  resolveJoinDdayForCard,
  resolveJoinListStatusBadges,
  splitJoinCapacityDisplay,
} from '../../../ui/join-display';
import { matchingDeadlineLabel } from '../../store/matching-join-ui';

export type JoinDetailPrimarySectionsProps = {
  detail: JoinDetailDto;
  isHost: boolean;
  matching: boolean;
  slotLabel: string | null;
  onOpenHost?: () => void;
};

function formatHostMetaLine(detail: JoinDetailDto): string | null {
  const host = detail.host;
  const parts: string[] = [];
  if (host.averageRatingDisplay && (host.reviewCount ?? 0) > 0) {
    parts.push(`★ ${host.averageRatingDisplay} (${host.reviewCount})`);
  }
  if (host.playedCountWithViewer != null && host.playedCountWithViewer > 0) {
    parts.push(`함께한 ${host.playedCountWithViewer}회`);
  }
  if (host.completedJoinCount != null) {
    parts.push(`참석 ${host.completedJoinCount}`);
  }
  if (host.attendanceRatePercent != null) {
    parts.push(`참석률 ${host.attendanceRatePercent}%`);
  }
  const profileBits = [host.genderDisplay, host.ageBand].filter(Boolean);
  if (profileBits.length > 0) {
    parts.unshift(profileBits.join(' · '));
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
    nickname: p.nickname,
    avatarUrl: p.role === 'HOST' ? detail.host.avatarUrl : null,
    isHost: p.role === 'HOST',
  }));
}

export function JoinDetailPrimarySections({
  detail,
  isHost,
  matching,
  slotLabel,
  onOpenHost,
}: JoinDetailPrimarySectionsProps) {
  const theme = useTheme();
  const displayTitle = (detail.title?.trim() || detail.venue.name).trim();
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
  const capacity = splitJoinCapacityDisplay({
    current: detail.confirmedPlayerCount,
    max: detail.plannedPlayerCount,
    seatsLeft: detail.availableSlots,
  });
  const rewardLabel = formatSignedCoin(detail.rewardPerParticipant);
  const requirements = requirementLabels(detail, matching);
  const endLabel =
    detail.scheduledEndAt && detail.scheduledEndAt !== detail.startAt
      ? formatJoinScheduleDetailTime(detail.scheduledEndAt)
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
        <Text variant="screenTitle" tone="primary" numberOfLines={2}>
          {displayTitle}
        </Text>
      </View>

      <Section title="방장">
        <JoinHostSummary
          nickname={detail.host.nickname}
          avatarUrl={detail.host.avatarUrl}
          verified={detail.host.verifiedBadge}
          metaLine={formatHostMetaLine(detail)}
          onPress={onOpenHost}
        />
      </Section>

      <Section title="장소">
        <JoinVenueSummary
          venueName={detail.venue.name}
          address={detail.venue.address}
          distanceLabel={detail.venue.regionLabel}
          onOpenMap={openMap}
        />
      </Section>

      <Section title="일정">
        <JoinScheduleSummary
          dateLabel={formatJoinScheduleDetailDate(detail.startAt)}
          startLabel={formatJoinScheduleDetailTime(detail.startAt)}
          endLabel={endLabel}
        />
      </Section>

      <Section title="모집 현황">
        <JoinCapacitySummary
          countLabel={capacity.countLabel}
          seatsHighlight={capacity.seatsHighlight}
          seatsHighlightTone={capacity.seatsHighlightTone}
          slotLabel={slotLabel}
          deadlineLabel={
            matching
              ? matchingDeadlineLabel(detail.recruitClosesAt) ?? undefined
              : undefined
          }
        />
      </Section>

      {detail.description?.trim() ? (
        <Section title="조인 소개">
          <Text variant="body" tone="secondary">{detail.description.trim()}</Text>
        </Section>
      ) : null}

      {requirements.length > 0 ? (
        <Section title="참가 조건">
          <JoinRequirementChips labels={requirements} />
        </Section>
      ) : null}

      <Section title={`참가자 ${detail.confirmedPlayerCount}/${detail.plannedPlayerCount}`}>
        {detail.participants.length > 0 ? (
          <ParticipantAvatarStack items={participantStackItems(detail)} />
        ) : (
          <Text variant="meta" tone="tertiary">아직 참가자가 없습니다.</Text>
        )}
      </Section>

      {rewardLabel ? (
        <Section title="참가 보상">
          <Text variant="coinMedium" style={{ color: theme.colors.reward.primary }}>
            {rewardLabel}
          </Text>
        </Section>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: 10,
    marginBottom: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    alignItems: 'center',
  },
});
