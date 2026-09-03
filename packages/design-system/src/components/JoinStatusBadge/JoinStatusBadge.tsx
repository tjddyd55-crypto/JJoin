import { Badge, type BadgeVariant } from '../Badge';

export type JoinStatusBadgeTone = 'open' | 'urgent' | 'full' | 'closed' | 'neutral' | 'ongoing';

export type JoinStatusBadgeProps = {
  label: string;
  tone?: JoinStatusBadgeTone;
};

function variantForTone(tone: JoinStatusBadgeTone): BadgeVariant {
  switch (tone) {
    case 'urgent':
      return 'warning';
    case 'open':
    case 'ongoing':
      return 'success';
    case 'full':
    case 'closed':
      return 'neutral';
    default:
      return 'neutral';
  }
}

export function JoinStatusBadge({ label, tone = 'neutral' }: JoinStatusBadgeProps) {
  return <Badge label={label} variant={variantForTone(tone)} />;
}
