/**
 * Normalize LOCALDATA raw items → GolfFacility upsert payload.
 * Classification is metadata only — never drops a facility.
 */
import type { LocaldataGolfRawItem } from './localdata-golf-client';

export const LOCALDATA_GOLF_SOURCE = 'LOCALDATA_GOLF_PRACTICE_RANGE' as const;

const MIXED_MARKERS = ['연습장', '실외', '실내', '골프장', '파크', '드라이빙'] as const;
const ACADEMY_MARKERS = ['아카데미', '레슨', '스쿨', '학원'] as const;
const INDOOR_MARKERS = ['실내연습', '인도어'] as const;
const OUTDOOR_MARKERS = ['실외연습', '드라이빙레인지', '드라이빙'] as const;
const PRACTICE_MARKERS = ['골프연습장', '연습장'] as const;

export type NormalizedGolfFacility = {
  source: typeof LOCALDATA_GOLF_SOURCE;
  governmentSourceKey: string;
  managementNo: string;
  localGovernmentCode: string;
  sourceName: string;
  displayName: string;
  normalizedName: string;
  sourcePhone: string | null;
  phone: string | null;
  phoneStatus: 'PRESENT' | 'EMPTY' | 'INVALID';
  sourceRoadAddress: string | null;
  roadAddress: string | null;
  sourceLotAddress: string | null;
  lotAddress: string | null;
  postalCode: string | null;
  sido: string | null;
  sigungu: string | null;
  sourceTmX: number | null;
  sourceTmY: number | null;
  latitude: number | null;
  longitude: number | null;
  coordinateSource: 'GOV_TM_CONVERTED' | 'UNKNOWN';
  coordinateStatus: 'VALID' | 'INVALID' | 'MISSING';
  facilityType:
    | 'SCREEN_GOLF'
    | 'MIXED_GOLF_FACILITY'
    | 'PRACTICE_RANGE'
    | 'GOLF_ACADEMY'
    | 'INDOOR_PRACTICE'
    | 'OUTDOOR_PRACTICE'
    | 'OTHER_GOLF_FACILITY'
    | 'UNKNOWN';
  sportType: 'GOLF' | 'PARK_GOLF';
  hasScreenGolf: 'YES' | 'NO' | 'UNKNOWN';
  screenStatus: 'CONFIRMED' | 'POSSIBLE' | 'UNKNOWN' | 'NON_SCREEN';
  screenConfidence: 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN';
  screenEvidence: string[];
  screenGolfScore: number | null;
  screenCandidate: boolean;
  primaryBrand: 'GOLFZON' | 'SG_GOLF' | 'FRIENDS_SCREEN' | 'OTHER' | 'UNKNOWN';
  screenBrands: string[];
  businessStatusCode: string | null;
  businessStatusName: string | null;
  detailStatusCode: string | null;
  detailStatusName: string | null;
  licenseDate: Date | null;
  closureDate: Date | null;
  isActive: boolean;
  isScreenJoinEligible: boolean;
  exclusionReason: string | null;
  sourceLastModifiedAt: Date | null;
  sourceDataUpdatedAt: Date | null;
  sourceRawJson: LocaldataGolfRawItem;
  needsTmConvert: boolean;
};

function str(v: unknown): string {
  if (v == null) return '';
  return String(v).trim();
}

function collapse(name: string): string {
  return name.replace(/\s+/g, '');
}

function normalizeName(name: string): string {
  return collapse(name).toUpperCase();
}

