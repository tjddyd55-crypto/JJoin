#!/usr/bin/env node
/**
 * Small-sample EPSG:5174 (TM) → EPSG:4326 (WGS84) conversion check.
 *
 * Uses workspace proj4 dependency.
 * Does not call NAVER Geocoding.
 */

const fs = require('fs');
const path = require('path');

const proj4 = require('proj4');

const ROOT = path.resolve(__dirname, '../..');
const DATA_DIR = path.join(ROOT, 'data/golf-practice-ranges');

const SIDO_TARGETS = [
  '서울',
  '부산',
  '대구',
  '인천',
  '광주',
  '대전',
  '울산',
  '세종',
  '경기',
  '강원',
  '충북',
  '충남',
  '전북',
  '전남',
  '경북',
  '경남',
  '제주',
];

const SIDO_ALIASES = [
  ['서울특별시', '서울'],
  ['부산광역시', '부산'],
  ['대구광역시', '대구'],
  ['인천광역시', '인천'],
  ['광주광역시', '광주'],
  ['대전광역시', '대전'],
  ['울산광역시', '울산'],
  ['세종특별자치시', '세종'],
  ['경기도', '경기'],
  ['강원특별자치도', '강원'],
  ['강원도', '강원'],
  ['충청북도', '충북'],
  ['충청남도', '충남'],
  ['전북특별자치도', '전북'],
  ['전라북도', '전북'],
  ['전라남도', '전남'],
  ['경상북도', '경북'],
  ['경상남도', '경남'],
  ['제주특별자치도', '제주'],
];

/** Approximate WGS84 bbox per sido for coarse address↔coord consistency. */
const SIDO_BBOX = {
  서울: { lat: [37.4, 37.75], lng: [126.75, 127.25] },
  부산: { lat: [34.85, 35.4], lng: [128.75, 129.35] },
  대구: { lat: [35.7, 36.05], lng: [128.4, 128.8] },
  인천: { lat: [37.2, 37.75], lng: [126.35, 126.85] },
  광주: { lat: [35.05, 35.3], lng: [126.7, 127.05] },
  대전: { lat: [36.2, 36.5], lng: [127.25, 127.55] },
  울산: { lat: [35.4, 35.75], lng: [129.05, 129.5] },
  세종: { lat: [36.4, 36.7], lng: [127.15, 127.4] },
  경기: { lat: [36.85, 38.3], lng: [126.35, 127.9] },
  강원: { lat: [37.0, 38.65], lng: [127.05, 129.4] },
  충북: { lat: [36.0, 37.25], lng: [127.25, 128.7] },
  충남: { lat: [35.95, 37.1], lng: [125.95, 127.7] },
  전북: { lat: [35.3, 36.2], lng: [126.4, 127.9] },
  전남: { lat: [33.85, 35.55], lng: [125.95, 127.85] },
  경북: { lat: [35.55, 37.1], lng: [127.8, 129.6] },
  경남: { lat: [34.55, 35.75], lng: [127.55, 129.3] },
  제주: { lat: [33.1, 33.6], lng: [126.1, 127.0] },
};

const KR_LAT = [33, 39];
const KR_LNG = [124, 132];

const GWANGJU_DISTRICTS = new Set(['광산구', '동구', '서구', '남구', '북구']);

function extractSido(roadAddress, jibunAddress) {
  const text = `${roadAddress || ''} ${jibunAddress || ''}`.trim();
  // 2026 LOCALDATA: Gwangju+Jeonnam merged label
  if (text.startsWith('전남광주통합특별시')) {
    const district = text.split(/\s+/)[1] || '';
    return GWANGJU_DISTRICTS.has(district) ? '광주' : '전남';
  }
  for (const [full, short] of SIDO_ALIASES) {
    if (text.startsWith(full) || text.includes(` ${full}`)) return short;
  }
  for (const short of SIDO_TARGETS) {
    if (text.startsWith(short)) return short;
  }
  return '기타';
}

function inRange(value, [min, max]) {
  return value >= min && value <= max;
}

