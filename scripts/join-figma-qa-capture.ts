/**
 * Join Figma QA — ADB navigation + screenshots for real device (390) and preview harness (360/430).
 *
 * Usage:
 *   pnpm exec tsx scripts/join-figma-qa-capture.ts
 */
import { execSync } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DEV_QA_FOUR_PARTICIPANT_JOIN_ID } from '../apps/mobile/src/lib/dev-qa-joins';

/** OPEN Development join for detail capture (모집/참가 3단락). */
const QA_CAPTURE_OPEN_JOIN_ID =
  process.env.QA_CAPTURE_OPEN_JOIN_ID ?? '25965c48-a273-4f34-ae40-e12285d86359';

const ADB =
  process.env.ADB_PATH ??
  `${process.env.LOCALAPPDATA ?? ''}\\Android\\Sdk\\platform-tools\\adb.exe`;
const PKG = process.env.JJOIN_ANDROID_PACKAGE ?? 'com.jjoin.app.dev';
const OUT = join(process.cwd(), 'artifacts', 'join-figma-alignment', 'app');

function adb(args: string): string {
  return execSync(`"${ADB}" ${args}`, { encoding: 'utf8' }).trim();
}

function screenshot(name: string, waitMs = 3500) {
  assertForeground();
  mkdirSync(OUT, { recursive: true });
  const out = join(OUT, name);
  const remote = `/sdcard/jjoin-qa-${name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  if (waitMs > 0) {
    execSync('powershell -Command "Start-Sleep -Milliseconds ' + waitMs + '"', { stdio: 'inherit' });
  }
  adb(`shell screencap -p ${remote}`);
  execSync(`"${ADB}" pull ${remote} "${out}"`, {
    stdio: 'inherit',
    maxBuffer: 64 * 1024 * 1024,
  });
  adb(`shell rm -f "${remote}"`);
  console.log('screenshot', out);
}

function launchMain() {
  adb(`shell am start -n ${PKG}/.MainActivity`);
}

function tapTabLabel(label: string) {
  const dumpRemote = '/sdcard/jjoin-ui-dump.xml';
  const dumpLocal = join(OUT, '_ui-dump.xml');
  adb(`shell uiautomator dump ${dumpRemote}`);
  execSync(`"${ADB}" pull ${dumpRemote} "${dumpLocal}"`, { stdio: 'inherit' });
  const xml = readFileSync(dumpLocal, 'utf8');
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const patterns = [
    new RegExp(
      `content-desc="${escaped}"[^>]*bounds="\\[(\\d+),(\\d+)\\]\\[(\\d+),(\\d+)\\]"`,
    ),
    new RegExp(
      `text="${escaped}"[^>]*bounds="\\[(\\d+),(\\d+)\\]\\[(\\d+),(\\d+)\\]"`,
    ),
    new RegExp(
      `bounds="\\[(\\d+),(\\d+)\\]\\[(\\d+),(\\d+)\\]"[^>]*(?:content-desc|text)="${escaped}"`,
    ),
  ];
  let match: RegExpExecArray | null = null;
  for (const pattern of patterns) {
    match = pattern.exec(xml);
    if (match) break;
  }
  if (!match) {
    const tabOrder = ['홈', '조인', '스크린', '내 조인', 'MY'];
    const index = tabOrder.indexOf(label);
    if (index >= 0) {
      tapTab(index);
      execSync('powershell -Command "Start-Sleep -Seconds 2"', { stdio: 'inherit' });
      assertForeground(5);
      return;
    }
    throw new Error(`tab label not found in UI dump: ${label}`);
  }
  const x = Math.round((Number(match[1]) + Number(match[3])) / 2);
  const y = Math.round((Number(match[2]) + Number(match[4])) / 2);
  tap(x, y);
  console.log('tapTabLabel', label, x, y);
  execSync('powershell -Command "Start-Sleep -Seconds 2"', { stdio: 'inherit' });
  assertForeground(5);
}

function focusApp() {
  adb(`shell monkey -p ${PKG} -c android.intent.category.LAUNCHER 1`);
}

function assertForeground() {
  const out = adb('shell dumpsys window');
  const line = out.split('\n').find((l) => l.includes('mCurrentFocus')) ?? '';
  if (!line.includes(PKG)) {
    focusApp();
    execSync('powershell -Command "Start-Sleep -Seconds 2"');
  }
  const out2 = adb('shell dumpsys window');
  const line2 = out2.split('\n').find((l) => l.includes('mCurrentFocus')) ?? '';
  if (!line2.includes(PKG)) {
    throw new Error(`jjoin not foreground: ${line2}`);
  }
}

function ensureAppForeground() {
  focusApp();
  assertForeground();
}

function deepLink(path: string) {
  const raw = `jjoindev://${path.startsWith('/') ? path.slice(1) : path}`;
  const url = raw.replace(/&/g, '%26').replace(/\(/g, '%28').replace(/\)/g, '%29');
  adb(`shell am start -a android.intent.action.VIEW -d "${url}" -p ${PKG}`);
}

