/**
 * PublicGolfFacilitySyncService — fetch / normalize / upsert / mark-seen / report.
 * Cron runner and Nest stay thin; this module owns data logic.
 */
import { Prisma, type PrismaClient } from '@prisma/client';
import proj4 from 'proj4';
import {
  fetchAllLocaldataGolfFacilities,
  type LocaldataGolfRawItem,
} from './localdata-golf-client';
import {
  LOCALDATA_GOLF_SOURCE,
  applyTmConversion,
  normalizeLocaldataGolfItem,
  type NormalizedGolfFacility,
} from './facility-normalize';

proj4.defs(
  'EPSG:5174',
  '+proj=tmerc +lat_0=38 +lon_0=127 +k=1 +x_0=200000 +y_0=500000 +ellps=bessel +units=m +no_defs +towgs84=-115.80,474.99,674.11,1.16,-2.31,-1.63,6.43',
);

const KR_LAT = [33, 39] as const;
const KR_LNG = [124, 132] as const;
const MISS_INACTIVE_THRESHOLD = 3;
const LOCK_STALE_MS = 2 * 60 * 60 * 1000;
const DEFAULT_MIN_FETCHED = 5000;

export type PublicGolfSyncOptions = {
  serviceKey: string;
  /** Skip KST 1/16 calendar gate (manual ops / tests). */
  force?: boolean;
  /** Absolute low-count floor (default 5000). */
  minFetchedCount?: number;
  numOfRows?: number;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  now?: Date;
  /** When true, do not write (dry). */
  dryRun?: boolean;
};

export type PublicGolfSyncReport = {
  status: 'SUCCESS' | 'FAILED' | 'SKIPPED' | 'ABORTED_GUARD';
  runId: string | null;
  fetchedPages: number;
  fetchedCount: number;
  insertedCount: number;
  updatedCount: number;
  unchangedCount: number;
  inactiveCount: number;
  geocodedCount: number;
  failedCount: number;
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
  const y = Number(parts.find((p) => p.type === 'year')?.value);
  const m = Number(parts.find((p) => p.type === 'month')?.value);
  const d = Number(parts.find((p) => p.type === 'day')?.value);
  return { y, m, d };
}

export function shouldRunOnKstCalendar(now = new Date()): boolean {
  const { d } = kstYmd(now);
  return d === 1 || d === 16;
}

function convertTm(tmX: number, tmY: number): { lat: number; lng: number; ok: boolean } {
  try {
    const [lng, lat] = proj4('EPSG:5174', 'EPSG:4326', [tmX, tmY]) as [number, number];
    const ok =
      Number.isFinite(lat) &&
      Number.isFinite(lng) &&
      lat >= KR_LAT[0] &&
      lat <= KR_LAT[1] &&
      lng >= KR_LNG[0] &&
      lng <= KR_LNG[1];
    return { lat, lng, ok };
  } catch {
    return { lat: 0, lng: 0, ok: false };
  }
}

function dec(n: number | null): Prisma.Decimal | null {
  if (n == null || !Number.isFinite(n)) return null;
  return new Prisma.Decimal(n);
}

/** Source-payload fingerprint only (coords excluded — TM reuse must not force UPDATE). */
function sourceFingerprint(row: {
  sourceName: string;
  sourcePhone: string | null;
  sourceRoadAddress: string | null;
  sourceLotAddress: string | null;
  sourceTmX: number | null;
  sourceTmY: number | null;
  businessStatusCode: string | null;
  businessStatusName: string | null;
  detailStatusCode: string | null;
  detailStatusName: string | null;
  facilityType: string;
  hasScreenGolf: string;
  screenStatus: string;
  isActive: boolean;
}): string {
  return JSON.stringify({
    sourceName: row.sourceName,
    sourcePhone: row.sourcePhone,
    sourceRoadAddress: row.sourceRoadAddress,
    sourceLotAddress: row.sourceLotAddress,
    sourceTmX: row.sourceTmX == null ? null : Math.round(row.sourceTmX * 1000) / 1000,
    sourceTmY: row.sourceTmY == null ? null : Math.round(row.sourceTmY * 1000) / 1000,
    businessStatusCode: row.businessStatusCode,
    businessStatusName: row.businessStatusName,
    detailStatusCode: row.detailStatusCode,
    detailStatusName: row.detailStatusName,
    facilityType: row.facilityType,
    hasScreenGolf: row.hasScreenGolf,
    screenStatus: row.screenStatus,
    isActive: row.isActive,
  });
}

