import { JoinCard as DSJoinCard } from '@jjoin/design-system';
import { formatCoinWithLabel } from '@jjoin/domain';

export type JoinCardProps = {
  sport?: string;
  distance?: string | null;
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
  onPress?: () => void;
};

/** Legacy pattern wrapper — maps to design-system JoinCard (host photo → brand fallback). */
export function JoinCard({
  distance,
  venue,
  startAt,
  participantCount,
  plannedPlayerCount,
  host,
  hostAvatarUrl,
  rewardPerParticipant,
  status,
  isUrgent,
  onPress,
}: JoinCardProps) {
  return (
    <DSJoinCard
      title={venue}
      timeLabel={startAt}
      distanceLabel={distance ?? null}
      participantLabel={`${participantCount}/${plannedPlayerCount}명`}
      hostNickname={host}
      hostAvatarUrl={hostAvatarUrl}
      rewardLabel={formatCoinWithLabel(rewardPerParticipant)}
      statusBadge={status ?? null}
      isUrgent={isUrgent}
      onPress={onPress}
    />
  );
}
