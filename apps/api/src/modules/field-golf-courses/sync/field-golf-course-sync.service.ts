/**
 * FIELD golf-course sync — fetch / normalize / upsert / mark-seen / report.
 * Reuses SCREEN calendar gate + PublicGolfFacilitySyncRun (source discriminator).
 */
import { Prisma, type PrismaClient } from '@prisma/client';
import {
  ODCLOUD_NATIONAL_GOLF_COURSE_SOURCE,
  normalizeFieldGolfCourseItem,
  type NormalizedFieldGolfCourse,
} from '@jjoin/domain';
import { shouldRunOnKstCalendar } from '../../golf-facilities/sync/public-golf-facility-sync.service';
import { fetchAllOdcloudFieldGolfCourses } from './odcloud-field-golf-client';

const MISS_INACTIVE_THRESHOLD = 3;
const LOCK_STALE_MS = 2 * 60 * 60 * 1000;
const DEFAULT_MIN_FETCHED = 200;
const FIELD_SYNC_SOURCE = ODCLOUD_NATIONAL_GOLF_COURSE_SOURCE;

export type FieldGolfSyncOptions = {
  serviceKey: string;
  force?: boolean;
  dryRun?: boolean;
  minFetchedCount?: number;
  perPage?: number;
  /** DEV sample — stop after N pages. Full import omits this. */
  maxPages?: number;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  now?: Date;
};

export type FieldGolfSyncReport = {
  status: 'SUCCESS' | 'FAILED' | 'SKIPPED' | 'ABORTED_GUARD';
  runId: string | null;
  fetchedPages: number;
  fetchedCount: number;
  insertedCount: number;
  updatedCount: number;
  unchangedCount: number;
  inactiveCount: number;
  failedCount: number;
  durationMs: number;
  errorSummary: string | null;
  meta?: Record<string, unknown>;
};

function logEvent(event: string, payload: Record<string, unknown>) {
  console.log(JSON.stringify({ event, ts: new Date().toISOString(), ...payload }));
}

function kstYmd(now: Date): { y: number; m: number; d: number } {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = fmt.formatToParts(now);
  return {
    y: Number(parts.find((p) => p.type === 'year')?.value),
    m: Number(parts.find((p) => p.type === 'month')?.value),
    d: Number(parts.find((p) => p.type === 'day')?.value),
  };
}

function dec(n: number | null): Prisma.Decimal | null {
  if (n == null || !Number.isFinite(n)) return null;
  return new Prisma.Decimal(n);
}

export class FieldGolfCourseSyncService {
  constructor(private readonly prisma: PrismaClient) {}