function sameTm(
  aX: number | Prisma.Decimal | null | undefined,
  aY: number | Prisma.Decimal | null | undefined,
  bX: number | null,
  bY: number | null,
): boolean {
  if (aX == null || aY == null || bX == null || bY == null) return false;
  return Math.abs(Number(aX) - bX) < 0.001 && Math.abs(Number(aY) - bY) < 0.001;
}

export class PublicGolfFacilitySyncService {
  constructor(private readonly prisma: PrismaClient) {}

  async run(options: PublicGolfSyncOptions): Promise<PublicGolfSyncReport> {
    const now = options.now ?? new Date();
    logEvent('PUBLIC_GOLF_SYNC_START', { force: Boolean(options.force), dryRun: Boolean(options.dryRun) });

    if (!options.force && !shouldRunOnKstCalendar(now)) {
      const report: PublicGolfSyncReport = {
        status: 'SKIPPED',
        runId: null,
        fetchedPages: 0,
        fetchedCount: 0,
        insertedCount: 0,
        updatedCount: 0,
        unchangedCount: 0,
        inactiveCount: 0,
        geocodedCount: 0,
        failedCount: 0,
        errorSummary: 'skipped_not_kst_1_or_16',
        meta: { kst: kstYmd(now) },
      };
      logEvent('PUBLIC_GOLF_SYNC_COMPLETE', report);
      return report;
    }

    const running = await this.prisma.publicGolfFacilitySyncRun.findFirst({
      where: {
        status: 'RUNNING',
        startedAt: { gt: new Date(now.getTime() - LOCK_STALE_MS) },
      },
      orderBy: { startedAt: 'desc' },
    });
    if (running) {
      const ageMs = now.getTime() - running.startedAt.getTime();
      // Force / ops: clear locks older than 2 minutes (container kill leaves RUNNING).
      if (options.force && ageMs > 2 * 60 * 1000) {
        await this.finishRun(running.id, {
          status: 'FAILED',
          errorSummary: 'stale_lock_cleared_by_force',
        });
      } else {
        const report: PublicGolfSyncReport = {
          status: 'SKIPPED',
          // Not a self-lock: report the *blocking* RUNNING row id only in meta.
          runId: null,
          fetchedPages: 0,
          fetchedCount: 0,
          insertedCount: 0,
          updatedCount: 0,
          unchangedCount: 0,
          inactiveCount: 0,
          geocodedCount: 0,
          failedCount: 0,
          errorSummary: 'lock_held_by_running_sync',
          meta: { runningId: running.id, ageMs },
        };
        logEvent('PUBLIC_GOLF_SYNC_COMPLETE', report);
        return report;
      }
    }

    const run = await this.prisma.publicGolfFacilitySyncRun.create({
      data: {
        status: 'RUNNING',
        source: LOCALDATA_GOLF_SOURCE,
        startedAt: now,
      },
    });

    try {
      const fetched = await fetchAllLocaldataGolfFacilities({
        serviceKey: options.serviceKey,
        numOfRows: options.numOfRows ?? 100,
        baseUrl: options.baseUrl,
        fetchImpl: options.fetchImpl,
      });

      const minFetched =
        options.minFetchedCount ??
        Number(process.env.PUBLIC_GOLF_SYNC_MIN_FETCHED ?? DEFAULT_MIN_FETCHED);

      const lastOk = await this.prisma.publicGolfFacilitySyncRun.findFirst({
        where: { status: 'SUCCESS' },
        orderBy: { finishedAt: 'desc' },
      });
      const relativeFloor = lastOk
        ? Math.floor(lastOk.fetchedCount * 0.5)
        : Math.floor(
            (await this.prisma.golfFacility.count({
              where: { source: LOCALDATA_GOLF_SOURCE },
            })) * 0.5,
          );
      const floor = Math.max(minFetched, relativeFloor);

      if (fetched.items.length < floor) {
        const msg = `low_count_guard:fetched=${fetched.items.length}:floor=${floor}`;
        await this.finishRun(run.id, {
          status: 'ABORTED_GUARD',
          fetchedPages: fetched.pages,
          fetchedCount: fetched.items.length,
          errorSummary: msg,
        });
        const report: PublicGolfSyncReport = {
          status: 'ABORTED_GUARD',
          runId: run.id,
          fetchedPages: fetched.pages,
          fetchedCount: fetched.items.length,
          insertedCount: 0,
          updatedCount: 0,
          unchangedCount: 0,
          inactiveCount: 0,
          geocodedCount: 0,
          failedCount: 0,
          errorSummary: msg,
        };
        logEvent('PUBLIC_GOLF_SYNC_FAILED', report);
        return report;
      }

      if (options.dryRun) {
        await this.finishRun(run.id, {
          status: 'SUCCESS',
          fetchedPages: fetched.pages,
          fetchedCount: fetched.items.length,
          meta: { dryRun: true },
        });
        const report: PublicGolfSyncReport = {
          status: 'SUCCESS',
          runId: run.id,
          fetchedPages: fetched.pages,
          fetchedCount: fetched.items.length,
          insertedCount: 0,
          updatedCount: 0,
          unchangedCount: 0,
          inactiveCount: 0,
          geocodedCount: 0,
          failedCount: 0,
          errorSummary: null,
          meta: { dryRun: true },
        };
        logEvent('PUBLIC_GOLF_SYNC_COMPLETE', report);
        return report;
      }

      const upsertStats = await this.upsertAll(fetched.items, now);
      const inactiveCount = await this.markMisses(upsertStats.seenKeys, now);

      await this.finishRun(run.id, {
        status: 'SUCCESS',
        fetchedPages: fetched.pages,
        fetchedCount: fetched.items.length,
        insertedCount: upsertStats.inserted,
        updatedCount: upsertStats.updated,
        unchangedCount: upsertStats.unchanged,
        inactiveCount,
        geocodedCount: upsertStats.geocoded,
        failedCount: upsertStats.failed,
      });

      const report: PublicGolfSyncReport = {
        status: 'SUCCESS',
        runId: run.id,
        fetchedPages: fetched.pages,
        fetchedCount: fetched.items.length,
        insertedCount: upsertStats.inserted,
        updatedCount: upsertStats.updated,
        unchangedCount: upsertStats.unchanged,
        inactiveCount,
        geocodedCount: upsertStats.geocoded,
        failedCount: upsertStats.failed,
        errorSummary: null,
      };
      logEvent('PUBLIC_GOLF_SYNC_COMPLETE', report);
      return report;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await this.finishRun(run.id, {
        status: 'FAILED',
        errorSummary: msg.slice(0, 2000),
      });
      const report: PublicGolfSyncReport = {
        status: 'FAILED',
        runId: run.id,
        fetchedPages: 0,
        fetchedCount: 0,
        insertedCount: 0,
        updatedCount: 0,
        unchangedCount: 0,
        inactiveCount: 0,
        geocodedCount: 0,
        failedCount: 0,
        errorSummary: msg.slice(0, 2000),
      };
      logEvent('PUBLIC_GOLF_SYNC_FAILED', report);
      return report;
    }
  }

