/**
 * FIELD golf-course public-data normalize / dedupe — pure domain.
 * Only maps keys that exist on the ODCloud / 문화체육관광부 전국 골프장 현황 payload.
 * Do not invent lat/lng/phone when the source row does not include them.
 */
import { normalizeSido } from './region-explore-catalog';

export const ODCLOUD_NATIONAL_GOLF_COURSE_SOURCE = 'ODCLOUD_NATIONAL_GOLF_COURSE' as const;

export type FieldGolfCourseIdSource = 'SOURCE_ID' | 'LICENSE_OR_BUSINESS' | 'NAME_ADDRESS';

export type NormalizedFieldGolfCourse = {
  externalSource: typeof ODCLOUD_NATIONAL_GOLF_COURSE_SOURCE;
  externalId: string;
  idSource: FieldGolfCourseIdSource;
  name: string;
  normalizedName: string;
  address: string | null;
  roadAddress: string | null;
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

const NAME_KEYS = ['이름', 'name', '업소명', '골프장명'] as const;
const ADDRESS_KEYS = ['소재지', 'address', '주소'] as const;
const ROAD_ADDRESS_KEYS = ['도로명주소', 'roadAddress', '소재지도로명주소'] as const;
const REGION_KEYS = ['지역', 'region'] as const;
const SIDO_KEYS = ['시도', 'sido'] as const;
const SIGUNGU_KEYS = ['시군구', 'sigungu'] as const;
const PHONE_KEYS = ['전화번호', 'phone', 'tel', '연락처'] as const;
const OWNER_KEYS = ['사업자', 'owner', '사업자명'] as const;
const AREA_KEYS = ['면적(제곱미터)', 'area', '면적'] as const;
const HOLE_KEYS = ['홀', 'number of holes', 'holeCount', '홀수'] as const;
const STATUS_KEYS = ['구분', 'type', 'status'] as const;
const LAT_KEYS = ['위도', 'lat', 'latitude'] as const;
const LNG_KEYS = ['경도', 'lng', 'longitude'] as const;
const SOURCE_ID_KEYS = ['id', '연번', '일련번호', '관리번호', 'MNG_NO'] as const;
const LICENSE_KEYS = ['인허가번호', '사업자등록번호', '사업자번호'] as const;
const UPDATED_KEYS = ['데이터기준일', 'sourceUpdatedAt', '기준일'] as const;

function asRecord(raw: unknown): Record<string, unknown> {
  return raw && typeof raw === 'object' && !Array.isArray(raw)
    ? (raw as Record<string, unknown>)
    : {};
}

function firstString(raw: Record<string, unknown>, keys: readonly string[]): string | null {
  for (const key of keys) {
    const value = raw[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  }
  return null;
}

function firstNumber(raw: Record<string, unknown>, keys: readonly string[]): number | null {
  for (const key of keys) {
    const value = raw[key];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim()) {
      const n = Number(value.trim());
      if (Number.isFinite(n)) return n;
    }
  }
  return null;
}

export function normalizeFieldGolfName(value: string): string {
  return value.replace(/\s+/g, '').replace(/[()[\]·.,]/g, '').toLowerCase();
}

export function normalizeFieldGolfAddress(value: string): string {
  return value.replace(/\s+/g, '').toLowerCase();
}

export function parseHoleCount(raw: string | null): number | null {
  if (!raw) return null;
  const match = raw.replace(/,/g, '').match(/(\d{1,3})/);
  if (!match) return null;
  const n = Number(match[1]);
  return Number.isInteger(n) && n > 0 && n <= 72 ? n : null;
}

function parseSigunguFromAddress(address: string, sido: string | null): string | null {
  const tokens = address.split(/\s+/).filter(Boolean);
  if (tokens.length < 2) return null;
  const start = sido && tokens[0] && (normalizeSido(tokens[0]) === sido || tokens[0].includes(sido.slice(0, 2)))
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
  sido: string | null;
  sigungu: string | null;
}): { sido: string | null; sigungu: string | null } {
  if (input.sido || input.sigungu) {
    return {
      sido: normalizeSido(input.sido) ?? input.sido,
      sigungu: input.sigungu,
    };
  }

  if (input.region) {
    const parts = input.region.split(/\s+/).filter(Boolean);
    const sido = normalizeSido(parts[0] ?? null);
    const sigungu = parts.length > 1 ? parts.slice(1).join(' ') : parseSigunguFromAddress(input.address ?? '', sido);
    return { sido, sigungu };
  }

  if (input.address) {
    const parts = input.address.split(/\s+/).filter(Boolean);
    const sido = normalizeSido(parts[0] ?? null);
    return { sido, sigungu: parseSigunguFromAddress(input.address, sido) };
  }

  return { sido: null, sigungu: null };
}

