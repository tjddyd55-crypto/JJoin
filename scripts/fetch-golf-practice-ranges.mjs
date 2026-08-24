/**
 * Fetch all active (SALS_STTS_CD=01) golf practice ranges from
 * 행정안전부 생활_골프연습장업 OpenAPI, normalize, and classify screen-golf candidates.
 *
 * Usage (repo root):
 *   node --env-file=.env.local scripts/fetch-golf-practice-ranges.mjs
 *
 * Never logs or writes DATA_GO_KR_SERVICE_KEY.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'data', 'golf-practice-ranges');

const ENDPOINT =
  'https://apis.data.go.kr/1741000/golf_practice_ranges/info';
const PAGE_SIZE = 100;
const PAGE_DELAY_MS = 180;
const MAX_RETRIES = 3;
const SOURCE_LABEL = '행정안전부 생활_골프연습장업';

/** Screen-golf candidate scoring (tunable constants). */
const SCREEN_SCORE = {
  NAME_CONTAINS_SCREEN_GOLF: 100,
  BRAND_GOLFZON: 80,
  BRAND_SG_GOLF: 80,
  BRAND_FRIENDS_SCREEN: 80,
  BRAND_KAKAO_VX: 80,
  NAME_CONTAINS_SCREEN: 50,
  NAME_CONTAINS_GOLFZON_VISION: 50,
  NAME_CONTAINS_VISION_GOLF: 50,
  NAME_CONTAINS_SCREEN_RANGE: 50,
  OUTDOOR_SCREEN_PENALTY: -30,
};

const CANDIDATE_THRESHOLD = 50;
const BORDERLINE_MIN = 40;
const BORDERLINE_MAX = 79;

const SIDO_PREFIXES = [
  '서울특별시',
  '부산광역시',
  '대구광역시',
  '인천광역시',
  '광주광역시',
  '대전광역시',
  '울산광역시',
  '세종특별자치시',
  '경기도',
  '강원특별자치도',
  '강원도',
  '충청북도',
  '충청남도',
  '전북특별자치도',
  '전라북도',
  '전라남도',
  '경상북도',
  '경상남도',
  '제주특별자치도',
  // 공공데이터 일부 주소에 등장하는 통합 표기
  '전남광주통합특별시',
];

/** 광주광역시 자치구 (전남광주통합특별시 표기 분해용) */
const GWANGJU_DISTRICTS = ['동구', '서구', '남구', '북구', '광산구'];

const SIDO_REPORT_ORDER = [
  '서울특별시',
  '부산광역시',
  '대구광역시',
  '인천광역시',
  '광주광역시',
  '대전광역시',
  '울산광역시',
  '세종특별자치시',
  '경기도',
  '강원특별자치도',
  '충청북도',
  '충청남도',
  '전북특별자치도',
  '전라남도',
  '경상북도',
  '경상남도',
  '제주특별자치도',
];

function loadServiceKey() {
  const raw = (process.env.DATA_GO_KR_SERVICE_KEY ?? '').trim();
  if (!raw) {
    console.error('DATA_GO_KR_SERVICE_KEY가 설정되어 있지 않습니다.');
    process.exit(1);
  }
  return raw;
}

