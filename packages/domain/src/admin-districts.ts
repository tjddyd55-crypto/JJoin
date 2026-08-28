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

const INCHEON_SIGUNGU = [
  '중구', '동구', '미추홀구', '연수구', '남동구', '부평구', '계양구', '서구', '강화군', '옹진군',
  '서해구', '검단구', '영종구', '제물포구',
] as const;

const BUSAN_SIGUNGU = [
  '중구', '서구', '동구', '영도구', '부산진구', '동래구', '남구', '북구', '해운대구', '사하구',
  '금정구', '강서구', '연제구', '수영구', '사상구', '기장군',
] as const;

const DAEGU_SIGUNGU = [
  '중구', '동구', '서구', '남구', '북구', '수성구', '달서구', '달성군', '군위군',
] as const;

const GWANGJU_SIGUNGU = [
  '동구', '서구', '남구', '북구', '광산구',
] as const;

const DAEJEON_SIGUNGU = [
  '동구', '중구', '서구', '유성구', '대덕구',
] as const;

const ULSAN_SIGUNGU = [
  '중구', '남구', '동구', '북구', '울주군',
] as const;

const GANGWON_SIGUNGU = [
  '춘천시', '원주시', '강릉시', '동해시', '태백시', '속초시', '삼척시', '홍천군', '횡성군',
  '영월군', '평창군', '정선군', '철원군', '화천군', '양구군', '인제군', '고성군', '양양군',
] as const;

const CHUNGBUK_SIGUNGU = [
  '청주시', '충주시', '제천시', '보은군', '옥천군', '영동군', '증평군', '진천군', '괴산군', '음성군', '단양군',
] as const;

const CHUNGNAM_SIGUNGU = [
  '천안시', '공주시', '보령시', '아산시', '서산시', '논산시', '계룡시', '당진시', '금산군', '부여군',
  '서천군', '청양군', '홍성군', '예산군', '태안군',
] as const;

const JEONBUK_SIGUNGU = [
  '전주시', '군산시', '익산시', '정읍시', '남원시', '김제시', '완주군', '진안군', '무주군', '장수군',
  '임실군', '순창군', '고창군', '부안군',
] as const;

const JEONNAM_SIGUNGU = [
  '목포시', '여수시', '순천시', '나주시', '광양시', '담양군', '곡성군', '구례군', '고흥군', '보성군',
  '화순군', '장흥군', '강진군', '해남군', '영암군', '무안군', '함평군', '영광군', '장성군', '완도군',
  '진도군', '신안군',
] as const;

const GYEONGBUK_SIGUNGU = [
  '포항시', '경주시', '김천시', '안동시', '구미시', '영주시', '영천시', '상주시', '문경시', '경산시',
  '의성군', '청송군', '영양군', '영덕군', '청도군', '고령군', '성주군', '칠곡군', '예천군', '봉화군',
  '울진군', '울릉군',
] as const;

const GYEONGNAM_SIGUNGU = [
  '창원시', '진주시', '통영시', '사천시', '김해시', '밀양시', '거제시', '양산시', '의령군', '함안군',
  '창녕군', '고성군', '남해군', '하동군', '산청군', '함양군', '거창군', '합천군',
] as const;

const JEJU_SIGUNGU = ['제주시', '서귀포시'] as const;

/** Nationwide admin districts — keys match GolfFacility.sido / sigungu where available. */
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
  {
    sido: '인천광역시',
    label: '인천',
    districts: districtsFor('인천광역시', INCHEON_SIGUNGU),
  },
  {
    sido: '부산광역시',
    label: '부산',
    districts: districtsFor('부산광역시', BUSAN_SIGUNGU),
  },
  {
    sido: '대구광역시',
    label: '대구',
    districts: districtsFor('대구광역시', DAEGU_SIGUNGU),
  },
  {
    sido: '광주광역시',
    label: '광주',
    districts: districtsFor('광주광역시', GWANGJU_SIGUNGU),
  },
  {
    sido: '대전광역시',
    label: '대전',
    districts: districtsFor('대전광역시', DAEJEON_SIGUNGU),
  },
  {
    sido: '울산광역시',
    label: '울산',
    districts: districtsFor('울산광역시', ULSAN_SIGUNGU),
  },
  {
    sido: '세종특별자치시',
    label: '세종',
    districts: [{ sido: '세종특별자치시', sigungu: '세종특별자치시', label: '세종' }],
  },
  {
    sido: '강원특별자치도',
    label: '강원',
    districts: districtsFor('강원특별자치도', GANGWON_SIGUNGU),
  },
  {
    sido: '충청북도',
    label: '충북',
    districts: districtsFor('충청북도', CHUNGBUK_SIGUNGU),
  },
  {
    sido: '충청남도',
    label: '충남',
    districts: districtsFor('충청남도', CHUNGNAM_SIGUNGU),
  },
  {
    sido: '전북특별자치도',
    label: '전북',
    districts: districtsFor('전북특별자치도', JEONBUK_SIGUNGU),
  },
  {
    sido: '전라남도',
    label: '전남',
    districts: districtsFor('전라남도', JEONNAM_SIGUNGU),
  },
  {
    sido: '경상북도',
    label: '경북',
    districts: districtsFor('경상북도', GYEONGBUK_SIGUNGU),
  },
  {
    sido: '경상남도',
    label: '경남',
    districts: districtsFor('경상남도', GYEONGNAM_SIGUNGU),
  },
  {
    sido: '제주특별자치도',
    label: '제주',
    districts: districtsFor('제주특별자치도', JEJU_SIGUNGU),
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
