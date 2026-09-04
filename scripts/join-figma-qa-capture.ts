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
    throw new Error(`tab label not found in UI dump: ${label}`);
  }
  const x = Math.round((Number(match[1]) + Number(match[3])) / 2);
  const y = Math.round((Number(match[2]) + Number(match[4])) / 2);
  tap(x, y);
  console.log('tapTabLabel', label, x, y);
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