function main() {
  // EPSG:5174 — Bessel TM mid-origin; towgs84 commonly used for KR Bessel→WGS84
  proj4.defs(
    'EPSG:5174',
    '+proj=tmerc +lat_0=38 +lon_0=127 +k=1 +x_0=200000 +y_0=500000 +ellps=bessel +units=m +no_defs +towgs84=-115.80,474.99,674.11,1.16,-2.31,-1.63,6.43',
  );

  const active = JSON.parse(
    fs.readFileSync(path.join(DATA_DIR, 'normalized-active.json'), 'utf8'),
  );

  const withCoords = active.filter(
    (row) => Number.isFinite(row.tmX) && Number.isFinite(row.tmY),
  );

  const bySido = new Map();
  for (const row of withCoords) {
    const sido = extractSido(row.roadAddress, row.jibunAddress);
    if (!bySido.has(sido)) bySido.set(sido, []);
    bySido.get(sido).push(row);
  }

  const samples = [];
  for (const sido of SIDO_TARGETS) {
    const pool = bySido.get(sido) || [];
    // up to 2 per sido → ~34 max; aim 20–30 total
    for (const row of pool.slice(0, 2)) {
      samples.push({ ...row, sido });
    }
  }

  // If under 20, top up from remaining
  if (samples.length < 20) {
    for (const row of withCoords) {
      if (samples.length >= 24) break;
      if (samples.some((s) => s.managementNo === row.managementNo)) continue;
      samples.push({ ...row, sido: extractSido(row.roadAddress, row.jibunAddress) });
    }
  }

  const results = [];
  let ok = 0;
  let fail = 0;
  let outOfKorea = 0;
  let regionMismatch = 0;

  for (const row of samples) {
    let latitude = null;
    let longitude = null;
    let transformOk = false;
    let inKorea = false;
    let regionOk = null;
    let error = null;

    try {
      const [lng, lat] = proj4('EPSG:5174', 'EPSG:4326', [row.tmX, row.tmY]);
      latitude = lat;
      longitude = lng;
      transformOk = Number.isFinite(lat) && Number.isFinite(lng);
      inKorea =
        transformOk &&
        inRange(lat, KR_LAT) &&
        inRange(lng, KR_LNG);
      if (transformOk && !inKorea) outOfKorea += 1;

      const bbox = SIDO_BBOX[row.sido];
      if (transformOk && bbox) {
        regionOk =
          inRange(lat, bbox.lat) && inRange(lng, bbox.lng);
        if (!regionOk) regionMismatch += 1;
      }

      if (transformOk && inKorea) ok += 1;
      else fail += 1;
    } catch (err) {
      fail += 1;
      error = String(err && err.message ? err.message : err);
    }

    const mapLink =
      latitude != null && longitude != null
        ? `https://map.kakao.com/link/map/${encodeURIComponent(row.name)},${latitude},${longitude}`
        : null;

    results.push({
      name: row.name,
      sido: row.sido,
      roadAddress: row.roadAddress,
      tmX: row.tmX,
      tmY: row.tmY,
      latitude,
      longitude,
      transformOk,
      inKorea,
      regionOk,
      mapLink,
      error,
    });
  }

  const report = {
    method: 'proj4 EPSG:5174 +towgs84 → EPSG:4326',
    proj4Source: 'proj4',
    sampleCount: results.length,
    transformOkInKorea: ok,
    failOrOutOfRange: fail,
    outOfKorea,
    regionMismatch,
    naverGeocoding: 'NOT_CALLED',
    strategyDraft: {
      priority: [
        '1. TM present + valid WGS84 convert → GOV_TM_CONVERTED',
        '2. TM missing → NAVER_GEOCODED candidate',
        '3. TM convert abnormal → NAVER_GEOCODED candidate',
        '4. no road address → use jibun',
        '5. no address → UNKNOWN',
      ],
      futureFields: [
        'latitude',
        'longitude',
        'coordinateSource',
        'coordinateVerifiedAt',
      ],
      coordinateSourceEnum: [
        'GOV_TM_CONVERTED',
        'NAVER_GEOCODED',
        'MANUAL',
        'UNKNOWN',
      ],
    },
    samples: results,
  };

  const outJson = path.join(DATA_DIR, 'tm-to-wgs84-sample-report.json');
  const outCsv = path.join(DATA_DIR, 'tm-to-wgs84-sample.csv');
  fs.writeFileSync(outJson, JSON.stringify(report, null, 2) + '\n', 'utf8');

  const headers = [
    'name',
    'sido',
    'roadAddress',
    'tmX',
    'tmY',
    'latitude',
    'longitude',
    'transformOk',
    'inKorea',
    'regionOk',
    'mapLink',
  ];
  const lines = [headers.join(',')];
  for (const row of results) {
    lines.push(
      headers
        .map((key) => {
          const value = row[key];
          const text = value == null ? '' : String(value);
          return `"${text.replace(/"/g, '""')}"`;
        })
        .join(','),
    );
  }
  fs.writeFileSync(outCsv, lines.join('\n') + '\n', 'utf8');

  console.log('=== TM → WGS84 sample report ===');
  console.log(JSON.stringify({
    sampleCount: report.sampleCount,
    transformOkInKorea: report.transformOkInKorea,
    failOrOutOfRange: report.failOrOutOfRange,
    outOfKorea: report.outOfKorea,
    regionMismatch: report.regionMismatch,
  }, null, 2));
  console.log('\nSamples:');
  for (const row of results) {
    console.log(
      [
        row.sido.padEnd(4),
        row.transformOk && row.inKorea ? 'OK' : 'FAIL',
        row.regionOk === false ? 'REGION_MISMATCH' : 'REGION_OK',
        (row.latitude ?? '').toString().slice(0, 10),
        (row.longitude ?? '').toString().slice(0, 11),
        row.name,
        row.roadAddress,
      ].join(' | '),
    );
  }

  // Recommendation based on actual sample outcomes
  let recommendation = 'C';
  if (ok === results.length && regionMismatch === 0) recommendation = 'A';
  else if (ok / results.length < 0.8) recommendation = 'B';
  else recommendation = 'C';

  console.log('\nRecommendation code:', recommendation);
  console.log(
    recommendation === 'A'
      ? 'EPSG:5174 → WGS84 직접 변환을 전국 데이터에 적용 가능'
      : recommendation === 'B'
        ? '직접 변환 신뢰도가 부족해 NAVER Geocoding 중심으로 가야 함'
        : 'TM 직접 변환 + NAVER Geocoding fallback 혼합 방식 권장',
  );
}

main();
