/** Human labels for membership entitlements — display only; codes stay SSOT. */
export const ENTITLEMENT_LABELS: Record<string, string> = {
  ROOM_CREATION_FEE_WAIVER: '조인 생성 이용료 면제',
};

export function entitlementLabel(code: string): string {
  return ENTITLEMENT_LABELS[code] ?? code;
}

export function renewalLabel(params: {
  planCode: 'FREE' | 'PREMIUM';
  cancelAtPeriodEnd: boolean;
  status: string | null;
}): string | null {
  if (params.planCode !== 'PREMIUM') return null;
  if (params.cancelAtPeriodEnd || params.status === 'CANCELLED') return '해지 예정';
  return null;
}