function tap(x: number, y: number) {
  adb(`shell input tap ${x} ${y}`);
}

function deviceSize(): { w: number; h: number } {
  const out = adb('shell wm size');
  const m = out.match(/(\d+)x(\d+)/);
  if (!m) return { w: 1080, h: 2400 };
  return { w: Number(m[1]), h: Number(m[2]) };
}

function tapTab(index: number) {
  assertForeground();
  const { w, h } = deviceSize();
  const x = Math.round(((index + 0.5) / 5) * w);
  const y = h - 90;
  tap(x, y);
  console.log('tapTab', index, x, y);
}

function scrollDown() {
  const { w, h } = deviceSize();
  adb(`shell input swipe ${Math.round(w / 2)} ${Math.round(h * 0.72)} ${Math.round(w / 2)} ${Math.round(h * 0.28)} 450`);
}

function pullToRefresh() {
  const { w, h } = deviceSize();
  adb(`shell input swipe ${Math.round(w / 2)} ${Math.round(h * 0.28)} ${Math.round(w / 2)} ${Math.round(h * 0.72)} 550`);
  execSync('powershell -Command "Start-Sleep -Seconds 3"', { stdio: 'inherit' });
}

function reloadApp() {
  adb(`shell am force-stop ${PKG}`);
  focusApp();
  execSync('powershell -Command "Start-Sleep -Seconds 7"', { stdio: 'inherit' });
  assertForeground(8);
}

function hasHomeJoinCards(xml: string): boolean {
  if (
    xml.includes('추천 조인이 아직 없어요') ||
    xml.includes('불러오는 중') ||
    xml.includes('ActivityIndicator')
  ) {
    return false;
  }
  return (
    xml.includes('[QA-CAPTURE') ||
    xml.includes('[QA-JOIN') ||
    (xml.includes('자리') && xml.includes('명')) ||
    (xml.includes('D-') && xml.includes('모집'))
  );
}

function hasJoinListCards(xml: string): boolean {
  if (
    xml.includes('위치를 확인하는 중') ||
    xml.includes('선택한 날짜로 지역에 조인이 없습니다') ||
    xml.includes('조인을 불러오지 못했습니다')
  ) {
    return false;
  }
  const cardSignals =
    xml.includes('[QA-CAPTURE') ||
    xml.includes('오늘 참여 가능한 조인') ||
    xml.includes('지금 진행 중') ||
    xml.includes('모집 중') ||
    (xml.includes('자리') && xml.includes('명'));
  return cardSignals && !xml.includes('ActivityIndicator');
}

function tapRegionChip(label: string) {
  const xml = dumpUiXml();
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match =
    new RegExp(`text="${escaped}"[^>]*bounds="\\[(\\d+),(\\d+)\\]\\[(\\d+),(\\d+)\\]"`).exec(xml) ??
    new RegExp(`bounds="\\[(\\d+),(\\d+)\\]\\[(\\d+),(\\d+)\\]"[^>]*text="${escaped}"`).exec(xml);
  if (!match) return false;
  const x = Math.round((Number(match[1]) + Number(match[3])) / 2);
  const y = Math.round((Number(match[2]) + Number(match[4])) / 2);
  tap(x, y);
  execSync('powershell -Command "Start-Sleep -Seconds 2"', { stdio: 'inherit' });
  return true;
}

