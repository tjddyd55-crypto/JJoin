#!/usr/bin/env node
/**
 * GolfFacility master import (LOCALDATA staging → DB).
 *
 * Default: --dry-run (no DB writes)
 * Write:   --apply --confirm-development
 *
 * Upsert identity: (source, governmentSourceKey)
 * Override policy:
 *   - source* fields refresh from LOCALDATA on sync
 *   - displayName/phone/roadAddress/lotAddress protected when *Overridden=true
 *   - CREATE copies source → service fields
 * Idempotency:
 *   - skip write when source payload equals existing (UNCHANGED)
 *   - do not bump sourceSyncedAt on UNCHANGED
 */

const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const { randomUUID } = require('crypto');

const ROOT = path.resolve(__dirname, '../..');
const STAGING_PATH =
  process.env.GOLF_FACILITY_STAGING_PATH ||
  path.join(ROOT, 'data/golf-practice-ranges/final/golf-facility-master-staging.json');

const FACILITY_TYPES = new Set([
  'SCREEN_GOLF',
  'MIXED_GOLF_FACILITY',
  'PRACTICE_RANGE',
  'GOLF_ACADEMY',
  'INDOOR_PRACTICE',
  'OUTDOOR_PRACTICE',
  'OTHER_GOLF_FACILITY',
  'UNKNOWN',
]);
const HAS_SCREEN = new Set(['YES', 'NO', 'UNKNOWN']);
const SCREEN_STATUS = new Set(['CONFIRMED', 'POSSIBLE', 'UNKNOWN', 'NON_SCREEN']);
const SCREEN_CONFIDENCE = new Set(['HIGH', 'MEDIUM', 'LOW', 'UNKNOWN']);
const BRANDS = new Set(['GOLFZON', 'SG_GOLF', 'FRIENDS_SCREEN', 'OTHER', 'UNKNOWN']);
const PHONE_STATUS = new Set(['PRESENT', 'EMPTY', 'INVALID']);
const KR_LAT = [33, 39];
const KR_LNG = [124, 132];
const BATCH_SIZE = 200;

function loadDotEnv() {
  const envPath = path.join(ROOT, '.env');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const i = trimmed.indexOf('=');
    const key = trimmed.slice(0, i);
    const value = trimmed.slice(i + 1);
    if (!(key in process.env)) process.env[key] = value;
  }
}

