import { JoinCard as DSJoinCard } from '@jjoin/design-system';
import {
  baseJoinCardFields,
  formatJoinScheduleListLabel,
} from '../join-display';
import { formatCoinWithLabel } from '@jjoin/domain';
import { splitJoinCapacityDisplay } from '../join-display';

export type JoinCardProps = {
  sport?: string;
  distance?: string | null;
  title?: string | null;
  venue: string;
  startAt: string;
  participantCount: number;
  plannedPlayerCount: number;
  host: string;
  hostVerified?: boolean;
  hostAvatarUrl?: string | null;
  rewardPerParticipant: string | number;
  status?: string | null;
  isUrgent?: boolean;
  joinStatus?: string;
  scheduledEndAt?: string;
  onPress?: () => void;
};

/** Legacy pattern wrapper — maps to design-system JoinCard (host photo → brand fallback). */
export function JoinCard({
  distance,
  title,
  venue,
  startAt,
  participantCount,
  plannedPlayerCount,
  host,
  hostAvatarUrl,
  rewardPerParticipant,
  status,
  isUrgent,
  joinStatus = 'OPEN',
  scheduledEndAt,
  onPress,
}: JoinCardProps) {
  const seatsLeft = plannedPlayerCount - participantCount;
  const capacity = splitJoinCapacityDisplay({
    current: participantCount,
    max: plannedPlayerCount,
    seatsLeft,
  });
  const base = baseJoinCardFields(
    {
      startAt,
      status: joinStatus,
      scheduledEndAt,
      venueName: venue,
      distanceMeters: distance ? Number.parseFloat(distance) * 1000 : null,
      current: participantCount,
      max: plannedPlayerCount,
      seatsLeft,
      hostNickname: host,
      hostAvatarUrl,
      rewardPerParticipant: String(rewardPerParticipant),
      isUrgent,
      title: title ?? null,
    },
    { variant: 'preview', statusBadge: status },
  );

  return (
    <DSJoinCard
      {...base}
      scheduleLabel={formatJoinScheduleListLabel(startAt)}
      countLabel={capacity.countLabel}
      seatsHighlight={capacity.seatsHighlight}
      seatsHighlightTone={capacity.seatsHighlightTone}
      rewardLabel={formatCoinWithLabel(rewardPerParticipant) ?? base.rewardLabel}
      onPress={onPress}
    />
  );
}