function tapTextInDump(label: string) {
  const xml = dumpUiXml();
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match =
    new RegExp(`text="${escaped}"[^>]*bounds="\\[(\\d+),(\\d+)\\]\\[(\\d+),(\\d+)\\]"`).exec(xml) ??
    new RegExp(`bounds="\\[(\\d+),(\\d+)\\]\\[(\\d+),(\\d+)\\]"[^>]*text="${escaped}"`).exec(xml);
  if (!match) return false;
  const x = Math.round((Number(match[1]) + Number(match[3])) / 2);
  const y = Math.round((Number(match[2]) + Number(match[4])) / 2);
  tap(x, y);
  execSync('powershell -Command "Start-Sleep -Seconds 2"', { stdio: 'inherit' });
  return true;
}

function hasJoinDetailSections(xml: string): boolean {
  return (
    xml.includes('기본 정보') &&
    xml.includes('모집 정보') &&
    xml.includes('참가 현황') &&
    !xml.includes('조인 상세')
  );
}

function waitForJoinDetailSections() {
  const flags = { basic: false, recruit: false, participants: false };
  const started = Date.now();
  while (Date.now() - started < 90_000) {
    const xml = dumpUiXml();
    if (xml.includes('기본 정보')) flags.basic = true;
    if (xml.includes('모집 정보')) flags.recruit = true;
    if (xml.includes('참가 현황')) flags.participants = true;
    if (flags.basic && flags.recruit && flags.participants && !xml.includes('조인 상세')) {
      console.log('waitForContent ok join detail sections without appbar title');
      return;
    }
    scrollDown();
    execSync('powershell -Command "Start-Sleep -Milliseconds 800"', { stdio: 'inherit' });
  }
  throw new Error('waitForContent timeout: join detail sections without appbar title');
}

function openJoinDetailFromList() {
  for (let i = 0; i < 4; i++) {
    const xml = dumpUiXml();
    const match =
      /text="(\[QA-CAPTURE[^\]]*\][^"]{0,80})"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/.exec(xml) ??
      /text="([^"]{8,60})"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/.exec(xml);
    if (match) {
      const x = Math.round((Number(match[2]) + Number(match[4])) / 2);
      const y = Math.round((Number(match[3]) + Number(match[5])) / 2);
      tap(x, y);
      execSync('powershell -Command "Start-Sleep -Seconds 3"', { stdio: 'inherit' });
      return;
    }
    scrollDown();
    execSync('powershell -Command "Start-Sleep -Seconds 1"', { stdio: 'inherit' });
  }
  deepLink(`join/${QA_CAPTURE_OPEN_JOIN_ID}`);
  execSync('powershell -Command "Start-Sleep -Seconds 3"', { stdio: 'inherit' });
}

function ensureJoinListHasCards() {
  for (let attempt = 0; attempt < 6; attempt++) {
    const xml = dumpUiXml();
    if (hasJoinListCards(xml)) return;
    if (attempt === 1) pullToRefresh();
    if (attempt === 2) tapRegionChip('내 주변');
    if (attempt === 3) tapRegionChip('광진구');
    if (attempt === 4) tapRegionChip('강남구');
    execSync('powershell -Command "Start-Sleep -Seconds 2"', { stdio: 'inherit' });
  }
}

function exitHarnessToTabs() {
  for (let i = 0; i < 4; i++) {
    adb('shell input keyevent 4');
    execSync('powershell -Command "Start-Sleep -Milliseconds 400"', { stdio: 'inherit' });
  }
}

function openTabRoute(route: string) {
  deepLink(route);
  execSync('powershell -Command "Start-Sleep -Seconds 2"', { stdio: 'inherit' });
  assertForeground();
}

function dumpUiXml(): string {
  const dumpRemote = '/sdcard/jjoin-ui-dump.xml';
  const dumpLocal = join(OUT, '_ui-dump.xml');
  adb(`shell uiautomator dump ${dumpRemote}`);
  execSync(`"${ADB}" pull ${dumpRemote} "${dumpLocal}"`, { stdio: 'inherit' });
  return readFileSync(dumpLocal, 'utf8');
}