  async run(options: FieldGolfSyncOptions): Promise<FieldGolfSyncReport> {
    const now = options.now ?? new Date();
    const started = Date.now();
    logEvent('FIELD_GOLF_SYNC_START', {
      force: Boolean(options.force),
      dryRun: Boolean(options.dryRun),
      maxPages: options.maxPages ?? null,
    });

    if (!options.force && !shouldRunOnKstCalendar(now)) {
      const report: FieldGolfSyncReport = this.emptyReport('SKIPPED', started, {
        errorSummary: 'skipped_not_kst_1_or_16',
        meta: { kst: kstYmd(now) },
      });
      logEvent('FIELD_GOLF_SYNC_COMPLETE', report);
      return report;
    }

    const running = await this.prisma.publicGolfFacilitySyncRun.findFirst({
      where: {
        status: 'RUNNING',
        source: FIELD_SYNC_SOURCE,
        startedAt: { gt: new Date(now.getTime() - LOCK_STALE_MS) },
      },
      orderBy: { startedAt: 'desc' },
    });
    if (running) {
      const ageMs = now.getTime() - running.startedAt.getTime();
      if (options.force && ageMs > 2 * 60 * 1000) {
        await this.finishRun(running.id, { status: 'FAILED', errorSummary: 'stale_lock_cleared_by_force' });
      } else {
        return this.emptyReport('SKIPPED', started, {
          errorSummary: 'lock_held',
          meta: { blockingRunId: running.id },
        });
      }
    }

    if (options.dryRun) {
      const fetched = await fetchAllOdcloudFieldGolfCourses({
        serviceKey: options.serviceKey,
        perPage: options.perPage ?? 100,
        maxPages: options.maxPages,
        baseUrl: options.baseUrl,
        fetchImpl: options.fetchImpl,
      });
      return {
        ...this.emptyReport('SUCCESS', started, {
          meta: { dryRun: true, apiTotalCount: fetched.totalCount },
        }),
        fetchedPages: fetched.pages,
        fetchedCount: fetched.items.length,
      };
    }

    const run = await this.prisma.publicGolfFacilitySyncRun.create({
      data: {
        status: 'RUNNING',
        source: FIELD_SYNC_SOURCE,
        startedAt: now,
      },
    });

    try {
      const fetched = await fetchAllOdcloudFieldGolfCourses({
        serviceKey: options.serviceKey,
        perPage: options.perPage ?? 100,
        maxPages: options.maxPages,
        baseUrl: options.baseUrl,
        fetchImpl: options.fetchImpl,
      });

      const minFetched = options.minFetchedCount
        ?? Number(process.env.PUBLIC_FIELD_GOLF_SYNC_MIN_FETCHED ?? DEFAULT_MIN_FETCHED);
      if (!options.maxPages && fetched.items.length < minFetched) {
        await this.finishRun(run.id, {
          status: 'ABORTED_GUARD',
          fetchedPages: fetched.pages,
          fetchedCount: fetched.items.length,
          errorSummary: `ABORTED_GUARD:fetched=${fetched.items.length}:min=${minFetched}`,
        });
        const report = this.emptyReport('ABORTED_GUARD', started, {
          runId: run.id,
          errorSummary: `ABORTED_GUARD:fetched=${fetched.items.length}:min=${minFetched}`,
        });
        report.fetchedPages = fetched.pages;
        report.fetchedCount = fetched.items.length;
        return report;
      }

      const upserted = await this.upsertAll(fetched.items, now);
      const inactiveCount = options.maxPages ? 0 : await this.markMisses(upserted.seenKeys, now);
      const durationMs = Date.now() - started;
      await this.finishRun(run.id, {
        status: 'SUCCESS',
        fetchedPages: fetched.pages,
        fetchedCount: fetched.items.length,
        insertedCount: upserted.inserted,
        updatedCount: upserted.updated,
        unchangedCount: upserted.unchanged,
        inactiveCount,
        failedCount: upserted.failed,
        meta: { apiTotalCount: fetched.totalCount, durationMs, sample: Boolean(options.maxPages) },
      });
      const report: FieldGolfSyncReport = {
        status: 'SUCCESS',
        runId: run.id,
        fetchedPages: fetched.pages,
        fetchedCount: fetched.items.length,
        insertedCount: upserted.inserted,
        updatedCount: upserted.updated,
        unchangedCount: upserted.unchanged,
        inactiveCount,
        failedCount: upserted.failed,
        durationMs,
        errorSummary: null,
        meta: { apiTotalCount: fetched.totalCount },
      };
      logEvent('FIELD_GOLF_SYNC_COMPLETE', report);
      return report;
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      await this.finishRun(run.id, { status: 'FAILED', errorSummary: message });
      const report = this.emptyReport('FAILED', started, { runId: run.id, errorSummary: message });
      logEvent('FIELD_GOLF_SYNC_FAILED', report);
      return report;
    }
  }

  private emptyReport(
    status: FieldGolfSyncReport['status'],
    started: number,
    extra: Partial<FieldGolfSyncReport>,
  ): FieldGolfSyncReport {
    return {
      status,
      runId: extra.runId ?? null,
      fetchedPages: 0,
      fetchedCount: 0,
      insertedCount: 0,
      updatedCount: 0,
      unchangedCount: 0,
      inactiveCount: 0,
      failedCount: 0,
      durationMs: Date.now() - started,
      errorSummary: extra.errorSummary ?? null,
      meta: extra.meta,
    };
  }

