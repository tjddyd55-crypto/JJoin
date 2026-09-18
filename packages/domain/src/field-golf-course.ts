/**
 * FIELD golf-course normalize / dedupe.
 * Live DEV probe keys only — do not invent lat/lng/phone/license ids.
 *
 * data[]: 구분, 면적(제곱미터), 사업자, 소재지, 이름, 지역, 홀
 */
import { normalizeSido } from './region-explore-catalog';

export const ODCLOUD_NATIONAL_GOLF_COURSE_SOURCE = 'ODCLOUD_NATIONAL_GOLF_COURSE' as const;

/**
 * HEX-verified unicode_escape of live data[] keys.
 * Keep these escapes as SSOT so a mistyped Hangul key cannot slip in.
 */
export const ODCLOUD_FIELD_GOLF_ROW_KEY_ESCAPES = [
  '\\uad6c\\ubd84',
  '\\uba74\\uc801(\\uc81c\\uacf1\\ubbf8\\ud130)',
  '\\uc0ac\\uc5c5\\uc790',
  '\\uc18c\\uc7ac\\uc9c0',
  '\\uc774\\ub984',
  '\\uc9c0\\uc5ed',
  '\\ud640',
] as const;

export function decodeOdcloudFieldGolfKeyEscape(value: string): string {
  return value.replace(/\\u([0-9a-fA-F]{4})/g, (_match, hex: string) =>
    String.fromCharCode(Number.parseInt(hex, 16)),
  );
}

/** Exact Korean keys from the HEX-verified DEV page probe. */
export const ODCLOUD_FIELD_GOLF_ROW_KEYS = [
  '구분',
  '면적(제곱미터)',
  '사업자',
  '소재지',
  '이름',
  '지역',
  '홀',
] as const;

export type FieldGolfCourseIdSource = 'NAME_ADDRESS_OWNER' | 'NAME_ADDRESS';

export type NormalizedFieldGolfCourse = {
  externalSource: typeof ODCLOUD_NATIONAL_GOLF_COURSE_SOURCE;
  externalId: string;
  idSource: FieldGolfCourseIdSource;
  name: string;
  normalizedName: string;
  address: string | null;
  roadAddress: string | null;
  region: string | null;
  sido: string | null;
  sigungu: string | null;
  phone: string | null;
  ownerName: string | null;
  areaSqm: string | null;
  holeCount: number | null;
  status: string | null;
  latitude: number | null;
  longitude: number | null;
  sourceUpdatedAt: Date | null;
  fingerprint: string;
};

function asRecord(raw: unknown): Record<string, unknown> {
  return raw && typeof raw === 'object' && !Array.isArray(raw)
    ? (raw as Record<string, unknown>)
    : {};
}

function readString(raw: Record<string, unknown>, key: string): string | null {
  const value = raw[key];
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return null;
}