function waitForContent(predicate: (xml: string) => boolean, label: string, timeoutMs = 60_000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const xml = dumpUiXml();
    if (predicate(xml)) {
      console.log('waitForContent ok', label);
      return;
    }
    execSync('powershell -Command "Start-Sleep -Seconds 2"', { stdio: 'inherit' });
  }
  throw new Error(`waitForContent timeout: ${label}`);
}

function finalRealData390() {
  ensureAppForeground();
  exitHarnessToTabs();
  reloadApp();

  tapTabLabel('홈');
  for (let i = 0; i < 4; i++) {
    const xml = dumpUiXml();
    if (hasHomeJoinCards(xml)) break;
    if (i === 1) pullToRefresh();
    execSync('powershell -Command "Start-Sleep -Seconds 2"', { stdio: 'inherit' });
  }
  waitForContent(hasHomeJoinCards, 'home recommendation cards', 90_000);
  scrollDown();
  screenshot('final-home-real-data-390.png', 2500);
  screenshot('home-recommendation-loaded-390.png', 500);

  tapTabLabel('조인');
  ensureJoinListHasCards();
  waitForContent(hasJoinListCards, 'join list cards', 90_000);
  screenshot('final-join-list-real-data-390.png', 2500);

  openJoinDetailFromList();
  waitForJoinDetailSections();
  for (let i = 0; i < 2; i++) scrollDown();
  screenshot('final-join-detail-real-data-390.png', 3000);
  screenshot('join-detail-no-appbar-390.png', 500);

  adb('shell input keyevent 4');
  execSync('powershell -Command "Start-Sleep -Seconds 2"', { stdio: 'inherit' });

  tapTabLabel('내 조인');
  waitForContent(
    (xml) =>
      xml.includes('내가 만든 조인') &&
      (xml.includes('진행·예정') || xml.includes('방장') || xml.includes('QA')),
    'my joins cards',
    90_000,
  );
  screenshot('final-my-joins-real-data-390.png', 2500);
}

function device390Screens() {
  ensureAppForeground();
  exitHarnessToTabs();

  openTabRoute('');
  tapTabLabel('홈');
  screenshot('app-home-390.png', 4000);
  scrollDown();
  screenshot('app-home-join-section-390.png', 3500);

  tapTabLabel('조인');
  screenshot('app-join-tab-390.png', 5000);

  tapTabLabel('내 조인');
  screenshot('app-my-joins-device-390.png', 4500);
  scrollDown();
  screenshot('app-my-joins-past-390.png', 3000);

  deepLink(`join/${DEV_QA_FOUR_PARTICIPANT_JOIN_ID}`);
  screenshot('app-join-detail-390.png', 5000);
}

async function main() {
  const mode = process.argv[2] ?? 'all';
  const devices = adb('devices').split('\n').slice(1).filter((l) => l.includes('\tdevice'));
  if (devices.length === 0) throw new Error('No adb device');

  console.log('device', devices[0]);

  if (mode === 'all' || mode === 'device390') {
    device390Screens();
  }

  if (mode === 'final390') {
    finalRealData390();
  }

  if (mode === 'all' || mode === 'harness') {
    for (const width of [360, 390, 430] as const) {
      for (const scene of ['join-list', 'join-detail', 'my-joins', 'home-join-card'] as const) {
        deepLink(`dev/join-figma-qa?width=${width}&scene=${scene}`);
        const file =
          scene === 'join-list'
            ? `app-join-list-${width}.png`
            : scene === 'join-detail'
              ? `app-join-detail-${width}.png`
              : scene === 'my-joins'
                ? `app-my-joins-${width}.png`
                : `app-home-join-card-${width}.png`;
        screenshot(file, 3500);
      }
    }

    deepLink('dev/join-figma-qa?width=390&scene=home-join-card');
    screenshot('app-home-join-card-390.png', 3000);
  }

  console.log('done', OUT);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
