/**
 * Live FIELD ODCloud schema probe.
 * 1) Always fetches public OAS (no secret) and prints data[] keys.
 * 2) If DATA_GO_KR_SERVICE_KEY (working DEV auth) or ODCLOUD_SERVICE_KEY is set,
 *    fetches page=1&perPage=2 via query serviceKey and prints totalCount + Object.keys(data[0]).
 *    Never prints the key. Do not send Authorization-only.
 */
import dns from 'node:dns';
import fs from 'node:fs';
import path from 'node:path';
import { fetchOdcloudFieldGolfPage } from '../../apps/api/src/modules/field-golf-courses/sync/odcloud-field-golf-client.ts';

dns.setDefaultResultOrder('ipv4first');

const OAS_URL = 'https://infuser.odcloud.kr/oas/docs?namespace=15118920/v1';
const OAS_MODEL = 'uddi:0e5b12d2-1cc8-4caf-ba96-c2c7d1ef8d83_model';

function loadEnvFiles() {
  const root = path.resolve(__dirname, '../..');
  for (const name of ['.env.local', '.env']) {
    const p = path.join(root, name);
    if (!fs.existsSync(p)) continue;
    for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
      const i = trimmed.indexOf('=');
      const key = trimmed.slice(0, i);
      let value = trimmed.slice(i + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!(key in process.env)) process.env[key] = value;
    }
  }
}

function resolveKey(): string | null {
  const key =
    process.env.DATA_GO_KR_SERVICE_KEY?.trim() ||
    process.env.ODCLOUD_SERVICE_KEY?.trim() ||
    '';
  return key || null;
}

async function probeOas(): Promise<string[]> {
  const res = await fetch(OAS_URL, { headers: { Accept: 'application/json' } });
  if (!res.ok) {
    throw new Error(`OAS_HTTP_${res.status}`);
  }
  const json = (await res.json()) as {
    definitions?: Record<string, { properties?: Record<string, unknown> }>;
  };
  const keys = Object.keys(json.definitions?.[OAS_MODEL]?.properties ?? {});
  if (keys.length === 0) {
    throw new Error('OAS_MODEL_KEYS_MISSING');
  }
  return keys;
}

async function main() {
  loadEnvFiles();
  const oasKeys = await probeOas();
  console.log(
    JSON.stringify({
      event: 'FIELD_ODCLOUD_OAS',
      url: OAS_URL,
      dataKeys: oasKeys,
    }),
  );

  const serviceKey = resolveKey();
  if (!serviceKey) {
    console.log(
      JSON.stringify({
        event: 'FIELD_ODCLOUD_PAGE_SKIPPED',
        reason: 'ODCLOUD_SERVICE_KEY_or_DATA_GO_KR_SERVICE_KEY_missing',
        note: 'Unauthenticated page probe returns HTTP 401 인증키는 필수 항목 입니다.',
      }),
    );
    return;
  }

  const page = await fetchOdcloudFieldGolfPage({
    serviceKey,
    page: 1,
    perPage: 2,
  });
  const firstKeys = page.items[0] ? Object.keys(page.items[0]) : [];
  console.log(
    JSON.stringify({
      event: 'FIELD_ODCLOUD_PAGE',
      page: page.page,
      perPage: page.perPage,
      currentCount: page.currentCount,
      matchCount: page.matchCount,
      totalCount: page.totalCount,
      firstItemKeys: firstKeys,
      sampleCount: page.items.length,
    }),
  );
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