function appendServiceKey(url, serviceKey) {
  const sep = url.includes('?') ? '&' : '?';
  if (serviceKey.includes('%')) {
    return `${url}${sep}serviceKey=${serviceKey}`;
  }
  return `${url}${sep}serviceKey=${encodeURIComponent(serviceKey)}`;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildPageUrl(serviceKey, pageNo) {
  const qs = new URLSearchParams();
  qs.set('pageNo', String(pageNo));
  qs.set('numOfRows', String(PAGE_SIZE));
  qs.set('returnType', 'json');
  qs.set('cond[SALS_STTS_CD::EQ]', '01');
  return appendServiceKey(`${ENDPOINT}?${qs.toString()}`, serviceKey);
}

function asItemArray(itemsNode) {
  if (itemsNode == null) return [];
  if (Array.isArray(itemsNode)) return itemsNode;
  if (typeof itemsNode === 'object' && itemsNode.item != null) {
    return asItemArray(itemsNode.item);
  }
  if (typeof itemsNode === 'object') return [itemsNode];
  return [];
}

function isRetryableStatus(status) {
  return status === 429 || status >= 500;
}

async function fetchPage(serviceKey, pageNo) {
  const url = buildPageUrl(serviceKey, pageNo);
  let lastError;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });
      const text = await res.text();

      if (!res.ok) {
        if (isRetryableStatus(res.status) && attempt < MAX_RETRIES) {
          const wait = 1000 * 2 ** attempt;
          console.warn(
            `page=${pageNo} HTTP ${res.status} — retry ${attempt + 1}/${MAX_RETRIES} in ${wait}ms`,
          );
          await sleep(wait);
          continue;
        }
        throw new Error(`page=${pageNo} HTTP ${res.status}: ${text.slice(0, 200)}`);
      }

      let json;
      try {
        json = JSON.parse(text);
      } catch {
        throw new Error(`page=${pageNo} JSON parse failed: ${text.slice(0, 200)}`);
      }

      const header = json?.response?.header;
      const body = json?.response?.body;
      const resultCode = header?.resultCode != null ? String(header.resultCode) : '';

      if (resultCode !== '0') {
        const msg = header?.resultMsg ?? 'unknown';
        // Auth / param errors: do not retry endlessly
        if (resultCode === '-11' || resultCode === '12' || /^4/.test(String(res.status))) {
          throw new Error(`page=${pageNo} API error resultCode=${resultCode} msg=${msg}`);
        }
        if (attempt < MAX_RETRIES) {
          const wait = 1000 * 2 ** attempt;
          console.warn(
            `page=${pageNo} resultCode=${resultCode} — retry ${attempt + 1}/${MAX_RETRIES} in ${wait}ms`,
          );
          await sleep(wait);
          continue;
        }
        throw new Error(`page=${pageNo} API error resultCode=${resultCode} msg=${msg}`);
      }

      const items = asItemArray(body?.items?.item ?? body?.items);
      return {
        pageNo: Number(body?.pageNo ?? pageNo),
        numOfRows: Number(body?.numOfRows ?? items.length),
        totalCount: Number(body?.totalCount ?? 0),
        items,
      };
    } catch (err) {
      lastError = err;
      const message = err instanceof Error ? err.message : String(err);
      const networkLike =
        /fetch failed|ECONNRESET|ETIMEDOUT|ENOTFOUND|network|socket/i.test(message);
      if (networkLike && attempt < MAX_RETRIES) {
        const wait = 1000 * 2 ** attempt;
        console.warn(
          `page=${pageNo} network error — retry ${attempt + 1}/${MAX_RETRIES} in ${wait}ms`,
        );
        await sleep(wait);
        continue;
      }
      throw err;
    }
  }

  throw lastError ?? new Error(`page=${pageNo} failed`);
}

function str(value) {
  if (value == null) return '';
  return String(value).trim();
}

function buildSourceId(raw) {
  const local = str(raw.OPN_ATMY_GRP_CD);
  const mgt = str(raw.MNG_NO);
  return `${local}:${mgt}`;
}

function normalizePhone(phoneRaw) {
  const raw = str(phoneRaw);
  if (!raw) {
    return { phoneRaw: '', phoneNormalized: '', phoneStatus: 'EMPTY' };
  }

  const compact = raw.replace(/[^\d]/g, '');
  // Keep hyphens as-is for display when already well-formed; else rebuild lightly
  let normalized = raw.replace(/\s+/g, '');

  // Korean landline / mobile patterns (digits only)
  const validPatterns = [
    /^02\d{7,8}$/, // Seoul
    /^0[3-6]\d{8,9}$/, // area codes
    /^070\d{7,8}$/,
    /^01[016789]\d{7,8}$/, // mobile
  ];

  const looksValidDigits = validPatterns.some((re) => re.test(compact));

  if (looksValidDigits) {
    // Prefer original punctuation if it already looks clean
    if (/^0\d{1,2}-?\d{3,4}-?\d{4}$/.test(normalized.replace(/\s/g, ''))) {
      return { phoneRaw: raw, phoneNormalized: normalized, phoneStatus: 'VALID' };
    }
    return { phoneRaw: raw, phoneNormalized: compact, phoneStatus: 'VALID' };
  }

  // Local number without area code (e.g. 123-4567, 1234-5678)
  if (/^\d{3,4}-?\d{4}$/.test(normalized) || /^\d{7,8}$/.test(compact)) {
    return {
      phoneRaw: raw,
      phoneNormalized: normalized,
      phoneStatus: 'MISSING_AREA_CODE',
    };
  }

  return {
    phoneRaw: raw,
    phoneNormalized: normalized,
    phoneStatus: 'INVALID_FORMAT',
  };
}

