/**
 * FIELD destination region SSOT — 시/도 → 시/군 only.
 * SCREEN keeps its own 구-level explore tree. Do not reuse that depth here.
 */

import { ADMIN_SIDO_GROUPS, type AdminSidoGroup } from './admin-districts';
import { normalizeSido } from './region-explore-catalog';

export const FIELD_REGION_MAX_DEPTH = 2;

const DONG_SUFFIX_RE = /(읍|면|동|리)$/;

/** 도 단위 자치구 → 부모 시. 광역시 구는 2단계 city/county로 유지한다. */
const DO_GU_TO_CITY: Record<string, string> = {
  장안구: '수원시',
  권선구: '수원시',
  팔달구: '수원시',
  영통구: '수원시',
  수정구: '성남시',
  중원구: '성남시',
  분당구: '성남시',
  만안구: '안양시',
  동안구: '안양시',
  상록구: '안산시',
  단원구: '안산시',
  덕양구: '고양시',
  일산동구: '고양시',
  일산서구: '고양시',
  처인구: '용인시',
  기흥구: '용인시',
  수지구: '용인시',
  동남구: '천안시',
  서북구: '천안시',
  상당구: '청주시',
  서원구: '청주시',
  흥덕구: '청주시',
  청원구: '청주시',
  완산구: '전주시',
  덕진구: '전주시',
  의창구: '창원시',
  성산구: '창원시',
  마산합포구: '창원시',
  마산회원구: '창원시',
  진해구: '창원시',
};

const DO_SIDO_CODES = new Set([
  '경기도',
  '강원특별자치도',
  '충청북도',
  '충청남도',
  '전북특별자치도',
  '전라남도',
  '경상북도',
  '경상남도',
  '제주특별자치도',
]);

export type FieldProvinceCode = string;

export type FieldCityCounty = {
  province: string;
  cityCounty: string;
  label: string;
};

export type FieldProvinceGroup = {
  province: string;
  label: string;
  displayLabel: string;
  cities: FieldCityCounty[];
};

export type NormalizedFieldRegion = {
  province: string | null;
  cityCounty: string | null;
};

export function isFieldDongFilterToken(value: string | null | undefined): boolean {
  if (!value) return false;
  const token = value.trim();
  if (!token) return false;
  if (/[시군]$/.test(token)) return false;
  return DONG_SUFFIX_RE.test(token);
}

function stripDongTokens(raw: string): string {
  return raw
    .split(/\s+/)
    .filter((token) => token && !isFieldDongFilterToken(token))
    .join(' ')
    .trim();
}

function isDoProvince(province: string | null): boolean {
  return province != null && DO_SIDO_CODES.has(province);
}

export function normalizeFieldCityCounty(
  rawSido: string | null | undefined,
  rawSigungu: string | null | undefined,
): NormalizedFieldRegion {
  const province = normalizeSido(rawSido?.trim() || null);
  if (!province) return { province: null, cityCounty: null };

  const stripped = stripDongTokens((rawSigungu ?? '').trim());
  if (!stripped) return { province, cityCounty: null };

  if (isDoProvince(province)) {
    const tokens = stripped.split(/\s+/).filter(Boolean);
    const last = tokens[tokens.length - 1] ?? stripped;
    if (DO_GU_TO_CITY[last]) {
      return { province, cityCounty: DO_GU_TO_CITY[last] };
    }
    const cityToken = tokens.find((t) => /시$/.test(t) || /군$/.test(t));
    if (cityToken) return { province, cityCounty: cityToken };
    if (/구$/.test(last) && tokens.length > 1) {
      const parent = tokens.find((t) => /시$/.test(t));
      if (parent) return { province, cityCounty: parent };
    }
  }

  return { province, cityCounty: stripped };
}

export function buildFieldRegionCatalog(
  groups: readonly AdminSidoGroup[] = ADMIN_SIDO_GROUPS,
): FieldProvinceGroup[] {
  return groups.map((group) => {
    const province = normalizeSido(group.sido) ?? group.sido;
    const seen = new Set<string>();
    const cities: FieldCityCounty[] = [];
    for (const district of group.districts) {
      const normalized = normalizeFieldCityCounty(district.sido, district.sigungu);
      const cityCounty = normalized.cityCounty;
      if (!cityCounty || seen.has(cityCounty)) continue;
      if (isFieldDongFilterToken(cityCounty)) continue;
      seen.add(cityCounty);
      cities.push({
        province,
        cityCounty,
        label: cityCounty,
      });
    }
    return {
      province,
      label: group.label,
      displayLabel: group.sido,
      cities,
    };
  });
}