function parseOptionalFloat(v: unknown): number | null {
  const t = str(v);
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

function parseOptionalDate(v: unknown): Date | null {
  const t = str(v);
  if (!t || t.length < 8) return null;
  const compact = t.replace(/[^0-9]/g, '');
  if (compact.length < 8) return null;
  const y = Number(compact.slice(0, 4));
  const m = Number(compact.slice(4, 6));
  const d = Number(compact.slice(6, 8));
  if (!y || !m || !d) return null;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return Number.isNaN(dt.getTime()) ? null : dt;
}

function parseOptionalDateTime(v: unknown): Date | null {
  const t = str(v);
  if (!t) return null;
  const dt = new Date(t);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

function phoneStatus(phone: string | null): 'PRESENT' | 'EMPTY' | 'INVALID' {
  if (!phone) return 'EMPTY';
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 7) return 'INVALID';
  return 'PRESENT';
}

function isOfficiallyOpen(statusCode: string, statusName: string): boolean {
  return statusCode === '01' || statusName === '영업/정상';
}

function detectBrands(collapsed: string): {
  primary: NormalizedGolfFacility['primaryBrand'];
  brands: string[];
  evidence: string[];
} {
  const brands: string[] = [];
  const evidence: string[] = [];
  const upper = collapsed.toUpperCase();
  if (collapsed.includes('골프존') || upper.includes('GOLFZON')) {
    brands.push('GOLFZON');
    evidence.push('BRAND_GOLFZON');
  }
  if (collapsed.includes('SG골프') || upper.includes('SGGOLF')) {
    brands.push('SG_GOLF');
    evidence.push('BRAND_SG_GOLF');
  }
  if (collapsed.includes('프렌즈스크린')) {
    brands.push('FRIENDS_SCREEN');
    evidence.push('BRAND_FRIENDS_SCREEN');
  }
  if (!brands.length) return { primary: 'UNKNOWN', brands: [], evidence: [] };
  if (brands.length === 1) {
    return {
      primary: brands[0] as NormalizedGolfFacility['primaryBrand'],
      brands,
      evidence,
    };
  }
  return { primary: 'OTHER', brands, evidence };
}

function hasAny(collapsed: string, markers: readonly string[]): boolean {
  return markers.some((m) => collapsed.includes(m));
}

function classify(name: string): Pick<
  NormalizedGolfFacility,
  | 'facilityType'
  | 'sportType'
  | 'hasScreenGolf'
  | 'screenStatus'
  | 'screenConfidence'
  | 'screenEvidence'
  | 'screenGolfScore'
  | 'screenCandidate'
  | 'primaryBrand'
  | 'screenBrands'
  | 'exclusionReason'
  | 'isScreenJoinEligible'
> {
  const collapsed = collapse(name);
  const masked = collapsed.replace(/윈스크린/g, '');
  const { primary, brands, evidence: brandEvidence } = detectBrands(collapsed);

  if (collapsed.includes('파크골프')) {
    return {
      facilityType: 'OTHER_GOLF_FACILITY',
      sportType: 'PARK_GOLF',
      hasScreenGolf: 'UNKNOWN',
      screenStatus: 'UNKNOWN',
      screenConfidence: 'UNKNOWN',
      screenEvidence: brandEvidence,
      screenGolfScore: 0,
      screenCandidate: false,
      primaryBrand: primary,
      screenBrands: brands,
      exclusionReason: 'PARK_GOLF',
      isScreenJoinEligible: false,
    };
  }

  const evidence = [...brandEvidence];
  const strong = masked.includes('스크린골프');
  const generic = collapsed.includes('스크린');
  const outdoorScreen = collapsed.includes('야외스크린');
  const golfzonPark =
    collapsed.includes('골프존파크') || collapsed.toUpperCase().includes('GOLFZONPARK');
  const friends = collapsed.includes('프렌즈스크린');
  const sg = collapsed.includes('SG골프') || collapsed.toUpperCase().includes('SGGOLF');
  const golfzon = collapsed.includes('골프존') || collapsed.toUpperCase().includes('GOLFZON');
  const mixed = hasAny(collapsed, MIXED_MARKERS);
  const academy = hasAny(collapsed, ACADEMY_MARKERS);
  const indoor = hasAny(collapsed, INDOOR_MARKERS);
  const outdoor = hasAny(collapsed, OUTDOOR_MARKERS) && !outdoorScreen;
  const practice = hasAny(collapsed, PRACTICE_MARKERS);

  if (strong) evidence.push('NAME_SCREEN_GOLF');
  else if (generic) evidence.push('NAME_GENERIC_SCREEN');

  let hasScreen: 'YES' | 'UNKNOWN' = 'UNKNOWN';
  let screenStatus: 'CONFIRMED' | 'POSSIBLE' | 'UNKNOWN' = 'UNKNOWN';
  let confidence: 'HIGH' | 'MEDIUM' | 'UNKNOWN' = 'UNKNOWN';

  if (outdoorScreen) {
    hasScreen = 'YES';
    screenStatus = 'POSSIBLE';
    confidence = 'MEDIUM';
  } else if (strong || golfzonPark || friends || sg || (golfzon && !collapsed.includes('윈스크린'))) {
    hasScreen = 'YES';
    screenStatus = 'CONFIRMED';
    confidence = 'HIGH';
  } else if (generic) {
    hasScreen = 'YES';
    screenStatus = 'POSSIBLE';
    confidence = 'MEDIUM';
  }

  let facilityType: NormalizedGolfFacility['facilityType'] = 'OTHER_GOLF_FACILITY';
  if (golfzonPark || friends || (sg && !mixed) || (strong && !mixed)) {
    facilityType = 'SCREEN_GOLF';
  } else if ((strong || generic || golfzon || sg || friends) && mixed) {
    facilityType = 'MIXED_GOLF_FACILITY';
  } else if (academy && !(strong || generic || golfzon)) {
    facilityType = 'GOLF_ACADEMY';
  } else if (indoor && !(strong || generic)) {
    facilityType = 'INDOOR_PRACTICE';
  } else if (outdoor && !(strong || generic)) {
    facilityType = 'OUTDOOR_PRACTICE';
  } else if (practice && !(strong || generic || golfzon)) {
    facilityType = 'PRACTICE_RANGE';
  } else if (golfzon && !mixed) {
    facilityType = 'SCREEN_GOLF';
  } else if (generic && !mixed) {
    facilityType = 'UNKNOWN';
  } else if (!evidence.length) {
    if (academy) facilityType = 'GOLF_ACADEMY';
    else if (indoor) facilityType = 'INDOOR_PRACTICE';
    else if (outdoor) facilityType = 'OUTDOOR_PRACTICE';
    else if (practice) facilityType = 'PRACTICE_RANGE';
    else facilityType = 'OTHER_GOLF_FACILITY';
  } else {
    facilityType = 'UNKNOWN';
  }

  const eligible = hasScreen === 'YES' && screenStatus === 'CONFIRMED';
  return {
    facilityType,
    sportType: 'GOLF',
    hasScreenGolf: hasScreen,
    screenStatus,
    screenConfidence: confidence,
    screenEvidence: [...new Set(evidence)],
    screenGolfScore: strong ? 50 : 0,
    screenCandidate: false,
    primaryBrand: primary,
    screenBrands: brands,
    exclusionReason: null,
    isScreenJoinEligible: eligible,
  };
}

function guessSidoSigungu(road: string | null, lot: string | null): {
  sido: string | null;
  sigungu: string | null;
} {
  const addr = road || lot || '';
  const parts = addr.split(/\s+/).filter(Boolean);
  if (parts.length < 2) return { sido: parts[0] ?? null, sigungu: null };
  return { sido: parts[0] ?? null, sigungu: parts[1] ?? null };
}

export function normalizeLocaldataGolfItem(
  raw: LocaldataGolfRawItem,
): NormalizedGolfFacility | null {
  const localGovernmentCode = str(raw.OPN_ATMY_GRP_CD);
  const managementNo = str(raw.MNG_NO);
  if (!localGovernmentCode || !managementNo) return null;

  const sourceName = str(raw.BPLC_NM) || `(unnamed-${managementNo})`;
  const phone = str(raw.TELNO) || null;
  const road = str(raw.ROAD_NM_ADDR) || null;
  const lot = str(raw.LOTNO_ADDR) || null;
  const statusCode = str(raw.SALS_STTS_CD);
  const statusName = str(raw.SALS_STTS_NM);
  const tmX = parseOptionalFloat(raw.CRD_INFO_X);
  const tmY = parseOptionalFloat(raw.CRD_INFO_Y);
  const classified = classify(sourceName);
  const { sido, sigungu } = guessSidoSigungu(road, lot);

  return {
    source: LOCALDATA_GOLF_SOURCE,
    governmentSourceKey: `${localGovernmentCode}:${managementNo}`,
    managementNo,
    localGovernmentCode,
    sourceName,
    displayName: sourceName,
    normalizedName: normalizeName(sourceName),
    sourcePhone: phone,
    phone,
    phoneStatus: phoneStatus(phone),
    sourceRoadAddress: road,
    roadAddress: road,
    sourceLotAddress: lot,
    lotAddress: lot,
    postalCode: str(raw.ROAD_NM_ZIP) || str(raw.LCTN_ZIP) || null,
    sido,
    sigungu,
    sourceTmX: tmX,
    sourceTmY: tmY,
    latitude: null,
    longitude: null,
    coordinateSource: 'UNKNOWN',
    coordinateStatus: tmX != null && tmY != null ? 'MISSING' : 'MISSING',
    ...classified,
    businessStatusCode: statusCode || null,
    businessStatusName: statusName || null,
    detailStatusCode: str(raw.DTL_SALS_STTS_CD) || null,
    detailStatusName: str(raw.DTL_SALS_STTS_NM) || null,
    licenseDate: parseOptionalDate(raw.LCPMT_YMD),
    closureDate: parseOptionalDate(raw.CLSBIZ_YMD),
    isActive: isOfficiallyOpen(statusCode, statusName),
    sourceLastModifiedAt: parseOptionalDateTime(raw.LAST_MDFCN_PNT),
    sourceDataUpdatedAt: parseOptionalDateTime(raw.DAT_UPDT_PNT),
    sourceRawJson: raw,
    needsTmConvert: tmX != null && tmY != null,
  };
}

export function applyTmConversion(
  row: NormalizedGolfFacility,
  lat: number | null,
  lng: number | null,
  ok: boolean,
): NormalizedGolfFacility {
  if (!ok || lat == null || lng == null) {
    return {
      ...row,
      latitude: null,
      longitude: null,
      coordinateSource: 'UNKNOWN',
      coordinateStatus: row.needsTmConvert ? 'INVALID' : 'MISSING',
    };
  }
  return {
    ...row,
    latitude: lat,
    longitude: lng,
    coordinateSource: 'GOV_TM_CONVERTED',
    coordinateStatus: 'VALID',
  };
}