function readNumber(raw: Record<string, unknown>, key: string): number | null {
  const value = raw[key];
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const n = Number(value.trim().replace(/,/g, ''));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export function normalizeFieldGolfName(value: string): string {
  return value.replace(/\s+/g, '').replace(/[()[\]·.,]/g, '').toLowerCase();
}

export function normalizeFieldGolfAddress(value: string): string {
  return value.replace(/\s+/g, '').toLowerCase();
}

export function parseHoleCount(raw: string | number | null): number | null {
  if (typeof raw === 'number') {
    return Number.isInteger(raw) && raw > 0 && raw <= 72 ? raw : null;
  }
  if (!raw) return null;
  const match = raw.replace(/,/g, '').match(/(\d{1,3})/);
  if (!match) return null;
  const n = Number(match[1]);
  return Number.isInteger(n) && n > 0 && n <= 72 ? n : null;
}

function parseSigunguFromAddress(address: string, sido: string | null): string | null {
  const tokens = address.split(/\s+/).filter(Boolean);
  if (tokens.length < 2) return null;
  const start =
    sido && tokens[0] && (normalizeSido(tokens[0]) === sido || tokens[0].includes(sido.slice(0, 2)))
      ? 1
      : 0;
  const candidate = tokens[start];
  if (!candidate) return null;
  if (/[시군구]$/.test(candidate) || candidate.endsWith('구')) return candidate;
  return candidate;
}

export function parseFieldRegion(input: {
  region: string | null;
  address: string | null;
}): { sido: string | null; sigungu: string | null } {
  if (input.region) {
    const parts = input.region.split(/\s+/).filter(Boolean);
    const sido = normalizeSido(parts[0] ?? null);
    const sigungu =
      parts.length > 1 ? parts.slice(1).join(' ') : parseSigunguFromAddress(input.address ?? '', sido);
    return { sido, sigungu };
  }
  if (input.address) {
    const sido = normalizeSido(input.address.split(/\s+/).filter(Boolean)[0] ?? null);
    return { sido, sigungu: parseSigunguFromAddress(input.address, sido) };
  }
  return { sido: null, sigungu: null };
}

export function resolveFieldGolfExternalId(input: {
  name: string;
  address: string | null;
  ownerName: string | null;
}): { externalId: string; idSource: FieldGolfCourseIdSource } {
  const namePart = normalizeFieldGolfName(input.name);
  const addressPart = normalizeFieldGolfAddress(input.address ?? '');
  if (input.ownerName) {
    return {
      externalId: `${namePart}|${addressPart}|${normalizeFieldGolfName(input.ownerName)}`,
      idSource: 'NAME_ADDRESS_OWNER',
    };
  }
  return {
    externalId: `${namePart}|${addressPart}`,
    idSource: 'NAME_ADDRESS',
  };
}

export function fieldGolfSourceFingerprint(row: {
  name: string;
  address: string | null;
  ownerName: string | null;
  region: string | null;
  areaSqm: string | null;
  holeCount: number | null;
  status: string | null;
}): string {
  return JSON.stringify({
    이름: row.name,
    소재지: row.address,
    사업자: row.ownerName,
    지역: row.region,
    '면적(제곱미터)': row.areaSqm,
    홀: row.holeCount,
    구분: row.status,
  });
}

export function normalizeFieldGolfCourseItem(raw: unknown): NormalizedFieldGolfCourse | null {
  const record = asRecord(raw);
  const name = readString(record, '이름');
  if (!name) return null;

  const address = readString(record, '소재지');
  const ownerName = readString(record, '사업자');
  const region = readString(record, '지역');
  const status = readString(record, '구분');
  const areaNumber = readNumber(record, '면적(제곱미터)');
  const holeCount = parseHoleCount(readNumber(record, '홀') ?? readString(record, '홀'));
  const district = parseFieldRegion({ region, address });
  const { externalId, idSource } = resolveFieldGolfExternalId({
    name,
    address,
    ownerName,
  });

  const normalized: Omit<NormalizedFieldGolfCourse, 'fingerprint'> = {
    externalSource: ODCLOUD_NATIONAL_GOLF_COURSE_SOURCE,
    externalId,
    idSource,
    name,
    normalizedName: normalizeFieldGolfName(name),
    address,
    roadAddress: null,
    region,
    sido: district.sido,
    sigungu: district.sigungu,
    phone: null,
    ownerName,
    areaSqm: areaNumber == null ? null : String(areaNumber),
    holeCount,
    status,
    latitude: null,
    longitude: null,
    sourceUpdatedAt: null,
  };

  return {
    ...normalized,
    fingerprint: fieldGolfSourceFingerprint({
      name,
      address,
      ownerName,
      region,
      areaSqm: normalized.areaSqm,
      holeCount,
      status,
    }),
  };
}

export type FieldGolfSearchQuery = {
  name?: string;
  sido?: string;
  sigungu?: string;
  page?: number;
  perPage?: number;
};

export function normalizeFieldGolfSearchQuery(input: FieldGolfSearchQuery): {
  name: string | null;
  sido: string | null;
  sigungu: string | null;
  page: number;
  perPage: number;
  skip: number;
} {
  const page = Number.isInteger(input.page) && (input.page ?? 0) > 0 ? Number(input.page) : 1;
  const requested = Number.isInteger(input.perPage) ? Number(input.perPage) : 20;
  const perPage = Math.min(50, Math.max(1, requested));
  return {
    name: input.name?.trim() || null,
    sido: normalizeSido(input.sido?.trim() || null),
    sigungu: input.sigungu?.trim() || null,
    page,
    perPage,
    skip: (page - 1) * perPage,
  };
}

export function resolveFieldGolfUpsertAction(input: {
  existingFingerprint: string | null;
  nextFingerprint: string;
}): 'INSERT' | 'UPDATE' | 'UNCHANGED' {
  if (input.existingFingerprint == null) return 'INSERT';
  return input.existingFingerprint === input.nextFingerprint ? 'UNCHANGED' : 'UPDATE';
}

export const FIELD_FOURSOME_PRESETS = [
  { label: '2v2', teamSize: 2, teamCount: 2 },
  { label: '3v3', teamSize: 3, teamCount: 2 },
] as const;
