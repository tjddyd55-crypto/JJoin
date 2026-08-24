/**
 * One-shot diagnostic: 행정안전부 생활_골프연습장업 OpenAPI 구조 확인.
 * Does NOT persist data. Never logs the raw service key.
 *
 * Usage (from repo root):
 *   node --env-file=.env.local scripts/debug-golf-practice-api.mjs
 */

const BASE = 'https://apis.data.go.kr/1741000/golf_practice_ranges';
const BODY_PREVIEW_MIN = 3000;
const BODY_PREVIEW_CASE = 5000;

function loadServiceKey() {
  const raw = (process.env.DATA_GO_KR_SERVICE_KEY ?? '').trim();
  if (!raw) {
    console.error('DATA_GO_KR_SERVICE_KEY가 설정되어 있지 않습니다.');
    process.exit(1);
  }
  return raw;
}

/** Avoid double-encoding when the portal Encoding key already contains '%'. */
function appendServiceKey(url, serviceKey) {
  const sep = url.includes('?') ? '&' : '?';
  if (serviceKey.includes('%')) {
    return `${url}${sep}serviceKey=${serviceKey}`;
  }
  return `${url}${sep}serviceKey=${encodeURIComponent(serviceKey)}`;
}

function buildUrl(pathOrBase, params, serviceKey) {
  const base = pathOrBase.startsWith('http') ? pathOrBase : `${BASE}${pathOrBase}`;
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '') continue;
    qs.set(k, String(v));
  }
  const query = qs.toString();
  const withParams = query ? `${base}?${query}` : base;
  return appendServiceKey(withParams, serviceKey);
}

function maskUrl(url) {
  return url.replace(/([?&]serviceKey=)[^&]*/gi, '$1***REDACTED***');
}

function previewBody(text, max) {
  if (text == null) return '(empty)';
  if (text.length <= max) return text;
  return `${text.slice(0, max)}\n... [truncated ${text.length - max} chars]`;
}

function detectFormat(contentType, body) {
  const ct = (contentType ?? '').toLowerCase();
  const head = body.trimStart().slice(0, 80);
  if (ct.includes('json') || head.startsWith('{') || head.startsWith('[')) return 'json';
  if (ct.includes('xml') || head.startsWith('<?xml') || head.startsWith('<')) {
    if (head.toLowerCase().includes('<html') || ct.includes('html')) return 'html';
    return 'xml';
  }
  if (ct.includes('html') || head.toLowerCase().includes('<!doctype html')) return 'html';
  return 'unknown';
}

function tryPrettyJson(body) {
  try {
    return JSON.stringify(JSON.parse(body), null, 2);
  } catch {
    return null;
  }
}

function extractHints(body) {
  const hints = [];
  const lower = body.toLowerCase();
  for (const token of [
    'operation',
    'endpoint',
    'path',
    'current',
    'history',
    'get',
    'list',
    'search',
    'localcode',
    'localcd',
    'sidocode',
    'sigungucode',
    'trdstategbn',
    'businessstatus',
    'servicekey',
    '필수',
    '누락',
    '오류',
    'error',
  ]) {
    if (lower.includes(token)) hints.push(token);
  }
  return hints;
}

/** Walk JSON looking for array of objects that look like venue rows. */
function findRecordArrays(node, path = '$', out = []) {
  if (Array.isArray(node)) {
    if (
      node.length > 0 &&
      typeof node[0] === 'object' &&
      node[0] !== null &&
      !Array.isArray(node[0])
    ) {
      const keys = Object.keys(node[0]).join('|').toLowerCase();
      if (
        /bplc|nm|addr|tel|lat|lot|biz|opn|trd|management|mgt|site|rdn/.test(keys) ||
        Object.keys(node[0]).length >= 5
      ) {
        out.push({ path, length: node.length, sampleKeys: Object.keys(node[0]), items: node });
      }
    }
    node.forEach((item, i) => findRecordArrays(item, `${path}[${i}]`, out));
    return out;
  }
  if (node && typeof node === 'object') {
    for (const [k, v] of Object.entries(node)) {
      findRecordArrays(v, `${path}.${k}`, out);
    }
  }
  return out;
}

function findTotalCount(node, path = '$', out = []) {
  if (node && typeof node === 'object' && !Array.isArray(node)) {
    for (const [k, v] of Object.entries(node)) {
      if (/totalcount|total_count|total/i.test(k) && (typeof v === 'number' || typeof v === 'string')) {
        out.push({ path: `${path}.${k}`, key: k, value: v });
      }
      findTotalCount(v, `${path}.${k}`, out);
    }
  } else if (Array.isArray(node)) {
    node.forEach((item, i) => findTotalCount(item, `${path}[${i}]`, out));
  }
  return out;
}