function classifyScreenGolf(name) {
  const n = str(name);
  const upper = n.toUpperCase();
  const reasons = [];
  let score = 0;
  let brandCandidate = 'UNKNOWN';

  const hasScreenGolf =
    n.includes('스크린골프') || n.includes('스크린 골프') || upper.includes('SCREEN GOLF');
  const hasOutdoorScreen = n.includes('야외스크린') || n.includes('야외 스크린');
  const hasGolfzon =
    n.includes('골프존') ||
    upper.includes('GOLFZON') ||
    n.includes('골프존파크') ||
    upper.includes('GOLFZON PARK');
  const hasSg =
    n.includes('SG골프') ||
    upper.includes('SG GOLF') ||
    upper.includes('SG골프') ||
    /\bSG\s*GOLF\b/i.test(n);
  const hasFriends =
    n.includes('프렌즈스크린') ||
    n.includes('프렌즈 스크린') ||
    upper.includes('FRIENDS SCREEN');
  const hasKakaoVx = n.includes('카카오VX') || upper.includes('KAKAO VX') || upper.includes('KAKAOVX');
  const hasScreenAlone = n.includes('스크린') && !hasScreenGolf;
  const hasGolfzonVision = n.includes('골프존비전') || upper.includes('GOLFZON VISION');
  const hasVisionGolf = n.includes('비전골프');
  const hasScreenRange = n.includes('스크린연습장') || n.includes('스크린 연습장');

  // Generic names alone are not screen
  const onlyGeneric =
    /^(.*(골프연습장|골프아카데미|골프클럽|골프스쿨).*)$/.test(n) &&
    !hasScreenGolf &&
    !hasScreenAlone &&
    !hasGolfzon &&
    !hasSg &&
    !hasFriends &&
    !hasKakaoVx &&
    !hasGolfzonVision &&
    !hasVisionGolf &&
    !hasScreenRange;

  if (onlyGeneric) {
    return {
      screenGolfCandidate: false,
      screenGolfScore: 0,
      screenGolfReasons: ['GENERIC_RANGE_NAME_ONLY'],
      brandCandidate: 'UNKNOWN',
    };
  }

  if (hasScreenGolf) {
    score += SCREEN_SCORE.NAME_CONTAINS_SCREEN_GOLF;
    reasons.push('NAME_CONTAINS_SCREEN_GOLF');
  }
  if (hasGolfzon) {
    score += SCREEN_SCORE.BRAND_GOLFZON;
    reasons.push('BRAND_GOLFZON');
    brandCandidate = 'GOLFZON';
  }
  if (hasSg) {
    score += SCREEN_SCORE.BRAND_SG_GOLF;
    reasons.push('BRAND_SG_GOLF');
    if (brandCandidate === 'UNKNOWN') brandCandidate = 'SG_GOLF';
  }
  if (hasFriends) {
    score += SCREEN_SCORE.BRAND_FRIENDS_SCREEN;
    reasons.push('BRAND_FRIENDS_SCREEN');
    if (brandCandidate === 'UNKNOWN') brandCandidate = 'FRIENDS_SCREEN';
  }
  if (hasKakaoVx) {
    score += SCREEN_SCORE.BRAND_KAKAO_VX;
    reasons.push('BRAND_KAKAO_VX');
    if (brandCandidate === 'UNKNOWN') brandCandidate = 'OTHER';
  }
  if (hasGolfzonVision) {
    score += SCREEN_SCORE.NAME_CONTAINS_GOLFZON_VISION;
    reasons.push('NAME_CONTAINS_GOLFZON_VISION');
    if (brandCandidate === 'UNKNOWN') brandCandidate = 'GOLFZON';
  }
  if (hasVisionGolf) {
    score += SCREEN_SCORE.NAME_CONTAINS_VISION_GOLF;
    reasons.push('NAME_CONTAINS_VISION_GOLF');
    if (brandCandidate === 'UNKNOWN') brandCandidate = 'OTHER';
  }
  if (hasScreenRange) {
    score += SCREEN_SCORE.NAME_CONTAINS_SCREEN_RANGE;
    reasons.push('NAME_CONTAINS_SCREEN_RANGE');
    if (brandCandidate === 'UNKNOWN') brandCandidate = 'OTHER';
  }
  if (hasScreenAlone && !hasScreenGolf) {
    score += SCREEN_SCORE.NAME_CONTAINS_SCREEN;
    reasons.push('NAME_CONTAINS_SCREEN');
    if (brandCandidate === 'UNKNOWN') brandCandidate = 'OTHER';
  }
  if (hasOutdoorScreen) {
    score += SCREEN_SCORE.OUTDOOR_SCREEN_PENALTY;
    reasons.push('OUTDOOR_SCREEN');
    // keep candidate if score still high, but never treat as indoor-confirmed
  }

  if (brandCandidate === 'UNKNOWN' && score >= CANDIDATE_THRESHOLD) {
    brandCandidate = 'OTHER';
  }

  const screenGolfCandidate = score >= CANDIDATE_THRESHOLD;

  return {
    screenGolfCandidate,
    screenGolfScore: score,
    screenGolfReasons: reasons.length ? reasons : ['NO_SCREEN_SIGNAL'],
    brandCandidate: screenGolfCandidate ? brandCandidate : brandCandidate === 'UNKNOWN' ? 'UNKNOWN' : brandCandidate,
  };
}