export const FIELD_REGION_CATALOG: readonly FieldProvinceGroup[] = buildFieldRegionCatalog();

export function findFieldProvinceGroup(province: string | null | undefined): FieldProvinceGroup | null {
  const canonical = normalizeSido(province?.trim() || null);
  if (!canonical) return null;
  return FIELD_REGION_CATALOG.find((g) => g.province === canonical) ?? null;
}

export function matchesFieldCityCounty(params: {
  rowSido?: string | null;
  rowSigungu?: string | null;
  targetProvince: string;
  targetCityCounty: string;
}): boolean {
  const row = normalizeFieldCityCounty(params.rowSido, params.rowSigungu);
  const target = normalizeFieldCityCounty(params.targetProvince, params.targetCityCounty);
  if (!row.province || !target.province || row.province !== target.province) return false;
  if (!target.cityCounty) return true;
  if (!row.cityCounty) return false;
  return row.cityCounty === target.cityCounty;
}

export function formatFieldCourseRegionLabel(params: {
  sido?: string | null;
  sigungu?: string | null;
}): string | null {
  const normalized = normalizeFieldCityCounty(params.sido, params.sigungu);
  if (!normalized.province) return null;
  if (!normalized.cityCounty) return normalized.province;
  return `${normalized.cityCounty}`;
}

const FIELD_METRO_PROVINCE_RE = /(특별시|광역시|특별자치시)$/;

/** 시/군 only. 구·읍·면·동 are display text, never a FIELD filter step. */
export function isFieldSigunguFilterToken(value: string | null | undefined): boolean {
  if (!value) return false;
  const token = value.trim();
  if (!token) return false;
  if (isFieldDongFilterToken(token)) return false;
  if (/구$/.test(token)) return false;
  return /[시군]$/.test(token);
}

export function isFieldMetroProvince(province: string | null | undefined): boolean {
  const canonical = normalizeSido(province?.trim() || null);
  return canonical != null && FIELD_METRO_PROVINCE_RE.test(canonical);
}

export function listFieldSigunguChoices(
  province: string | null | undefined,
): FieldCityCounty[] {
  const group = findFieldProvinceGroup(province);
  if (!group) return [];
  return group.cities.filter((city) => isFieldSigunguFilterToken(city.cityCounty));
}

/**
 * Sparse metros (서울 등) have almost no FIELD courses per 구.
 * Skip 구 lists and go 시/도 → 코스. 도 단위는 시/군을 고른다.
 */
export function shouldSkipFieldSigunguStep(province: string | null | undefined): boolean {
  if (isFieldMetroProvince(province)) return true;
  return listFieldSigunguChoices(province).length === 0;
}

export type FieldCourseRegionNextStep = 'sigungu' | 'courses';

export function nextFieldCoursePickerStepAfterSido(
  province: string | null | undefined,
): FieldCourseRegionNextStep {
  return shouldSkipFieldSigunguStep(province) ? 'courses' : 'sigungu';
}

/** Card subtitle: `경기 용인시` / `서울`. */
export function formatFieldCourseLocationLine(params: {
  sido?: string | null;
  sigungu?: string | null;
}): string | null {
  const group = findFieldProvinceGroup(params.sido);
  const normalized = normalizeFieldCityCounty(params.sido, params.sigungu);
  if (!normalized.province) return null;
  const sidoLabel = group?.label ?? normalized.province;
  if (!normalized.cityCounty) return sidoLabel;
  return `${sidoLabel} ${normalized.cityCounty}`;
}

export function formatFieldCourseShortAddress(address: string | null | undefined): string | null {
  if (!address?.trim()) return null;
  const tokens = address.trim().split(/\s+/).filter(Boolean);
  if (tokens.length <= 3) return address.trim();
  return tokens.slice(0, 3).join(' ');
}

export function assertFieldRegionHasNoDongStep(catalog = FIELD_REGION_CATALOG): void {
  for (const group of catalog) {
    for (const city of group.cities) {
      if (isFieldDongFilterToken(city.cityCounty)) {
        throw new Error(`FIELD region catalog leaked dong filter: ${city.cityCounty}`);
      }
    }
  }
}
