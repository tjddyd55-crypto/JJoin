import { ClubStatusBadge, type ClubStatusBadgeTone } from './ClubStatusBadge';

export type ClubJoinPolicyBadgeProps = {
  label: string;
  tone?: ClubStatusBadgeTone;
};

export function ClubJoinPolicyBadge({ label, tone = 'neutral' }: ClubJoinPolicyBadgeProps) {
  return <ClubStatusBadge label={label} tone={tone} />;
}