function parseSido(address) {
  const addr = str(address);
  for (const prefix of SIDO_PREFIXES) {
    if (!addr.startsWith(prefix)) continue;
    if (prefix === '강원도') return '강원특별자치도';
    if (prefix === '전라북도') return '전북특별자치도';
    if (prefix === '전남광주통합특별시') {
      const rest = addr.slice(prefix.length).trim();
      const isGwangju = GWANGJU_DISTRICTS.some(
        (d) => rest.startsWith(d) || rest.startsWith(`광주${d}`),
      );
      return isGwangju ? '광주광역시' : '전라남도';
    }
    return prefix;
  }
  return '기타/미상';
}

function normalizeRecord(raw) {
  const phone = normalizePhone(raw.TELNO);
  const screen = classifyScreenGolf(raw.BPLC_NM);
  const roadAddress = str(raw.ROAD_NM_ADDR);
  const lotAddress = str(raw.LOTNO_ADDR);
  const sido = parseSido(roadAddress || lotAddress);

  return {
    sourceId: buildSourceId(raw),
    managementNo: str(raw.MNG_NO),
    name: str(raw.BPLC_NM),
    phone: phone.phoneNormalized || phone.phoneRaw,
    phoneRaw: phone.phoneRaw,
    phoneNormalized: phone.phoneNormalized,
    phoneStatus: phone.phoneStatus,
    roadAddress,
    lotAddress,
    postalCode: str(raw.ROAD_NM_ZIP) || str(raw.LCTN_ZIP),
    businessStatusCode: str(raw.SALS_STTS_CD),
    businessStatusName: str(raw.SALS_STTS_NM),
    detailStatusCode: str(raw.DTL_SALS_STTS_CD),
    detailStatusName: str(raw.DTL_SALS_STTS_NM),
    licenseDate: str(raw.LCPMT_YMD),
    closureDate: str(raw.CLSBIZ_YMD),
    localGovernmentCode: str(raw.OPN_ATMY_GRP_CD),
    tmX: str(raw.CRD_INFO_X),
    tmY: str(raw.CRD_INFO_Y),
    lastModifiedAt: str(raw.LAST_MDFCN_PNT),
    dataUpdatedAt: str(raw.DAT_UPDT_PNT),
    sido,
    screenGolfCandidate: screen.screenGolfCandidate,
    screenGolfScore: screen.screenGolfScore,
    screenGolfReasons: screen.screenGolfReasons,
    brandCandidate: screen.brandCandidate,
    raw,
  };
}

