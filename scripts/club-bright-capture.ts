/**
 * Club Bright QA — ADB navigation + screenshots (device 390) and preview harness (360/430).
 *
 * Usage:
 *   pnpm exec tsx scripts/club-bright-capture.ts
 *   pnpm exec tsx scripts/club-bright-capture.ts device390
 *   pnpm exec tsx scripts/club-bright-capture.ts harness
 */
import { execSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ADB =
  process.env.ADB_PATH ??
  `${process.env.LOCALAPPDATA ?? ''}\\Android\\Sdk\\platform-tools\\adb.exe`;
const PKG = process.env.JJOIN_ANDROID_PACKAGE ?? 'com.jjoin.app.dev';
const OUT = join(process.cwd(), 'artifacts', 'club-bright', 'app');

const QA_CLUB_TAG = '[QA-CLUB-MGMT]';

function adb(args: string): string {
  return execSync(`"${ADB}" ${args}`, { encoding: 'utf8' }).trim();
}

function sleep(ms: number) {
  execSync(`powershell -Command "Start-Sleep -Milliseconds ${ms}"`, { stdio: 'inherit' });
}

function screenshot(name: string, waitMs = 3500) {
  assertForeground();
  mkdirSync(OUT, { recursive: true });
  const out = join(OUT, name);
  const remote = `/sdcard/jjoin-club-${name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  if (waitMs > 0) sleep(waitMs);
  adb(`shell screencap -p ${remote}`);
  execSync(`"${ADB}" pull ${remote} "${out}"`, {
    stdio: 'inherit',
    maxBuffer: 64 * 1024 * 1024,
  });
  adb(`shell rm -f "${remote}"`);
  console.log('screenshot', out);
}

function focusApp() {
  adb(`shell monkey -p ${PKG} -c android.intent.category.LAUNCHER 1`);
}

function assertForeground() {
  const out = adb('shell dumpsys window');
  const line = out.split('\n').find((l) => l.includes('mCurrentFocus')) ?? '';
  if (!line.includes(PKG)) {
    focusApp();
    sleep(2000);
  }
}

function deepLink(path: string) {
  const raw = `jjoindev://${path.startsWith('/') ? path.slice(1) : path}`;
  const url = raw.replace(/&/g, '%26');
  adb(`shell am start -a android.intent.action.VIEW -d "${url}" -p ${PKG}`);
}

function dumpUiXml(): string {
  const dumpRemote = '/sdcard/jjoin-club-ui-dump.xml';
  const dumpLocal = join(OUT, '_ui-dump.xml');
  mkdirSync(OUT, { recursive: true });
  adb(`shell uiautomator dump ${dumpRemote}`);
  execSync(`"${ADB}" pull ${dumpRemote} "${dumpLocal}"`, { stdio: 'inherit' });
  return readFileSync(dumpLocal, 'utf8');
}

function tapText(label: string) {
  const xml = dumpUiXml();
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match =
    new RegExp(`text="${escaped}"[^>]*bounds="\\[(\\d+),(\\d+)\\]\\[(\\d+),(\\d+)\\]"`).exec(xml) ??
    new RegExp(`bounds="\\[(\\d+),(\\d+)\\]\\[(\\d+),(\\d+)\\]"[^>]*text="${escaped}"`).exec(xml);
  if (!match) return false;
  const x = Math.round((Number(match[1]) + Number(match[3])) / 2);
  const y = Math.round((Number(match[2]) + Number(match[4])) / 2);
  adb(`shell input tap ${x} ${y}`);
  sleep(2000);
  return true;
}

function waitForAny(texts: string[], timeoutMs = 90_000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const xml = dumpUiXml();
    if (texts.some((text) => xml.includes(text))) return;
    sleep(2000);
  }
  throw new Error(`waitForAny timeout: ${texts.join(', ')}`);
}

function device390Screens() {
  const clubId = process.env.QA_CLUB_BRIGHT_ID;
  focusApp();
  sleep(5000);
  assertForeground();

  deepLink('my/clubs/discover');
  sleep(4000);
  waitForAny(['동호회 검색', '전체', '활동 활발', QA_CLUB_TAG, '추천 동호회']);
  screenshot('discover-390.png', 2000);

  if (tapText('활동 활발')) {
    screenshot('discover-active-filter-390.png', 2000);
  }

  if (tapText('내 동호회')) {
    screenshot('discover-mine-filter-390.png', 2000);
  }

  if (tapText('전체')) {
    // noop — return to all filter when chip exists
  }

  if (tapText(QA_CLUB_TAG) || tapText('일산 스크린')) {
    screenshot('detail-390.png', 3000);
    adb('shell input keyevent 4');
    sleep(1500);
  }

  if (clubId) {
    deepLink(`my/clubs/${clubId}`);
    sleep(4000);
    screenshot('detail-390.png', 2500);
  }

  deepLink('my/clubs');
  sleep(4000);
  waitForAny(['내가 운영하는 동호회', '가입한 동호회', '내 동호회', QA_CLUB_TAG]);
  screenshot('my-clubs-390.png', 2000);

  deepLink('my/clubs/discover');
  sleep(3000);
  screenshot('search-390.png', 1500);

  deepLink('my/clubs/create');
  sleep(4000);
  waitForAny(['동호회 만들기', '대표 이미지', '기본 정보']);
  screenshot('create-390.png', 2000);

  if (clubId) {
    for (const [suffix, path] of [
      ['members-390.png', `my/clubs/${clubId}/members`],
      ['events-390.png', `my/clubs/${clubId}/events`],
      ['notices-390.png', `my/clubs/${clubId}/notices`],
      ['accounting-390.png', `my/clubs/${clubId}/accounting`],
      ['edit-390.png', `my/clubs/${clubId}/edit`],
    ] as const) {
      deepLink(path);
      sleep(4000);
      screenshot(suffix, 2000);
    }
  }
}

function harnessScreens() {
  const scenes = [
    ['discover', 'discover'],
    ['detail', 'detail'],
    ['my-clubs', 'my-clubs'],
    ['search', 'search'],
    ['fallback', 'fallback'],
    ['join-cta', 'join-cta'],
  ] as const;

  for (const width of [360, 390, 430] as const) {
    for (const [scene, prefix] of scenes) {
      deepLink(`dev/club-figma-qa?width=${width}&scene=${scene}`);
      sleep(4500);
      screenshot(`${prefix}-${width}.png`, 1500);
    }
  }
}

function writeManifest() {
  const manifest = {
    capturedAt: new Date().toISOString(),
    outDir: OUT,
    device: adb('devices').split('\n').slice(1).find((l) => l.includes('\tdevice')) ?? 'unknown',
  };
  writeFileSync(join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2));
}

async function main() {
  const mode = process.argv[2] ?? 'all';
  const devices = adb('devices').split('\n').slice(1).filter((l) => l.includes('\tdevice'));
  if (devices.length === 0) throw new Error('No adb device');

  if (mode === 'all' || mode === 'device390') {
    device390Screens();
  }
  if (mode === 'all' || mode === 'harness') {
    harnessScreens();
  }

  writeManifest();
  console.log('done', OUT);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