function redactDbInfo(url) {
  try {
    const u = new URL(url);
    return {
      host: u.hostname,
      port: u.port || '5432',
      database: u.pathname.replace(/^\//, ''),
      user: u.username ? `${u.username.slice(0, 2)}***` : null,
    };
  } catch {
    return { host: 'unparseable' };
  }
}

function assertDevelopmentSafe() {
  const url = process.env.DATABASE_URL || '';
  if (!url) {
    throw new Error('Refusing to write: DATABASE_URL missing');
  }
  const lower = url.toLowerCase();
  const host = (() => {
    try {
      return new URL(url).hostname.toLowerCase();
    } catch {
      return '';
    }
  })();
  const nodeEnv = (process.env.NODE_ENV || '').toLowerCase();
  const appEnv = (process.env.APP_ENV || process.env.RAILWAY_ENVIRONMENT_NAME || '').toLowerCase();

  const productionSignals = [
    nodeEnv === 'production',
    appEnv === 'production' || appEnv === 'prod',
    lower.includes('railway.app') || lower.includes('railway.internal'),
    lower.includes('amazonaws.com'),
    lower.includes('neon.tech'),
    lower.includes('supabase.co'),
    host.includes('prod'),
    /\/prod([/?]|$)/.test(lower),
  ];

  const localOk =
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '::1' ||
    appEnv === 'development' ||
    appEnv === 'dev' ||
    appEnv === 'local';

  if (productionSignals.some(Boolean) || !localOk) {
    throw new Error('Refusing to write: development DB not confirmed');
  }

  return { env: 'local', db: redactDbInfo(url), nodeEnv, appEnv };
}

function mapSportType(raw) {
  return raw === 'PARK_GOLF' ? 'PARK_GOLF' : 'GOLF';
}

function roundTo(n, digits) {
  if (n == null || !Number.isFinite(n)) return null;
  const f = 10 ** digits;
  return Math.round(n * f) / f;
}

function mapCoordinateStatus(row) {
  const source = row.coordinateSource || 'UNKNOWN';
  const lat = row.latitude;
  const lng = row.longitude;
  if (source === 'GOV_TM_CONVERTED' && Number.isFinite(lat) && Number.isFinite(lng)) {
    if (lat < KR_LAT[0] || lat > KR_LAT[1] || lng < KR_LNG[0] || lng > KR_LNG[1]) {
      return { coordinateSource: source, coordinateStatus: 'INVALID', latitude: null, longitude: null };
    }
    return {
      coordinateSource: source,
      coordinateStatus: 'VALID',
      // Match Prisma @db.Decimal(10, 7)
      latitude: roundTo(lat, 7),
      longitude: roundTo(lng, 7),
    };
  }
  if (row.coordinateStatus === 'TM_PRESENT_CONVERT_FAILED') {
    return { coordinateSource: 'UNKNOWN', coordinateStatus: 'INVALID', latitude: null, longitude: null };
  }
  return { coordinateSource: 'UNKNOWN', coordinateStatus: 'MISSING', latitude: null, longitude: null };
}

function mapBrand(raw) {
  return BRANDS.has(raw) ? raw : 'UNKNOWN';
}

function parseDateOnly(value) {
  if (!value || !String(value).trim()) return null;
  const text = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return new Date(`${text.slice(0, 10)}T00:00:00.000Z`);
  if (/^\d{8}$/.test(text)) {
    return new Date(`${text.slice(0, 4)}-${text.slice(4, 6)}-${text.slice(6, 8)}T00:00:00.000Z`);
  }
  const d = new Date(text);
  return Number.isNaN(d.getTime()) ? null : d;
}

function parseMaybeDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function mapStagingToFacility(row) {
  const coords = mapCoordinateStatus(row);
  const source = row.source || 'LOCALDATA_GOLF_PRACTICE_RANGE';
  const phoneRaw = row.phoneRaw || row.phone || null;
  return {
    source,
    governmentSourceKey: row.governmentSourceKey,
    managementNo: row.managementNo,
    localGovernmentCode: row.localGovernmentCode,
    sourceName: row.name,
    displayName: row.name,
    normalizedName: row.normalizedName || '',
    displayNameOverridden: false,
    sourcePhone: phoneRaw,
    phone: row.phone || phoneRaw,
    phoneStatus: PHONE_STATUS.has(row.phoneStatus) ? row.phoneStatus : 'EMPTY',
    phoneOverridden: false,
    sourceRoadAddress: row.roadAddress || null,
    roadAddress: row.roadAddress || null,
    roadAddressOverridden: false,
    sourceLotAddress: row.lotAddress || null,
    lotAddress: row.lotAddress || null,
    lotAddressOverridden: false,
    postalCode: row.postalCode || null,
    sido: row.sido || null,
    sigungu: row.sigungu || null,
    sourceTmX: roundTo(row.tmX ?? null, 6),
    sourceTmY: roundTo(row.tmY ?? null, 6),
    latitude: coords.latitude,
    longitude: coords.longitude,
    coordinateSource: coords.coordinateSource,
    coordinateStatus: coords.coordinateStatus,
    facilityType: row.facilityType,
    sportType: mapSportType(row.sportType),
    hasScreenGolf: row.hasScreenGolf,
    screenStatus: row.screenStatus,
    screenConfidence: SCREEN_CONFIDENCE.has(row.screenConfidence) ? row.screenConfidence : 'UNKNOWN',
    screenEvidence: Array.isArray(row.screenEvidence) ? row.screenEvidence : [],
    screenGolfScore: row.screenGolfScore ?? null,
    screenCandidate: Boolean(row.screenCandidate),
    primaryBrand: mapBrand(row.brandCandidate),
    screenBrands: Array.isArray(row.screenBrands) ? row.screenBrands : [],
    businessStatusCode: row.businessStatusCode || null,
    businessStatusName: row.businessStatusName || null,
    detailStatusCode: row.detailStatusCode || null,
    detailStatusName: row.detailStatusName || null,
    licenseDate: parseDateOnly(row.licenseDate),
    closureDate: parseDateOnly(row.closureDate),
    isActive: row.isActive !== false,
    isScreenJoinEligible: Boolean(row.isScreenJoinEligible),
    exclusionReason: row.exclusionReason || null,
    sourceLastModifiedAt: parseMaybeDate(row.lastModifiedAt),
    sourceDataUpdatedAt: parseMaybeDate(row.dataUpdatedAt),
  };
}

function validateRow(row) {
  const errors = [];
  if (!row.governmentSourceKey || !String(row.governmentSourceKey).includes(':')) {
    errors.push('missing_or_invalid_governmentSourceKey');
  }
  if (!row.managementNo) errors.push('missing_managementNo');
  if (!row.localGovernmentCode) errors.push('missing_localGovernmentCode');
  if (!row.name || !String(row.name).trim()) errors.push('missing_name');
  if (!FACILITY_TYPES.has(row.facilityType)) errors.push(`invalid_facilityType:${row.facilityType}`);
  if (!HAS_SCREEN.has(row.hasScreenGolf)) errors.push(`invalid_hasScreenGolf:${row.hasScreenGolf}`);
  if (!SCREEN_STATUS.has(row.screenStatus)) errors.push(`invalid_screenStatus:${row.screenStatus}`);
  if (!row.sportType) errors.push('missing_sportType');
  return { ok: errors.length === 0, errors };
}

function normStr(v) {
  if (v == null) return null;
  return String(v);
}

function normNum(v, digits = 7) {
  if (v == null || v === '') return null;
  const n = typeof v === 'object' && v !== null && 'toNumber' in v ? v.toNumber() : Number(v);
  if (!Number.isFinite(n)) return null;
  return roundTo(n, digits);
}

function normDate(v) {
  if (v == null) return null;
  const d = v instanceof Date ? v : new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

function normDateTime(v) {
  if (v == null) return null;
  const d = v instanceof Date ? v : new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function sameArray(a, b) {
  const aa = Array.isArray(a) ? a : [];
  const bb = Array.isArray(b) ? b : [];
  if (aa.length !== bb.length) return false;
  return aa.every((x, i) => x === bb[i]);
}

/** Compare source-owned fields for UNCHANGED detection. */
function sourcePayloadEqual(existing, incoming) {
  const checks = [
    [normStr(existing.sourceName), normStr(incoming.sourceName)],
    [normStr(existing.sourcePhone), normStr(incoming.sourcePhone)],
    [normStr(existing.sourceRoadAddress), normStr(incoming.sourceRoadAddress)],
    [normStr(existing.sourceLotAddress), normStr(incoming.sourceLotAddress)],
    [normStr(existing.postalCode), normStr(incoming.postalCode)],
    [normStr(existing.managementNo), normStr(incoming.managementNo)],
    [normStr(existing.localGovernmentCode), normStr(incoming.localGovernmentCode)],
    [normStr(existing.sido), normStr(incoming.sido)],
    [normStr(existing.sigungu), normStr(incoming.sigungu)],
    [normNum(existing.sourceTmX, 6), normNum(incoming.sourceTmX, 6)],
    [normNum(existing.sourceTmY, 6), normNum(incoming.sourceTmY, 6)],
    [normNum(existing.latitude, 7), normNum(incoming.latitude, 7)],
    [normNum(existing.longitude, 7), normNum(incoming.longitude, 7)],
    [existing.coordinateSource, incoming.coordinateSource],
    [existing.coordinateStatus, incoming.coordinateStatus],
    [existing.facilityType, incoming.facilityType],
    [existing.sportType, incoming.sportType],
    [existing.hasScreenGolf, incoming.hasScreenGolf],
    [existing.screenStatus, incoming.screenStatus],
    [existing.screenConfidence, incoming.screenConfidence],
    [existing.screenGolfScore, incoming.screenGolfScore],
    [Boolean(existing.screenCandidate), Boolean(incoming.screenCandidate)],
    [existing.primaryBrand, incoming.primaryBrand],
    [normStr(existing.businessStatusCode), normStr(incoming.businessStatusCode)],
    [normStr(existing.businessStatusName), normStr(incoming.businessStatusName)],
    [normStr(existing.detailStatusCode), normStr(incoming.detailStatusCode)],
    [normStr(existing.detailStatusName), normStr(incoming.detailStatusName)],
    [normDate(existing.licenseDate), normDate(incoming.licenseDate)],
    [normDate(existing.closureDate), normDate(incoming.closureDate)],
    [Boolean(existing.isActive), Boolean(incoming.isActive)],
    [Boolean(existing.isScreenJoinEligible), Boolean(incoming.isScreenJoinEligible)],
    [normStr(existing.exclusionReason), normStr(incoming.exclusionReason)],
    [normDateTime(existing.sourceLastModifiedAt), normDateTime(incoming.sourceLastModifiedAt)],
    [normDateTime(existing.sourceDataUpdatedAt), normDateTime(incoming.sourceDataUpdatedAt)],
  ];
  if (!checks.every(([a, b]) => a === b)) return false;
  if (!sameArray(existing.screenEvidence, incoming.screenEvidence)) return false;
  if (!sameArray(existing.screenBrands, incoming.screenBrands)) return false;
  return true;
}

function buildUpdateData(existing, incoming, now) {
  const data = {
    managementNo: incoming.managementNo,
    localGovernmentCode: incoming.localGovernmentCode,
    sourceName: incoming.sourceName,
    normalizedName: incoming.normalizedName,
    sourcePhone: incoming.sourcePhone,
    phoneStatus: incoming.phoneStatus,
    sourceRoadAddress: incoming.sourceRoadAddress,
    sourceLotAddress: incoming.sourceLotAddress,
    postalCode: incoming.postalCode,
    sido: incoming.sido,
    sigungu: incoming.sigungu,
    sourceTmX: incoming.sourceTmX,
    sourceTmY: incoming.sourceTmY,
    latitude: incoming.latitude,
    longitude: incoming.longitude,
    coordinateSource: incoming.coordinateSource,
    coordinateStatus: incoming.coordinateStatus,
    facilityType: incoming.facilityType,
    sportType: incoming.sportType,
    hasScreenGolf: incoming.hasScreenGolf,
    screenStatus: incoming.screenStatus,
    screenConfidence: incoming.screenConfidence,
    screenEvidence: incoming.screenEvidence,
    screenGolfScore: incoming.screenGolfScore,
    screenCandidate: incoming.screenCandidate,
    primaryBrand: incoming.primaryBrand,
    screenBrands: incoming.screenBrands,
    businessStatusCode: incoming.businessStatusCode,
    businessStatusName: incoming.businessStatusName,
    detailStatusCode: incoming.detailStatusCode,
    detailStatusName: incoming.detailStatusName,
    licenseDate: incoming.licenseDate,
    closureDate: incoming.closureDate,
    isActive: incoming.isActive,
    isScreenJoinEligible: incoming.isScreenJoinEligible,
    exclusionReason: incoming.exclusionReason,
    sourceLastModifiedAt: incoming.sourceLastModifiedAt,
    sourceDataUpdatedAt: incoming.sourceDataUpdatedAt,
    sourceSyncedAt: now,
  };

  // Protect service overrides
  if (!existing.displayNameOverridden) {
    data.displayName = incoming.sourceName;
  }
  if (!existing.phoneOverridden) {
    data.phone = incoming.phone;
  }
  if (!existing.roadAddressOverridden) {
    data.roadAddress = incoming.roadAddress;
  }
  if (!existing.lotAddressOverridden) {
    data.lotAddress = incoming.lotAddress;
  }

  return data;
}

function countBy(rows, keyFn) {
  const out = {};
  for (const row of rows) {
    const key = keyFn(row);
    out[key] = (out[key] || 0) + 1;
  }
  return out;
}

async function main() {
  loadDotEnv();
  const args = new Set(process.argv.slice(2));
  const apply = args.has('--apply');
  const confirmDev = args.has('--confirm-development');
  const dryRun = !apply;

  if (apply && !confirmDev) {
    console.error(
      JSON.stringify(
        {
          error: 'APPLY_BLOCKED',
          message: 'Refusing to write: pass --apply --confirm-development together',
        },
        null,
        2,
      ),
    );
    process.exit(2);
  }

  let envInfo = null;
  if (apply) {
    try {
      envInfo = assertDevelopmentSafe();
    } catch (err) {
      console.error(JSON.stringify({ error: 'APPLY_BLOCKED', message: String(err.message) }, null, 2));
      process.exit(2);
    }
  }

  if (!fs.existsSync(STAGING_PATH)) {
    console.error(`Missing staging file: ${STAGING_PATH}`);
    process.exit(1);
  }

  const staging = JSON.parse(fs.readFileSync(STAGING_PATH, 'utf8'));
  if (!Array.isArray(staging)) {
    console.error('Staging JSON must be an array');
    process.exit(1);
  }

  const keySet = new Map();
  const duplicates = [];
  const invalid = [];
  const mappedValid = [];
  const operations = { CREATE: 0, UPDATE_SOURCE: 0, UNCHANGED: 0, INVALID: 0, CONFLICT: 0 };

  for (let i = 0; i < staging.length; i += 1) {
    const row = staging[i];
    const source = row.source || 'LOCALDATA_GOLF_PRACTICE_RANGE';
    const key = `${source}|${row.governmentSourceKey}`;
    if (keySet.has(key)) {
      duplicates.push({ index: i, governmentSourceKey: row.governmentSourceKey, firstIndex: keySet.get(key) });
      operations.CONFLICT += 1;
      continue;
    }
    keySet.set(key, i);

    const result = validateRow(row);
    if (!result.ok) {
      invalid.push({ index: i, governmentSourceKey: row.governmentSourceKey, name: row.name, errors: result.errors });
      operations.INVALID += 1;
      continue;
    }
    mappedValid.push(mapStagingToFacility(row));
  }

  if (dryRun) {
    operations.CREATE = mappedValid.length;
    const report = {
      mode: 'DRY_RUN',
      input: staging.length,
      valid: mappedValid.length,
      invalid: invalid.length,
      duplicateSourceKeys: duplicates.length,
      operations,
      facilityType: countBy(mappedValid, (r) => r.facilityType),
      screenStatus: countBy(mappedValid, (r) => r.screenStatus),
      hasScreenGolf: countBy(mappedValid, (r) => r.hasScreenGolf),
      sportType: countBy(mappedValid, (r) => r.sportType),
      isScreenJoinEligible: {
        true: mappedValid.filter((r) => r.isScreenJoinEligible).length,
        false: mappedValid.filter((r) => !r.isScreenJoinEligible).length,
      },
      coordinates: {
        VALID: mappedValid.filter((r) => r.coordinateStatus === 'VALID').length,
        MISSING: mappedValid.filter((r) => r.coordinateStatus === 'MISSING').length,
        INVALID: mappedValid.filter((r) => r.coordinateStatus === 'INVALID').length,
      },
      dbWrite: false,
    };
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  const prisma = new PrismaClient();
  const now = new Date();
  try {
    // Prefetch existing by unique keys in batches
    for (let offset = 0; offset < mappedValid.length; offset += BATCH_SIZE) {
      const batch = mappedValid.slice(offset, offset + BATCH_SIZE);
      const keys = batch.map((r) => r.governmentSourceKey);
      const existingRows = await prisma.golfFacility.findMany({
        where: {
          source: 'LOCALDATA_GOLF_PRACTICE_RANGE',
          governmentSourceKey: { in: keys },
        },
      });
      const existingMap = new Map(existingRows.map((r) => [r.governmentSourceKey, r]));

      const creates = [];
      const updates = [];

      for (const incoming of batch) {
        const existing = existingMap.get(incoming.governmentSourceKey);
        if (!existing) {
          creates.push({
            id: randomUUID(),
            ...incoming,
            sourceSyncedAt: now,
            createdAt: now,
            updatedAt: now,
          });
          operations.CREATE += 1;
          continue;
        }
        if (sourcePayloadEqual(existing, incoming)) {
          operations.UNCHANGED += 1;
          continue;
        }
        updates.push({
          id: existing.id,
          data: buildUpdateData(existing, incoming, now),
        });
        operations.UPDATE_SOURCE += 1;
      }

      if (creates.length > 0) {
        await prisma.golfFacility.createMany({ data: creates });
      }
      for (const upd of updates) {
        await prisma.golfFacility.update({ where: { id: upd.id }, data: upd.data });
      }
    }

    const dbCount = await prisma.golfFacility.count();
    const aggregates = {
      facilityType: Object.fromEntries(
        (
          await prisma.golfFacility.groupBy({ by: ['facilityType'], _count: { _all: true } })
        ).map((r) => [r.facilityType, r._count._all]),
      ),
      screenStatus: Object.fromEntries(
        (
          await prisma.golfFacility.groupBy({ by: ['screenStatus'], _count: { _all: true } })
        ).map((r) => [r.screenStatus, r._count._all]),
      ),
      hasScreenGolf: Object.fromEntries(
        (
          await prisma.golfFacility.groupBy({ by: ['hasScreenGolf'], _count: { _all: true } })
        ).map((r) => [r.hasScreenGolf, r._count._all]),
      ),
      sportType: Object.fromEntries(
        (
          await prisma.golfFacility.groupBy({ by: ['sportType'], _count: { _all: true } })
        ).map((r) => [r.sportType, r._count._all]),
      ),
      coordinateStatus: Object.fromEntries(
        (
          await prisma.golfFacility.groupBy({ by: ['coordinateStatus'], _count: { _all: true } })
        ).map((r) => [r.coordinateStatus, r._count._all]),
      ),
      eligible: await prisma.golfFacility.count({ where: { isScreenJoinEligible: true } }),
      parkGolf: await prisma.golfFacility.count({ where: { sportType: 'PARK_GOLF' } }),
    };

    const report = {
      mode: 'APPLY',
      environment: envInfo,
      input: staging.length,
      valid: mappedValid.length,
      invalid: invalid.length,
      duplicateSourceKeys: duplicates.length,
      operations,
      dbCount,
      aggregates,
      sampleInvalid: invalid.slice(0, 10),
      dbWrite: true,
      migrationApplied: true,
    };

    const outPath = path.join(
      ROOT,
      'data/golf-practice-ranges/final/golf-facility-import-apply-report.json',
    );
    fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    console.log(JSON.stringify(report, null, 2));
    console.log(`\nWrote ${outPath}`);
  } finally {
    await prisma.$disconnect();
  }

  if (invalid.length > 0 || duplicates.length > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
