/**
 * Canonical admin district SSOT for Join Discovery region picker.
 * Keys (sido/sigungu) must match GolfFacility.sido / GolfFacility.sigungu.
 * Expand nationwide by appending rows — do not hardcode lists in UI.
 */

export type AdminDistrict = {
  /** Canonical identity — Korean official name matching DB. */
  sido: string;
  sigungu: string;
  /** Short chip label (usually sigungu). */
  label: string;
};

export type AdminSidoGroup = {
  sido: string;
  label: string;
  districts: AdminDistrict[];
};

const SEOUL_GUS = [
  '종로구',
  '중구',
  '용산구',
  '성동구',
  '광진구',
  '동대문구',
  '중랑구',
  '성북구',
  '강북구',
  '도봉구',
  '노원구',
  '은평구',
  '서대문구',
  '마포구',
  '양천구',
  '강서구',
  '구로구',
  '금천구',
  '영등포구',
  '동작구',
  '관악구',
  '서초구',
  '강남구',
  '송파구',
  '강동구',
] as const;

const GYEONGGI_SIGUNGU = [
  '수원시',
  '성남시',
  '의정부시',
  '안양시',
  '부천시',
  '광명시',
  '평택시',
  '동두천시',
  '안산시',
  '고양시',
  '과천시',
  '구리시',
  '남양주시',
  '오산시',
  '시흥시',
  '군포시',
  '의왕시',
  '하남시',
  '용인시',
  '파주시',
  '이천시',
  '안성시',
  '김포시',
  '화성시',
  '광주시',
  '양주시',
  '포천시',
  '여주시',
  '연천군',
  '가평군',
  '양평군',
] as const;

function districtsFor(sido: string, names: readonly string[]): AdminDistrict[] {
  return names.map((sigungu) => ({
    sido,
    sigungu,
    label: sigungu,
  }));
}

/** MVP seed — Seoul + Gyeonggi. Structure supports nationwide expansion. */
export const ADMIN_SIDO_GROUPS: readonly AdminSidoGroup[] = [
  {
    sido: '서울특별시',
    label: '서울',
    districts: districtsFor('서울특별시', SEOUL_GUS),
  },
  {
    sido: '경기도',
    label: '경기',
    districts: districtsFor('경기도', GYEONGGI_SIGUNGU),
  },
] as const;

export const DEFAULT_REGION_QUICK_PICKS: readonly AdminDistrict[] = [
  { sido: '서울특별시', sigungu: '광진구', label: '광진구' },
  { sido: '서울특별시', sigungu: '성동구', label: '성동구' },
  { sido: '서울특별시', sigungu: '강남구', label: '강남구' },
] as const;

export function listAllAdminDistricts(): AdminDistrict[] {
  return ADMIN_SIDO_GROUPS.flatMap((g) => g.districts);
}

export function findAdminDistrict(
  sido: string,
  sigungu: string,
): AdminDistrict | null {
  return (
    listAllAdminDistricts().find((d) => d.sido === sido && d.sigungu === sigungu) ??
    null
  );
}

export function districtRegionKey(sido: string, sigungu: string): string {
  return `${sido}|${sigungu}`;
}