const FIELD_CANDIDATES = {
  사업장명: ['BPLC_NM', 'bplcNm', 'BPLCNM', 'bplc_nm', 'bizPlcNm', '업소명', '사업장명'],
  전화번호: ['TELNO', 'siteTel', 'SITETEL', 'tel', 'TEL', 'telno', '전화번호', '소재지전화'],
  도로명주소: ['ROAD_NM_ADDR', 'rdnWhlAddr', 'RDNWHLADDR', 'roadAddr', '도로명주소'],
  지번주소: ['LOTNO_ADDR', 'siteWhlAddr', 'SITEWHLADDR', 'jibunAddr', '소재지전체주소', '지번주소'],
  영업상태: ['SALS_STTS_NM', 'trdStateNm', 'TRDSTATENM', '영업상태명', '영업상태'],
  상세영업상태: ['DTL_SALS_STTS_NM', 'dtlStateNm', 'DTLSTATENM', '상세영업상태명'],
  인허가일자: ['LCPMT_YMD', 'apvPermYmd', 'APVPERMYMD', '인허가일자'],
  폐업일자: ['CLSBIZ_YMD', 'dcbYmd', 'DCBYMD', '폐업일자'],
  // WGS84 lat/lon 없음 — TM(EPSG:5174) 좌표만 제공되는 경우가 있음
  위도: ['lat', 'LAT', 'latitude', '위도'],
  경도: ['lon', 'LON', 'longitude', '경도'],
  좌표X_TM: ['CRD_INFO_X'],
  좌표Y_TM: ['CRD_INFO_Y'],
  관리번호: ['MNG_NO', 'mgtNo', 'MGTNO', '관리번호'],
  자치단체코드: ['OPN_ATMY_GRP_CD', 'opnSfTeamCode', 'localCode', 'localCd', '자치단체코드'],
  우편번호: ['ROAD_NM_ZIP', 'LCTN_ZIP', 'rdnPostNo', '우편번호'],
  최종수정일: ['LAST_MDFCN_PNT', 'updateDt', '최종수정시점', '최종수정일'],
  데이터갱신일: ['DAT_UPDT_PNT', 'dataUpdDt', '데이터갱신일자'],
  페이지번호: ['pageNo', 'pageIndex', 'currentPage', 'page'],
  페이지당건수: ['numOfRows', 'perPage', 'pageSize', 'rows'],
  전체건수: ['totalCount', 'total_count', 'total'],
};

function pickField(record, candidates) {
  for (const name of candidates) {
    if (record[name] !== undefined && record[name] !== null && record[name] !== '') {
      return { field: name, value: record[name] };
    }
  }
  // case-insensitive fallback
  const lowerMap = Object.fromEntries(
    Object.keys(record).map((k) => [k.toLowerCase(), k]),
  );
  for (const name of candidates) {
    const actual = lowerMap[name.toLowerCase()];
    if (actual && record[actual] !== undefined && record[actual] !== null && record[actual] !== '') {
      return { field: actual, value: record[actual] };
    }
  }
  return { field: null, value: null };
}

async function request(label, url) {
  console.log(`\n========== ${label} ==========`);
  console.log(`REQUEST URL (masked): ${maskUrl(url)}`);
  const started = Date.now();
  let res;
  try {
    res = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json, application/xml, text/*, */*' },
    });
  } catch (err) {
    console.log(`FETCH ERROR: ${err instanceof Error ? err.message : String(err)}`);
    return { ok: false, status: 0, contentType: '', body: '', format: 'unknown', json: null };
  }
  const contentType = res.headers.get('content-type') ?? '';
  const body = await res.text();
  const format = detectFormat(contentType, body);
  console.log(`HTTP STATUS: ${res.status}`);
  console.log(`CONTENT-TYPE: ${contentType || '(none)'}`);
  console.log(`ELAPSED_MS: ${Date.now() - started}`);
  console.log(`FORMAT: ${format}`);
  const hints = extractHints(body);
  if (hints.length) console.log(`HINTS: ${hints.join(', ')}`);

  let json = null;
  if (format === 'json') {
    const pretty = tryPrettyJson(body);
    if (pretty) {
      json = JSON.parse(body);
      console.log('BODY:');
      console.log(previewBody(pretty, label.startsWith('CASE') ? BODY_PREVIEW_CASE : BODY_PREVIEW_MIN));
    } else {
      console.log('BODY (non-parseable json-like):');
      console.log(previewBody(body, BODY_PREVIEW_CASE));
    }
  } else {
    console.log('BODY:');
    console.log(previewBody(body, label.startsWith('CASE') ? BODY_PREVIEW_CASE : BODY_PREVIEW_MIN));
  }

  return {
    ok: res.ok,
    status: res.status,
    contentType,
    body,
    format,
    json,
    url: maskUrl(url),
  };
}

