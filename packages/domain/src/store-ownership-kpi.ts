/**
 * Store-matching join KPI SSOT.
 * One join is counted in at most one of: succeeded / cancelled / in-flight attempt.
 * "Succeeded" = has reached confirmation pipeline (CONFIRMED+) — never CONFIRMED+COMPLETED double count.
 */

export const STORE_KPI_ATTEMPT_STATUSES = [
  'OPEN',
  'FULL',
  'CONFIRMED',
  'IN_PROGRESS',
  'SETTLING',
  'COMPLETED',
  'CANCELLED',
] as const;

export const STORE_KPI_SUCCEEDED_STATUSES = [
  'CONFIRMED',
  'IN_PROGRESS',
  'SETTLING',
  'COMPLETED',
] as const;

export type StoreKpiJoinLike = {
  status: string;
  startAt: Date | string;
  scheduledEndAt?: Date | string | null;
  confirmedPlayerCount?: number | null;
  plannedPlayerCount?: number | null;
};

export type StoreOwnershipKpi = {
  attemptCount: number;
  succeededCount: number;
  cancelledCount: number;
  successRatePercent: number | null;
  participantSum: number;
  recruitingCount: number;
  scheduledCount: number;
  completedCount: number;
  lastJoinAt: string | null;
  lastSucceededAt: string | null;
};

function toIso(value: Date | string | null | undefined): string | null {
  if (value == null) return null;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export function isStoreKpiAttemptStatus(status: string): boolean {
  return (STORE_KPI_ATTEMPT_STATUSES as readonly string[]).includes(status);
}

export function isStoreKpiSucceededStatus(status: string): boolean {
  return (STORE_KPI_SUCCEEDED_STATUSES as readonly string[]).includes(status);
}

/**
 * Aggregate KPI for STORE_MATCHING joins bound to one ownership.
 * Excludes DRAFT. Success = mutually exclusive statuses that already passed confirm.
 */
export function computeStoreOwnershipKpi(
  joins: StoreKpiJoinLike[],
): StoreOwnershipKpi {
  let attemptCount = 0;
  let succeededCount = 0;
  let cancelledCount = 0;
  let participantSum = 0;
  let recruitingCount = 0;
  let scheduledCount = 0;
  let completedCount = 0;
  let lastJoinAtMs = 0;
  let lastSucceededAtMs = 0;

  for (const join of joins) {
    if (join.status === 'DRAFT') continue;
    if (!isStoreKpiAttemptStatus(join.status)) continue;

    attemptCount += 1;
    const startMs = new Date(join.startAt).getTime();
    if (Number.isFinite(startMs) && startMs > lastJoinAtMs) lastJoinAtMs = startMs;

    const seats =
      typeof join.confirmedPlayerCount === 'number'
        ? join.confirmedPlayerCount
        : 0;
    participantSum += Math.max(0, seats);

    if (join.status === 'CANCELLED') {
      cancelledCount += 1;
      continue;
    }
    if (isStoreKpiSucceededStatus(join.status)) {
      succeededCount += 1;
      if (Number.isFinite(startMs) && startMs > lastSucceededAtMs) {
        lastSucceededAtMs = startMs;
      }
    }
    if (join.status === 'OPEN' || join.status === 'FULL') recruitingCount += 1;
    if (join.status === 'CONFIRMED' || join.status === 'IN_PROGRESS') {
      scheduledCount += 1;
    }
    if (join.status === 'COMPLETED' || join.status === 'SETTLING') {
      completedCount += 1;
    }
  }

  const successRatePercent =
    attemptCount === 0
      ? null
      : Math.round((succeededCount / attemptCount) * 1000) / 10;

  return {
    attemptCount,
    succeededCount,
    cancelledCount,
    successRatePercent,
    participantSum,
    recruitingCount,
    scheduledCount,
    completedCount,
    lastJoinAt: lastJoinAtMs > 0 ? new Date(lastJoinAtMs).toISOString() : null,
    lastSucceededAt:
      lastSucceededAtMs > 0 ? new Date(lastSucceededAtMs).toISOString() : null,
  };
}

export type StoreKpiPeriod = 'all' | '30d' | '90d';

export function storeKpiPeriodStart(
  period: StoreKpiPeriod,
  now = new Date(),
): Date | null {
  if (period === 'all') return null;
  const days = period === '30d' ? 30 : 90;
  return new Date(now.getTime() - days * 24 * 60 * 60_000);
}

export function filterJoinsByKpiPeriod<T extends StoreKpiJoinLike>(
  joins: T[],
  period: StoreKpiPeriod,
  now = new Date(),
): T[] {
  const start = storeKpiPeriodStart(period, now);
  if (!start) return joins;
  const startMs = start.getTime();
  return joins.filter((j) => {
    const t = new Date(j.startAt).getTime();
    return Number.isFinite(t) && t >= startMs;
  });
}

/** @internal exported for tests */
export function _toIsoForTest(value: Date | string | null | undefined): string | null {
  return toIso(value);
}