  private async finishRun(
    id: string,
    patch: {
      status: 'SUCCESS' | 'FAILED' | 'SKIPPED' | 'ABORTED_GUARD';
      fetchedPages?: number;
      fetchedCount?: number;
      insertedCount?: number;
      updatedCount?: number;
      unchangedCount?: number;
      inactiveCount?: number;
      geocodedCount?: number;
      failedCount?: number;
      errorSummary?: string | null;
      meta?: Record<string, unknown>;
    },
  ) {
    await this.prisma.publicGolfFacilitySyncRun.update({
      where: { id },
      data: {
        status: patch.status,
        finishedAt: new Date(),
        fetchedPages: patch.fetchedPages ?? 0,
        fetchedCount: patch.fetchedCount ?? 0,
        insertedCount: patch.insertedCount ?? 0,
        updatedCount: patch.updatedCount ?? 0,
        unchangedCount: patch.unchangedCount ?? 0,
        inactiveCount: patch.inactiveCount ?? 0,
        geocodedCount: patch.geocodedCount ?? 0,
        failedCount: patch.failedCount ?? 0,
        errorSummary: patch.errorSummary ?? null,
        meta: patch.meta ? (patch.meta as Prisma.InputJsonValue) : undefined,
      },
    });
  }

  private async upsertAll(rawItems: LocaldataGolfRawItem[], now: Date) {
    let inserted = 0;
    let updated = 0;
    let unchanged = 0;
    let geocoded = 0;
    let failed = 0;
    const seenKeys = new Set<string>();

    for (const raw of rawItems) {
      try {
        let row = normalizeLocaldataGolfItem(raw);
        if (!row) {
          failed += 1;
          continue;
        }
        seenKeys.add(row.governmentSourceKey);

        if (row.needsTmConvert && row.sourceTmX != null && row.sourceTmY != null) {
          const existing = await this.prisma.golfFacility.findUnique({
            where: {
              source_governmentSourceKey: {
                source: LOCALDATA_GOLF_SOURCE,
                governmentSourceKey: row.governmentSourceKey,
              },
            },
            select: {
              latitude: true,
              longitude: true,
              coordinateStatus: true,
              sourceTmX: true,
              sourceTmY: true,
            },
          });
          const canReuse =
            existing &&
            existing.coordinateStatus === 'VALID' &&
            existing.latitude != null &&
            existing.longitude != null &&
            sameTm(existing.sourceTmX, existing.sourceTmY, row.sourceTmX, row.sourceTmY);

          if (canReuse) {
            row = {
              ...row,
              latitude: Number(existing!.latitude),
              longitude: Number(existing!.longitude),
              coordinateSource: 'GOV_TM_CONVERTED',
              coordinateStatus: 'VALID',
            };
          } else {
            const conv = convertTm(row.sourceTmX, row.sourceTmY);
            row = applyTmConversion(row, conv.lat, conv.lng, conv.ok);
            if (conv.ok) geocoded += 1;
          }
        }

        const result = await this.upsertOne(row, now);
        if (result === 'INSERT') inserted += 1;
        else if (result === 'UPDATE') updated += 1;
        else unchanged += 1;
      } catch {
        failed += 1;
      }
    }

    return { inserted, updated, unchanged, geocoded, failed, seenKeys };
  }