function looksLikeSuccess(result) {
  if (!result.json) return false;
  const arrays = findRecordArrays(result.json);
  const totals = findTotalCount(result.json);
  return arrays.some((a) => a.length > 0) || totals.length > 0;
}

function printSuccessAnalysis(result, label) {
  console.log(`\n########## SUCCESS CANDIDATE: ${label} ##########`);
  const totals = findTotalCount(result.json);
  const arrays = findRecordArrays(result.json);
  console.log('totalCount candidates:', totals.length ? totals : '없음');
  console.log(
    'record arrays:',
    arrays.map((a) => ({ path: a.path, length: a.length, sampleKeys: a.sampleKeys })),
  );

  const best = arrays.sort((a, b) => b.length - a.length)[0];
  if (!best) {
    console.log('사업장 배열을 찾지 못했습니다. JSON 루트 키:', Object.keys(result.json));
    return { totals, arrays, samples: [] };
  }

  const samples = best.items.slice(0, 3);
  console.log('\n## 필드 매핑 (첫 레코드 기준)');
  const first = samples[0] ?? {};
  for (const [meaning, candidates] of Object.entries(FIELD_CANDIDATES)) {
    const hit = pickField(first, candidates);
    console.log(
      `- ${meaning}: ${hit.field ?? '없음'}${hit.field ? ` = ${JSON.stringify(hit.value)}` : ''}`,
    );
  }

  console.log('\n## 샘플 최대 3건');
  for (const rec of samples) {
    const name = pickField(rec, FIELD_CANDIDATES.사업장명);
    const tel = pickField(rec, FIELD_CANDIDATES.전화번호);
    const road = pickField(rec, FIELD_CANDIDATES.도로명주소);
    const jibun = pickField(rec, FIELD_CANDIDATES.지번주소);
    const status = pickField(rec, FIELD_CANDIDATES.영업상태);
    const mgt = pickField(rec, FIELD_CANDIDATES.관리번호);
    console.log(
      JSON.stringify(
        {
          사업장명: name.value ?? null,
          전화번호: tel.value ?? null,
          도로명주소: road.value ?? null,
          지번주소: jibun.value ?? null,
          영업상태: status.value ?? null,
          관리번호: mgt.value ?? null,
          원본필드: rec,
        },
        null,
        2,
      ),
    );
  }

  return { totals, arrays, samples, best };
}