function countDuplicates(rows, keyFn) {
  const map = new Map();
  for (const row of rows) {
    const key = keyFn(row);
    if (!key) continue;
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  let duplicateKeys = 0;
  let duplicateRows = 0;
  for (const count of map.values()) {
    if (count > 1) {
      duplicateKeys += 1;
      duplicateRows += count;
    }
  }
  return { uniqueKeys: map.size, duplicateKeys, duplicateRows };
}

function csvEscape(value) {
  const s = value == null ? '' : String(value);
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function toCsv(rows, columns) {
  const header = columns.map((c) => csvEscape(c)).join(',');
  const lines = rows.map((row) =>
    columns
      .map((col) => {
        const v = row[col];
        if (Array.isArray(v)) return csvEscape(v.join('|'));
        if (v && typeof v === 'object') return csvEscape(JSON.stringify(v));
        return csvEscape(v);
      })
      .join(','),
  );
  return `${header}\n${lines.join('\n')}\n`;
}

function pickSamples(rows, count) {
  if (rows.length <= count) return rows.slice();
  const bySido = new Map();
  for (const row of rows) {
    const list = bySido.get(row.sido) ?? [];
    list.push(row);
    bySido.set(row.sido, list);
  }
  const picked = [];
  const sidod = [...bySido.keys()];
  let i = 0;
  while (picked.length < count && sidod.length) {
    const sido = sidod[i % sidod.length];
    const list = bySido.get(sido);
    if (list?.length) {
      picked.push(list.shift());
    } else {
      sidod.splice(i % sidod.length, 1);
      continue;
    }
    i += 1;
  }
  return picked;
}

function printReport({
  apiTotalCount,
  collected,
  pageCount,
  dupA,
  dupB,
  dupC,
  normalized,
  candidates,
}) {
  const withPhone = normalized.filter((r) => r.phoneStatus !== 'EMPTY').length;
  const withRoad = normalized.filter((r) => r.roadAddress).length;
  const withTm = normalized.filter((r) => r.tmX && r.tmY).length;

  console.log('\n## 전국 영업중 골프연습장');
  console.log(`API totalCount: ${apiTotalCount}`);
  console.log(`실제 수집건수: ${collected}`);
  console.log(`페이지 수: ${pageCount}`);
  console.log(`중복 제거 전: ${collected}`);
  console.log(
    `중복 제거 후: ${collected} (A sourceId 중복키=${dupA.duplicateKeys}, 중복행=${dupA.duplicateRows} — 삭제하지 않음)`,
  );
  console.log(`A OPN_ATMY_GRP_CD+MNG_NO: unique=${dupA.uniqueKeys} dupKeys=${dupA.duplicateKeys} dupRows=${dupA.duplicateRows}`);
  console.log(`B name+roadAddress: unique=${dupB.uniqueKeys} dupKeys=${dupB.duplicateKeys} dupRows=${dupB.duplicateRows}`);
  console.log(`C name+lotAddress: unique=${dupC.uniqueKeys} dupKeys=${dupC.duplicateKeys} dupRows=${dupC.duplicateRows}`);

  console.log('\n## 데이터 품질');
  console.log(`전화번호 있음: ${withPhone}`);
  console.log(`전화번호 없음: ${normalized.length - withPhone}`);
  console.log(`도로명주소 있음: ${withRoad}`);
  console.log(`도로명주소 없음: ${normalized.length - withRoad}`);
  console.log(`TM 좌표 있음: ${withTm}`);
  console.log(`TM 좌표 없음: ${normalized.length - withTm}`);

  const brandCounts = { GOLFZON: 0, SG_GOLF: 0, FRIENDS_SCREEN: 0, OTHER: 0, UNKNOWN: 0 };
  const sidoCounts = Object.fromEntries(SIDO_REPORT_ORDER.map((s) => [s, 0]));
  sidoCounts['기타/미상'] = 0;
  for (const c of candidates) {
    brandCounts[c.brandCandidate] = (brandCounts[c.brandCandidate] ?? 0) + 1;
    sidoCounts[c.sido] = (sidoCounts[c.sido] ?? 0) + 1;
  }

  console.log('\n## 스크린골프 후보');
  console.log(`후보 총 건수: ${candidates.length}`);
  console.log('브랜드별:');
  for (const [k, v] of Object.entries(brandCounts)) console.log(`- ${k}: ${v}`);
  console.log('지역별 후보 건수:');
  for (const sido of SIDO_REPORT_ORDER) {
    console.log(`${sido}: ${sidoCounts[sido] ?? 0}`);
  }
  if (sidoCounts['기타/미상']) console.log(`기타/미상: ${sidoCounts['기타/미상']}`);

  console.log('\n## 판별 예시 (다양 지역 최대 20)');
  for (const row of pickSamples(candidates, 20)) {
    console.log(
      JSON.stringify({
        name: row.name,
        brand: row.brandCandidate,
        score: row.screenGolfScore,
        reason: row.screenGolfReasons,
        address: row.roadAddress || row.lotAddress,
        phone: row.phoneRaw,
      }),
    );
  }

  const borderline = normalized
    .filter((r) => r.screenGolfScore >= BORDERLINE_MIN && r.screenGolfScore <= BORDERLINE_MAX)
    .sort((a, b) => b.screenGolfScore - a.screenGolfScore);
  console.log(`\n## 애매한 후보 (score ${BORDERLINE_MIN}-${BORDERLINE_MAX}, 최대 20)`);
  for (const row of borderline.slice(0, 20)) {
    console.log(
      JSON.stringify({
        name: row.name,
        brand: row.brandCandidate,
        score: row.screenGolfScore,
        candidate: row.screenGolfCandidate,
        reason: row.screenGolfReasons,
        address: row.roadAddress || row.lotAddress,
        phone: row.phoneRaw,
      }),
    );
  }
}

async function main() {
  const serviceKey = process.env.REPROCESS_FROM_RAW === '1' ? null : loadServiceKey();
  await fs.mkdir(OUT_DIR, { recursive: true });

  console.log('=== fetch golf_practice_ranges (active SALS_STTS_CD=01) ===');
  console.log(`endpoint: ${ENDPOINT}`);
  console.log(`out: ${OUT_DIR}`);

  let allItems;
  let apiTotalCount;
  let pageCount;
  let fetchedAt;

  if (process.env.REPROCESS_FROM_RAW === '1') {
    const rawPathExisting = path.join(OUT_DIR, 'raw-active.json');
    const existing = JSON.parse(await fs.readFile(rawPathExisting, 'utf8'));
    allItems = existing.items;
    apiTotalCount = existing.totalCount ?? allItems.length;
    pageCount = existing.pageCount ?? Math.ceil(allItems.length / PAGE_SIZE);
    fetchedAt = existing.fetchedAt ?? new Date().toISOString();
    console.log(`REPROCESS_FROM_RAW: items=${allItems.length}, totalCount=${apiTotalCount}`);
  } else {
    const first = await fetchPage(serviceKey, 1);
    apiTotalCount = first.totalCount;
    pageCount = Math.ceil(apiTotalCount / PAGE_SIZE);
    console.log(`totalCount=${apiTotalCount}, pages=${pageCount}, pageSize=${PAGE_SIZE}`);

    allItems = [...first.items];
    console.log(`page 1/${pageCount}: +${first.items.length} (sum=${allItems.length})`);

    for (let pageNo = 2; pageNo <= pageCount; pageNo += 1) {
      await sleep(PAGE_DELAY_MS);
      const page = await fetchPage(serviceKey, pageNo);
      if (page.totalCount !== apiTotalCount) {
        console.warn(
          `warning: page ${pageNo} totalCount=${page.totalCount} differs from first=${apiTotalCount}`,
        );
      }
      allItems.push(...page.items);
      if (pageNo % 10 === 0 || pageNo === pageCount) {
        console.log(`page ${pageNo}/${pageCount}: +${page.items.length} (sum=${allItems.length})`);
      }
    }
    fetchedAt = new Date().toISOString();

    const rawPayload = {
      fetchedAt,
      source: SOURCE_LABEL,
      endpoint: ENDPOINT,
      filter: { SALS_STTS_CD: '01' },
      totalCount: apiTotalCount,
      collectedCount: allItems.length,
      pageSize: PAGE_SIZE,
      pageCount,
      items: allItems,
    };
    const rawPath = path.join(OUT_DIR, 'raw-active.json');
    await fs.writeFile(rawPath, `${JSON.stringify(rawPayload)}\n`, 'utf8');
  }
  const normalized = allItems.map(normalizeRecord);
  const normalizedPayload = {
    fetchedAt,
    source: SOURCE_LABEL,
    endpoint: ENDPOINT,
    filter: { SALS_STTS_CD: '01' },
    totalCount: apiTotalCount,
    collectedCount: normalized.length,
    items: normalized,
  };
  const normalizedJsonPath = path.join(OUT_DIR, 'normalized-active.json');
  await fs.writeFile(normalizedJsonPath, `${JSON.stringify(normalizedPayload)}\n`, 'utf8');

  const normalizedColumns = [
    'sourceId',
    'managementNo',
    'name',
    'phone',
    'phoneRaw',
    'phoneNormalized',
    'phoneStatus',
    'roadAddress',
    'lotAddress',
    'postalCode',
    'businessStatusCode',
    'businessStatusName',
    'detailStatusCode',
    'detailStatusName',
    'licenseDate',
    'closureDate',
    'localGovernmentCode',
    'tmX',
    'tmY',
    'lastModifiedAt',
    'dataUpdatedAt',
    'sido',
    'screenGolfCandidate',
    'screenGolfScore',
    'screenGolfReasons',
    'brandCandidate',
  ];
  const normalizedCsvPath = path.join(OUT_DIR, 'normalized-active.csv');
  await fs.writeFile(normalizedCsvPath, toCsv(normalized, normalizedColumns), 'utf8');

  const candidates = normalized.filter((r) => r.screenGolfCandidate);
  const candidatesPayload = {
    fetchedAt,
    source: SOURCE_LABEL,
    candidateThreshold: CANDIDATE_THRESHOLD,
    count: candidates.length,
    items: candidates,
  };
  const candidatesJsonPath = path.join(OUT_DIR, 'screen-golf-candidates.json');
  await fs.writeFile(candidatesJsonPath, `${JSON.stringify(candidatesPayload)}\n`, 'utf8');

  const candidateColumns = [
    'sourceId',
    'name',
    'brandCandidate',
    'screenGolfScore',
    'screenGolfReasons',
    'phoneRaw',
    'phoneNormalized',
    'phoneStatus',
    'roadAddress',
    'lotAddress',
    'localGovernmentCode',
    'tmX',
    'tmY',
    'managementNo',
    'licenseDate',
    'lastModifiedAt',
  ];
  const candidatesCsvPath = path.join(OUT_DIR, 'screen-golf-candidates.csv');
  await fs.writeFile(candidatesCsvPath, toCsv(candidates, candidateColumns), 'utf8');

  const dupA = countDuplicates(normalized, (r) => r.sourceId);
  const dupB = countDuplicates(
    normalized,
    (r) => (r.name && r.roadAddress ? `${r.name}|${r.roadAddress}` : ''),
  );
  const dupC = countDuplicates(
    normalized,
    (r) => (r.name && r.lotAddress ? `${r.name}|${r.lotAddress}` : ''),
  );

  printReport({
    apiTotalCount,
    collected: allItems.length,
    pageCount,
    dupA,
    dupB,
    dupC,
    normalized,
    candidates,
  });

  const sizes = {};
  const rawPath = path.join(OUT_DIR, 'raw-active.json');
  for (const p of [
    rawPath,
    normalizedJsonPath,
    normalizedCsvPath,
    candidatesJsonPath,
    candidatesCsvPath,
  ]) {
    const st = await fs.stat(p);
    sizes[path.relative(ROOT, p)] = st.size;
  }
  console.log('\n## 생성 파일');
  for (const [rel, size] of Object.entries(sizes)) {
    console.log(`${rel}: ${(size / 1024 / 1024).toFixed(2)} MB (${size} bytes)`);
  }

  if (allItems.length !== apiTotalCount) {
    console.warn(
      `\nWARNING: collected ${allItems.length} != api totalCount ${apiTotalCount}`,
    );
    process.exitCode = 2;
  } else {
    console.log('\n수집 완료: totalCount와 수집건수 일치');
  }
}

main().catch((err) => {
  console.error('FATAL:', err instanceof Error ? err.message : err);
  process.exit(1);
});