  private async upsertOne(
    row: NormalizedGolfFacility,
    now: Date,
  ): Promise<'INSERT' | 'UPDATE' | 'UNCHANGED'> {
    const existing = await this.prisma.golfFacility.findUnique({
      where: {
        source_governmentSourceKey: {
          source: row.source,
          governmentSourceKey: row.governmentSourceKey,
        },
      },
    });

    if (!existing) {
      await this.prisma.golfFacility.create({
        data: {
          source: row.source,
          governmentSourceKey: row.governmentSourceKey,
          managementNo: row.managementNo,
          localGovernmentCode: row.localGovernmentCode,
          sourceName: row.sourceName,
          displayName: row.displayName,
          normalizedName: row.normalizedName,
          sourcePhone: row.sourcePhone,
          phone: row.phone,
          phoneStatus: row.phoneStatus,
          sourceRoadAddress: row.sourceRoadAddress,
          roadAddress: row.roadAddress,
          sourceLotAddress: row.sourceLotAddress,
          lotAddress: row.lotAddress,
          postalCode: row.postalCode,
          sido: row.sido,
          sigungu: row.sigungu,
          sourceTmX: dec(row.sourceTmX),
          sourceTmY: dec(row.sourceTmY),
          latitude: dec(row.latitude),
          longitude: dec(row.longitude),
          coordinateSource: row.coordinateSource,
          coordinateStatus: row.coordinateStatus,
          facilityType: row.facilityType,
          sportType: row.sportType,
          hasScreenGolf: row.hasScreenGolf,
          screenStatus: row.screenStatus,
          screenConfidence: row.screenConfidence,
          screenEvidence: row.screenEvidence,
          screenGolfScore: row.screenGolfScore,
          screenCandidate: row.screenCandidate,
          primaryBrand: row.primaryBrand,
          screenBrands: row.screenBrands,
          businessStatusCode: row.businessStatusCode,
          businessStatusName: row.businessStatusName,
          detailStatusCode: row.detailStatusCode,
          detailStatusName: row.detailStatusName,
          licenseDate: row.licenseDate,
          closureDate: row.closureDate,
          isActive: row.isActive,
          isScreenJoinEligible: row.isScreenJoinEligible,
          exclusionReason: row.exclusionReason,
          sourceLastModifiedAt: row.sourceLastModifiedAt,
          sourceDataUpdatedAt: row.sourceDataUpdatedAt,
          sourceSyncedAt: now,
          lastSeenAt: now,
          consecutiveMissCount: 0,
          sourceRawJson: row.sourceRawJson as Prisma.InputJsonValue,
        },
      });
      return 'INSERT';
    }

    const existingFp = sourceFingerprint({
      sourceName: existing.sourceName,
      sourcePhone: existing.sourcePhone,
      sourceRoadAddress: existing.sourceRoadAddress,
      sourceLotAddress: existing.sourceLotAddress,
      sourceTmX: existing.sourceTmX != null ? Number(existing.sourceTmX) : null,
      sourceTmY: existing.sourceTmY != null ? Number(existing.sourceTmY) : null,
      businessStatusCode: existing.businessStatusCode,
      businessStatusName: existing.businessStatusName,
      detailStatusCode: existing.detailStatusCode,
      detailStatusName: existing.detailStatusName,
      facilityType: existing.facilityType,
      hasScreenGolf: existing.hasScreenGolf,
      screenStatus: existing.screenStatus,
      isActive: existing.isActive,
    });

    if (existingFp === sourceFingerprint(row)) {
      await this.prisma.golfFacility.update({
        where: { id: existing.id },
        data: {
          lastSeenAt: now,
          consecutiveMissCount: 0,
          sourceSyncedAt: now,
          sourceRawJson: row.sourceRawJson as Prisma.InputJsonValue,
        },
      });
      return 'UNCHANGED';
    }

    await this.prisma.golfFacility.update({
      where: { id: existing.id },
      data: {
        sourceName: row.sourceName,
        normalizedName: row.normalizedName,
        displayName: existing.displayNameOverridden ? existing.displayName : row.displayName,
        sourcePhone: row.sourcePhone,
        phone: existing.phoneOverridden ? existing.phone : row.phone,
        phoneStatus: existing.phoneOverridden ? existing.phoneStatus : row.phoneStatus,
        sourceRoadAddress: row.sourceRoadAddress,
        roadAddress: existing.roadAddressOverridden ? existing.roadAddress : row.roadAddress,
        sourceLotAddress: row.sourceLotAddress,
        lotAddress: existing.lotAddressOverridden ? existing.lotAddress : row.lotAddress,
        postalCode: row.postalCode,
        sido: row.sido,
        sigungu: row.sigungu,
        sourceTmX: dec(row.sourceTmX),
        sourceTmY: dec(row.sourceTmY),
        latitude: dec(row.latitude),
        longitude: dec(row.longitude),
        coordinateSource: row.coordinateSource,
        coordinateStatus: row.coordinateStatus,
        facilityType: row.facilityType,
        sportType: row.sportType,
        hasScreenGolf: row.hasScreenGolf,
        screenStatus: row.screenStatus,
        screenConfidence: row.screenConfidence,
        screenEvidence: row.screenEvidence,
        screenGolfScore: row.screenGolfScore,
        primaryBrand: row.primaryBrand,
        screenBrands: row.screenBrands,
        businessStatusCode: row.businessStatusCode,
        businessStatusName: row.businessStatusName,
        detailStatusCode: row.detailStatusCode,
        detailStatusName: row.detailStatusName,
        licenseDate: row.licenseDate,
        closureDate: row.closureDate,
        isActive: row.isActive,
        isScreenJoinEligible: row.isScreenJoinEligible,
        exclusionReason: row.exclusionReason,
        sourceLastModifiedAt: row.sourceLastModifiedAt,
        sourceDataUpdatedAt: row.sourceDataUpdatedAt,
        sourceSyncedAt: now,
        lastSeenAt: now,
        consecutiveMissCount: 0,
        sourceRawJson: row.sourceRawJson as Prisma.InputJsonValue,
      },
    });
    return 'UPDATE';
  }

  /** Never DELETE. Increment miss; soft-inactive after threshold. */
  private async markMisses(seenKeys: Set<string>, now: Date): Promise<number> {
    const existing = await this.prisma.golfFacility.findMany({
      where: { source: LOCALDATA_GOLF_SOURCE },
      select: { id: true, governmentSourceKey: true, consecutiveMissCount: true, isActive: true },
    });
    let inactiveCount = 0;
    for (const row of existing) {
      if (seenKeys.has(row.governmentSourceKey)) continue;
      const nextMiss = row.consecutiveMissCount + 1;
      const softInactive = nextMiss >= MISS_INACTIVE_THRESHOLD;
      await this.prisma.golfFacility.update({
        where: { id: row.id },
        data: {
          consecutiveMissCount: nextMiss,
          ...(softInactive && row.isActive
            ? { isActive: false, exclusionReason: 'SYNC_MISS_THRESHOLD' }
            : {}),
          sourceSyncedAt: now,
        },
      });
      if (softInactive && row.isActive) inactiveCount += 1;
    }
    return inactiveCount;
  }
}
