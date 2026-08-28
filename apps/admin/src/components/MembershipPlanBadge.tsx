import { AdminStatusBadge } from './AdminStatusBadge';

type MembershipPlanBadgeProps = {
  planCode: 'FREE' | 'PREMIUM' | string;
};

/** Plan badge only — do not merge subscription status into this. */
export function MembershipPlanBadge({ planCode }: MembershipPlanBadgeProps) {
  if (planCode === 'PREMIUM') {
    return <AdminStatusBadge label="PREMIUM" tone="accent" />;
  }
  return <AdminStatusBadge label="FREE" tone="neutral" />;
}

type MembershipStatusBadgeProps = {
  status: string | null | undefined;
};

export function MembershipStatusBadge({ status }: MembershipStatusBadgeProps) {
  if (!status) return <AdminStatusBadge label="—" tone="neutral" />;
  if (status === 'ACTIVE') return <AdminStatusBadge label={status} tone="success" />;
  if (status === 'CANCELLED') return <AdminStatusBadge label={status} tone="accent" />;
  if (status === 'EXPIRED' || status === 'PENDING') {
    return <AdminStatusBadge label={status} tone="neutral" />;
  }
  if (status === 'PAST_DUE') return <AdminStatusBadge label={status} tone="danger" />;
  return <AdminStatusBadge label={status} />;
}
