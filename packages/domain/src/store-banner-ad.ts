/**
 * Store banner ad request lifecycle.
 * Read-time resolver: APPROVED + in window → ACTIVE; past endsAt → EXPIRED.
 */

export const STORE_BANNER_AD_STATUSES = [
  'REQUESTED',
  'APPROVED',
  'REJECTED',
  'ACTIVE',
  'EXPIRED',
] as const;
export type StoreBannerAdStatus = (typeof STORE_BANNER_AD_STATUSES)[number];

export type StoreBannerAdLike = {
  status: StoreBannerAdStatus;
  startsAt: Date | null;
  endsAt: Date | null;
};

export function resolveStoreBannerAdStatus(
  row: StoreBannerAdLike,
  now: Date,
): StoreBannerAdStatus {
  if (row.status === 'REJECTED' || row.status === 'REQUESTED') {
    return row.status;
  }
  if (row.status === 'EXPIRED') return 'EXPIRED';

  if (row.endsAt && row.endsAt.getTime() <= now.getTime()) {
    return 'EXPIRED';
  }
  if (
    (row.status === 'APPROVED' || row.status === 'ACTIVE') &&
    row.startsAt &&
    row.startsAt.getTime() <= now.getTime() &&
    (!row.endsAt || row.endsAt.getTime() > now.getTime())
  ) {
    return 'ACTIVE';
  }
  if (row.status === 'ACTIVE' && row.startsAt && row.startsAt.getTime() > now.getTime()) {
    return 'APPROVED';
  }
  return row.status === 'ACTIVE' ? 'APPROVED' : row.status;
}

export function canApproveStoreBannerAd(status: StoreBannerAdStatus): boolean {
  return status === 'REQUESTED';
}

export function canRejectStoreBannerAd(status: StoreBannerAdStatus): boolean {
  return status === 'REQUESTED' || status === 'APPROVED';
}

export function canScheduleStoreBannerAd(status: StoreBannerAdStatus): boolean {
  return status === 'APPROVED' || status === 'ACTIVE';
}

export function validateBannerSchedule(input: {
  startsAt: Date | null;
  endsAt: Date | null;
}): { ok: true } | { ok: false; code: string } {
  if (input.startsAt && input.endsAt && input.startsAt.getTime() >= input.endsAt.getTime()) {
    return { ok: false, code: 'invalid_banner_schedule' };
  }
  return { ok: true };
}

export function isStoreBannerAdPublic(status: StoreBannerAdStatus): boolean {
  return status === 'ACTIVE';
}
