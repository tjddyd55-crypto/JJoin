/**
 * LOCALDATA golf CRD_INFO_X/Y CRS.
 *
 * Public portal labels the field as "EPSG:5174" (보정계수 없는 Bessel 중부원점TM),
 * but the definition that matches address geocode in Seoul (~4m) is EPSG:2097
 * (Korean 1985 / Central Belt): lon_0 = 127°00'10.4051"E with Bessel + towgs84.
 *
 * Using EPSG:5174 (lon_0=127 exactly) produced a systematic ~250m westward offset.
 */
import proj4 from 'proj4';

export const GOLF_TM_CRS = 'EPSG:2097' as const;

/** Proven against Kakao address geocode (아차산/NK samples, 2026-08). */
export const GOLF_TM_PROJ4 =
  '+proj=tmerc +lat_0=38 +lon_0=127.0028902777778 +k=1 +x_0=200000 +y_0=500000 +ellps=bessel +units=m +no_defs +towgs84=-115.80,474.99,674.11,1.16,-2.31,-1.63,6.43';

/** Legacy incorrect definition previously used in sync (kept for audit diffs). */
export const GOLF_TM_PROJ4_LEGACY_5174 =
  '+proj=tmerc +lat_0=38 +lon_0=127 +k=1 +x_0=200000 +y_0=500000 +ellps=bessel +units=m +no_defs +towgs84=-115.80,474.99,674.11,1.16,-2.31,-1.63,6.43';

proj4.defs(GOLF_TM_CRS, GOLF_TM_PROJ4);
proj4.defs('EPSG:5174_LEGACY_JJOIN', GOLF_TM_PROJ4_LEGACY_5174);

const KR_LAT = [33, 39] as const;
const KR_LNG = [124, 132] as const;

export type TmConvertResult = { lat: number; lng: number; ok: boolean };

export function convertGolfTmToWgs84(tmX: number, tmY: number): TmConvertResult {
  try {
    const [lng, lat] = proj4(GOLF_TM_CRS, 'EPSG:4326', [tmX, tmY]) as [number, number];
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

/** Previous (incorrect) transform — for dry-run distance buckets only. */
export function convertGolfTmLegacy5174(tmX: number, tmY: number): TmConvertResult {
  try {
    const [lng, lat] = proj4('EPSG:5174_LEGACY_JJOIN', 'EPSG:4326', [tmX, tmY]) as [
      number,
      number,
    ];
    const ok = Number.isFinite(lat) && Number.isFinite(lng);
    return { lat, lng, ok };
  } catch {
    return { lat: 0, lng: 0, ok: false };
  }
}

export function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/** Compare addresses ignoring floor/building parenthetical noise. */
export function normalizeAddressForCompare(addr: string | null | undefined): string {
  if (!addr) return '';
  return addr
    .replace(/\([^)]*\)/g, ' ')
    .replace(/지하\s*\d*층?/g, ' ')
    .replace(/지층/g, ' ')
    .replace(/\d+\s*층/g, ' ')
    .replace(/특별자치시|특별시|광역시|특별자치도|자치도/g, '')
    .replace(/,/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}