export function resolveFieldGolfExternalId(raw: Record<string, unknown>): {
  externalId: string;
  idSource: FieldGolfCourseIdSource;
} {
  const sourceId = firstString(raw, SOURCE_ID_KEYS);
  if (sourceId) return { externalId: sourceId, idSource: 'SOURCE_ID' };

  const license = firstString(raw, LICENSE_KEYS);
  if (license) return { externalId: license, idSource: 'LICENSE_OR_BUSINESS' };

  const name = firstString(raw, NAME_KEYS) ?? '';
  const address = firstString(raw, ADDRESS_KEYS) ?? firstString(raw, ROAD_ADDRESS_KEYS) ?? '';
  return {
    externalId: `${normalizeFieldGolfName(name)}|${normalizeFieldGolfAddress(address)}`,
    idSource: 'NAME_ADDRESS',
  };
}

export function fieldGolfSourceFingerprint(row: {
  name: string;
  address: string | null;
  roadAddress: string | null;
  sido: string | null;
  sigungu: string | null;
  phone: string | null;
  ownerName: string | null;
  areaSqm: string | null;
  holeCount: number | null;
  status: string | null;
}): string {
  return JSON.stringify({
    name: row.name,
    address: row.address,
    roadAddress: row.roadAddress,
    sido: row.sido,
    sigungu: row.sigungu,
    phone: row.phone,
    ownerName: row.ownerName,
    areaSqm: row.areaSqm,
    holeCount: row.holeCount,
    status: row.status,
  });
}

export function normalizeFieldGolfCourseItem(raw: unknown): NormalizedFieldGolfCourse | null {
  const record = asRecord(raw);
  const name = firstString(record, NAME_KEYS);
  if (!name) return null;

  const address = firstString(record, ADDRESS_KEYS);
  const roadAddress = firstString(record, ROAD_ADDRESS_KEYS);
  const region = firstString(record, REGION_KEYS);
  const district = parseFieldRegion({
    region,
    address: roadAddress ?? address,
    sido: firstString(record, SIDO_KEYS),
    sigungu: firstString(record, SIGUNGU_KEYS),
  });
  const { externalId, idSource } = resolveFieldGolfExternalId(record);
  const holeRaw = firstString(record, HOLE_KEYS);
  const holeCount = parseHoleCount(holeRaw) ?? firstNumber(record, HOLE_KEYS);
  const updatedRaw = firstString(record, UPDATED_KEYS);
  const sourceUpdatedAt = updatedRaw && !Number.isNaN(Date.parse(updatedRaw))
    ? new Date(updatedRaw)
    : null;

  const normalized: Omit<NormalizedFieldGolfCourse, 'fingerprint'> = {
    externalSource: ODCLOUD_NATIONAL_GOLF_COURSE_SOURCE,
    externalId,
    idSource,
    name,
    normalizedName: normalizeFieldGolfName(name),
    address,
    roadAddress,
    sido: district.sido,
    sigungu: district.sigungu,
    phone: firstString(record, PHONE_KEYS),
    ownerName: firstString(record, OWNER_KEYS),
    areaSqm: firstString(record, AREA_KEYS),
    holeCount,
    status: firstString(record, STATUS_KEYS),
    latitude: firstNumber(record, LAT_KEYS),
    longitude: firstNumber(record, LNG_KEYS),
    sourceUpdatedAt,
  };

  return {
    ...normalized,
    fingerprint: fieldGolfSourceFingerprint(normalized),
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