  private async finishRun(
    id: string,
    data: {
      status: 'SUCCESS' | 'FAILED' | 'SKIPPED' | 'ABORTED_GUARD';
      fetchedPages?: number;
      fetchedCount?: number;
      insertedCount?: number;
      updatedCount?: number;
      unchangedCount?: number;
      inactiveCount?: number;
      failedCount?: number;
      errorSummary?: string | null;
      meta?: Record<string, unknown>;
    },
  ) {
    await this.prisma.publicGolfFacilitySyncRun.update({
      where: { id },
      data: {
        status: data.status,
        finishedAt: new Date(),
        fetchedPages: data.fetchedPages ?? 0,
        fetchedCount: data.fetchedCount ?? 0,
        insertedCount: data.insertedCount ?? 0,
        updatedCount: data.updatedCount ?? 0,
        unchangedCount: data.unchangedCount ?? 0,
        inactiveCount: data.inactiveCount ?? 0,
        failedCount: data.failedCount ?? 0,
        errorSummary: data.errorSummary ?? null,
        meta: data.meta as Prisma.InputJsonValue | undefined,
      },
    });
  }

  private async upsertAll(rawItems: Record<string, unknown>[], now: Date) {
    let inserted = 0;
    let updated = 0;
    let unchanged = 0;
    let failed = 0;
    const seenKeys = new Set<string>();

    for (const raw of rawItems) {
      try {
        const row = normalizeFieldGolfCourseItem(raw);
        if (!row) {
          failed += 1;
          continue;
        }
        seenKeys.add(row.externalId);
        const result = await this.upsertOne(row, raw, now);
        if (result === 'INSERT') inserted += 1;
        else if (result === 'UPDATE') updated += 1;
        else unchanged += 1;
      } catch {
        failed += 1;
      }
    }
    return { inserted, updated, unchanged, failed, seenKeys };
  }

  private async upsertOne(
    row: NormalizedFieldGolfCourse,
    raw: Record<string, unknown>,
    now: Date,
  ): Promise<'INSERT' | 'UPDATE' | 'UNCHANGED'> {
    const existing = await this.prisma.fieldGolfCourse.findUnique({
      where: {
        externalSource_externalId: {
          externalSource: row.externalSource,
          externalId: row.externalId,
        },
      },
    });

    const data = {
      name: row.name,
      normalizedName: row.normalizedName,
      address: row.address,
      roadAddress: row.roadAddress,
      sido: row.sido,
      sigungu: row.sigungu,
      phone: row.phone,
      ownerName: row.ownerName,
      areaSqm: row.areaSqm,
      holeCount: row.holeCount,
      status: row.status,
      latitude: dec(row.latitude),
      longitude: dec(row.longitude),
      isActive: true,
      consecutiveMissCount: 0,
      exclusionReason: null,
      sourceFingerprint: row.fingerprint,
      sourceUpdatedAt: row.sourceUpdatedAt,
      lastSyncedAt: now,
      lastSeenAt: now,
      sourceRawJson: raw as Prisma.InputJsonValue,
    };

    if (!existing) {
      await this.prisma.fieldGolfCourse.create({
        data: {
          externalSource: row.externalSource,
          externalId: row.externalId,
          ...data,
        },
      });
      return 'INSERT';
    }

    if (existing.sourceFingerprint === row.fingerprint) {
      await this.prisma.fieldGolfCourse.update({
        where: { id: existing.id },
        data: {
          lastSeenAt: now,
          lastSyncedAt: now,
          consecutiveMissCount: 0,
          sourceRawJson: raw as Prisma.InputJsonValue,
        },
      });
      return 'UNCHANGED';
    }

    await this.prisma.fieldGolfCourse.update({
      where: { id: existing.id },
      data,
    });
    return 'UPDATE';
  }

  /** Never DELETE. Soft-inactive after the same miss threshold as SCREEN. */
  private async markMisses(seenKeys: Set<string>, now: Date): Promise<number> {
    const existing = await this.prisma.fieldGolfCourse.findMany({
      where: { externalSource: FIELD_SYNC_SOURCE },
      select: { id: true, externalId: true, consecutiveMissCount: true, isActive: true },
    });
    let inactiveCount = 0;
    for (const row of existing) {
      if (seenKeys.has(row.externalId)) continue;
      const nextMiss = row.consecutiveMissCount + 1;
      const softInactive = nextMiss >= MISS_INACTIVE_THRESHOLD;
      await this.prisma.fieldGolfCourse.update({
        where: { id: row.id },
        data: {
          consecutiveMissCount: nextMiss,
          lastSyncedAt: now,
          ...(softInactive && row.isActive
            ? { isActive: false, exclusionReason: 'SYNC_MISS_THRESHOLD' }
            : {}),
        },
      });
      if (softInactive && row.isActive) inactiveCount += 1;
    }
    return inactiveCount;
  }
}
