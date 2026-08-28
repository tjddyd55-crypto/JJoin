import { Badge } from '@jjoin/design-system';
import type { MembershipPresentation } from '../../features/membership/membership-presentation';

type MembershipBadgeProps = {
  presentation: Pick<MembershipPresentation, 'planBadgeLabel' | 'planBadgeVariant'>;
};

/** Self/MY only — do not use on public profile or JoinCard. */
export function MembershipBadge({ presentation }: MembershipBadgeProps) {
  return (
    <Badge label={presentation.planBadgeLabel} variant={presentation.planBadgeVariant} />
  );
}