async function main() {
  const serviceKey = loadServiceKey();
  console.log('=== golf_practice_ranges API diagnostic ===');
  console.log(`BASE: ${BASE}`);
  console.log(`serviceKey present: yes (masked, len=${serviceKey.length}, hasPercent=${serviceKey.includes('%')})`);

  // Step 1: minimal request
  const minUrl = appendServiceKey(BASE, serviceKey);
  const step1 = await request('STEP1_MINIMAL', minUrl);

  // Step 2: standard param cases on base endpoint
  const cases = [
    { name: 'CASE_A', params: { pageNo: 1, numOfRows: 5 } },
    { name: 'CASE_B', params: { pageNo: 1, numOfRows: 5, type: 'json' } },
    { name: 'CASE_C', params: { pageNo: 1, numOfRows: 5, _type: 'json' } },
    { name: 'CASE_D', params: { pageNo: 1, numOfRows: 5, returnType: 'json' } },
  ];

  const results = [{ label: 'STEP1_MINIMAL', result: step1 }];
  let success = looksLikeSuccess(step1) ? { label: 'STEP1_MINIMAL', result: step1 } : null;

  for (const c of cases) {
    if (success) break;
    const url = buildUrl(BASE, c.params, serviceKey);
    console.log(`\nREQUEST PARAMS (no key): ${JSON.stringify(c.params)}`);
    const result = await request(c.name, url);
    results.push({ label: c.name, result });
    if (looksLikeSuccess(result)) {
      success = { label: c.name, result };
      break;
    }
  }

  // Step 3: evidence-based path — same 1741000 localdata series uses /info
  // (sibling: registered_sports_facilities/info; file URL: .../golf_practice_ranges/info)
  // Also triggered by gateway NO_OPENAPI_SERVICE_ERROR on bare service root.
  if (!success) {
    const combinedBody = results.map((r) => r.result.body).join('\n');
    const noService =
      /NO_OPENAPI_SERVICE_ERROR|오픈API 서비스가 없거나 폐기/i.test(combinedBody) ||
      results.some((r) => r.result.status === 404);

    if (noService) {
      console.log('\n--- path exploration (evidence: /info from same 1741000 series) ---');
      const pathCandidates = ['/info', '/history'];
      for (const path of pathCandidates) {
        if (success) break;
        for (const params of [
          { pageNo: 1, numOfRows: 5, returnType: 'json' },
          { pageNo: 1, numOfRows: 5, type: 'json' },
          { pageNo: 1, numOfRows: 5 },
        ]) {
          if (success) break;
          const url = buildUrl(path, params, serviceKey);
          console.log(`REQUEST PARAMS (no key): path=${path} ${JSON.stringify(params)}`);
          const result = await request(`PATH_${path}_${JSON.stringify(params)}`, url);
          results.push({ label: `PATH_${path}`, result });
          if (looksLikeSuccess(result)) {
            success = { label: `PATH_${path}`, result };
          }
        }
      }
    } else {
      console.log('\n경로 brute-force 생략: operation/path 힌트 또는 서비스미존재 오류 없음.');
    }
  }

  // Step 4: localCode / status only if error message demands them
  if (!success) {
    const errBody = results.map((r) => r.result.body).join('\n');
    const needsLocal =
      /local\s*code|localcode|localcd|자치단체|시도|시군구|orgcode|sidocode/i.test(errBody);
    const needsStatus =
      /business\s*status|영업상태|trdstategbn|statecode|statuscode/i.test(errBody);

    if (needsLocal) {
      console.log('\n--- local code param probe (error-driven) ---');
      // 11 = Seoul city-level open code often used in localdata (single representative)
      const localCandidates = ['localCode', 'localCd', 'localcode', 'sidoCode', 'sigunguCode', 'orgCode', 'code'];
      for (const name of localCandidates) {
        if (success) break;
        const params = { pageNo: 1, numOfRows: 5, type: 'json', [name]: '11' };
        const url = buildUrl(BASE, params, serviceKey);
        console.log(`REQUEST PARAMS (no key): ${JSON.stringify(params)}`);
        const result = await request(`LOCAL_${name}`, url);
        results.push({ label: `LOCAL_${name}`, result });
        if (looksLikeSuccess(result)) success = { label: `LOCAL_${name}`, result };
      }
    } else {
      console.log('\n지역코드 파라미터 테스트 생략: 필수 요구 메시지 없음.');
    }

    if (!success && needsStatus) {
      console.log('\n--- business status param probe (error-driven) ---');
      const statusCandidates = [
        'businessStatus',
        'businessStatusCode',
        'statusCode',
        'trdStateGbn',
        'stateCode',
      ];
      for (const name of statusCandidates) {
        if (success) break;
        const params = { pageNo: 1, numOfRows: 5, type: 'json', [name]: '01' };
        const url = buildUrl(BASE, params, serviceKey);
        console.log(`REQUEST PARAMS (no key): ${JSON.stringify(params)}`);
        const result = await request(`STATUS_${name}`, url);
        results.push({ label: `STATUS_${name}`, result });
        if (looksLikeSuccess(result)) success = { label: `STATUS_${name}`, result };
      }
    } else if (!needsStatus) {
      console.log('\n영업상태 파라미터 테스트 생략: 필수 요구 메시지 없음.');
    }
  }

  console.log('\n########## SUMMARY ##########');
  if (success) {
    const analysis = printSuccessAnalysis(success.result, success.label);
    console.log('\nSUCCESS_LABEL:', success.label);
    console.log('SUCCESS_URL_MASKED:', success.result.url);
    console.log('SUCCESS_HTTP:', success.result.status);

    // History API: only after current success — limited, no param-name guessing beyond documented sibling pattern
    console.log('\n--- history operation probe (post-success, limited) ---');
    const histUrl = buildUrl(
      '/history',
      { pageNo: 1, numOfRows: 3, returnType: 'json' },
      serviceKey,
    );
    console.log('REQUEST PARAMS (no key): path=/history {"pageNo":1,"numOfRows":3,"returnType":"json"}');
    const histResult = await request('HISTORY_/history', histUrl);
    if (looksLikeSuccess(histResult)) {
      console.log('HISTORY: 성공');
      printSuccessAnalysis(histResult, 'HISTORY_/history');
    } else {
      console.log(
        'HISTORY: endpoint는 존재하나 필수 파라미터 미충족 또는 미성공. bodyHead=',
        histResult.body.trim().slice(0, 200).replace(/\s+/g, ' '),
      );
    }

    console.log('\nANALYSIS_META:', {
      totalCount: analysis.totals,
      arrayPath: analysis.best?.path,
      sampleCount: analysis.samples?.length ?? 0,
    });
  } else {
    console.log('성공 판정(사업장 배열 또는 totalCount)에 도달하지 못했습니다.');
    console.log(
      '시도 결과 요약:',
      results.map((r) => ({
        label: r.label,
        status: r.result.status,
        format: r.result.format,
        bodyHead: r.result.body.trim().slice(0, 120).replace(/\s+/g, ' '),
      })),
    );
  }
}

main().catch((err) => {
  console.error('FATAL:', err instanceof Error ? err.message : err);
  process.exit(1);
});
