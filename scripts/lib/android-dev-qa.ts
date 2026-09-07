/**
 * Shared Android Dev Client QA helpers (physical device + DEV API only).
 *
 * Reused by device closeout / persona-switch / stabilization smoke scripts.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export const DEFAULT_DEV_API = 'https://api-development-e387.up.railway.app';
export const DEFAULT_DEV_PKG = 'com.jjoin.app.dev';
export const DEFAULT_METRO_URL = 'http://127.0.0.1:8082';

export type AndroidDevQaConfig = {
  apiBase: string;
  device: string;
  pkg: string;
  adbPath: string;
  uiDumpRemote: string;
  screenshotDir: string;
};

export type AndroidDevQaHelpers = AndroidDevQaConfig & {
  adb: (args: string[]) => string;
  sleep: (ms: number) => Promise<void>;
  sleepSync: (ms: number) => void;
  assert: (cond: unknown, msg: string) => asserts cond;
  dumpUiXml: () => string;
  uiHas: (...needles: string[]) => boolean;
  tapText: (label: string) => boolean;
  tapTab: (label: string) => void;
  screenshot: (name: string) => void;
  ensureAdbReverse: () => void;
  launchDevClient: () => void;
  deepLink: (path: string) => void;
  waitForAppReady: (timeoutMs?: number) => Promise<void>;
  logoutIfNeeded: () => Promise<void>;
  loginPersona: (chipLabel: string) => Promise<void>;
  dismissKeyboard: () => void;
  clearSearchField: () => void;
  pasteSearchQuery: (text: string) => boolean;
  tapSearchInput: () => boolean;
  waitForUiHas: (needle: string, timeoutMs?: number) => boolean;
  scrollDown: () => void;
  clearNotifs: () => void;
  trayHit: (needles: string[]) => boolean;
  waitTray: (needles: string[], label: string, timeoutMs?: number) => Promise<boolean>;
  triggerNotificationDelivery: () => void;
};

export function resolveAndroidDevQaConfig(
  partial?: Partial<AndroidDevQaConfig>,
): AndroidDevQaConfig {
  return {
    apiBase: (partial?.apiBase ?? process.env.API_BASE ?? DEFAULT_DEV_API).replace(/\/$/, ''),
    device: partial?.device ?? process.env.ADB_DEVICE ?? 'R3KL202KGHF',
    pkg: partial?.pkg ?? process.env.ANDROID_PKG ?? DEFAULT_DEV_PKG,
    adbPath:
      partial?.adbPath ??
      process.env.ADB_PATH ??
      `${process.env.LOCALAPPDATA ?? ''}\\Android\\Sdk\\platform-tools\\adb.exe`,
    uiDumpRemote: partial?.uiDumpRemote ?? '/sdcard/jjoin-dev-qa-ui.xml',
    screenshotDir: partial?.screenshotDir ?? join(process.cwd(), 'artifacts', 'mobile-qa'),
  };
}

export async function assertDevelopmentTarget(config: AndroidDevQaConfig): Promise<void> {
  const api = config.apiBase.toLowerCase();
  if (api.includes('production') || api.includes('api-production')) {
    throw new Error(`Refusing non-development API_BASE: ${config.apiBase}`);
  }
  if (!config.pkg.endsWith('.dev') && config.pkg !== 'com.jjoin.app.dev') {
    throw new Error(`Refusing non-development Android package: ${config.pkg}`);
  }

  const res = await fetch(`${config.apiBase}/health`, { signal: AbortSignal.timeout(12_000) });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`/health failed: ${res.status} ${text.slice(0, 200)}`);
  }
  const health = JSON.parse(text) as {
    appVariant?: string;
    railwayEnvironment?: string;
    env?: string;
  };
  if (health.appVariant && health.appVariant !== 'development') {
    throw new Error(`Refusing API appVariant=${health.appVariant}`);
  }
  if (health.railwayEnvironment && health.railwayEnvironment !== 'development') {
    throw new Error(`Refusing railwayEnvironment=${health.railwayEnvironment}`);
  }
  if (!health.appVariant && health.env === 'production') {
    throw new Error('Refusing production API env from /health');
  }
}

export async function assertMetroRunning(url = DEFAULT_METRO_URL): Promise<string> {
  const res = await fetch(`${url}/status`, { signal: AbortSignal.timeout(8000) });
  const body = await res.text();
  if (!res.ok || !body.includes('packager-status:running')) {
    throw new Error(`Metro not running at ${url}: ${body.slice(0, 120)}`);
  }
  return body;
}

export function createAndroidDevQaHelpers(
  partial?: Partial<AndroidDevQaConfig>,
): AndroidDevQaHelpers {
  const config = resolveAndroidDevQaConfig(partial);
  const { adbPath, device, pkg, uiDumpRemote, screenshotDir } = config;

  function adb(args: string[]): string {
    return execFileSync(adbPath, ['-s', device, ...args], {
      encoding: 'utf8',
      maxBuffer: 16 * 1024 * 1024,
    });
  }

  const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

  function sleepSync(ms: number) {
    execFileSync('powershell', ['-Command', `Start-Sleep -Milliseconds ${ms}`], {
      stdio: 'ignore',
    });
  }

  function assert(cond: unknown, msg: string): asserts cond {
    if (!cond) throw new Error(msg);
  }

  function dumpUiXml(): string {
    const local = join(tmpdir(), `jjoin-dev-qa-ui-${Date.now()}.xml`);
    for (let i = 0; i < 3; i++) {
      try {
        adb(['shell', 'uiautomator', 'dump', uiDumpRemote]);
        adb(['pull', uiDumpRemote, local]);
        return readFileSync(local, 'utf8');
      } catch {
        if (i < 2) sleepSync(1000);
      } finally {
        try {
          unlinkSync(local);
        } catch {
          /* ignore */
        }
      }
    }
    throw new Error('uiautomator dump failed');
  }

  function uiHas(...needles: string[]): boolean {
    const xml = dumpUiXml();
    return needles.every((n) => xml.includes(n));
  }

  function tapText(label: string): boolean {
    const xml = dumpUiXml();
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const patterns = [
      new RegExp(`text="${escaped}"[^>]*bounds="\\[(\\d+),(\\d+)\\]\\[(\\d+),(\\d+)\\]"`),
      new RegExp(`content-desc="${escaped}"[^>]*bounds="\\[(\\d+),(\\d+)\\]\\[(\\d+),(\\d+)\\]"`),
      new RegExp(
        `bounds="\\[(\\d+),(\\d+)\\]\\[(\\d+),(\\d+)\\]"[^>]*(?:text|content-desc)="${escaped}"`,
      ),
    ];
    for (const pattern of patterns) {
      const match = pattern.exec(xml);
      if (!match) continue;
      const x = Math.round((Number(match[1]) + Number(match[3])) / 2);
      const y = Math.round((Number(match[2]) + Number(match[4])) / 2);
      adb(['shell', 'input', 'tap', String(x), String(y)]);
      return true;
    }
    return false;
  }

  function tapTab(label: string) {
    const xml = dumpUiXml();
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const tabRe = new RegExp(
      `content-desc="${escaped}"[^>]*bounds="\\[(\\d+),(\\d+)\\]\\[(\\d+),(\\d+)\\]"`,
    );
    const tabMatch = tabRe.exec(xml);
    if (tabMatch) {
      const x = Math.round((Number(tabMatch[1]) + Number(tabMatch[3])) / 2);
      const y = Math.round((Number(tabMatch[2]) + Number(tabMatch[4])) / 2);
      adb(['shell', 'input', 'tap', String(x), String(y)]);
      return;
    }
    if (tapText(label)) return;
    const order = ['홈', '조인', '스크린', '내 조인', 'MY'];
    const idx = order.indexOf(label);
    if (idx < 0) throw new Error(`tab not found: ${label}`);
    const size = adb(['shell', 'wm', 'size']);
    const m = size.match(/(\d+)x(\d+)/);
    const w = m ? Number(m[1]) : 1080;
    const h = m ? Number(m[2]) : 2340;
    adb(['shell', 'input', 'tap', String(Math.round(((idx + 0.5) / 5) * w)), String(h - 220)]);
  }

  function screenshot(name: string) {
    mkdirSync(screenshotDir, { recursive: true });
    const out = join(screenshotDir, name);
    const remote = `/sdcard/jjoin-qa-${name}`;
    adb(['shell', 'screencap', '-p', remote]);
    adb(['pull', remote, out]);
    adb(['shell', 'rm', '-f', remote]);
    console.log('screenshot', out);
  }

  function ensureAdbReverse() {
    const list = adb(['reverse', '--list']);
    if (!list.includes('tcp:8082')) adb(['reverse', 'tcp:8082', 'tcp:8082']);
    if (!list.includes('tcp:3000')) adb(['reverse', 'tcp:3000', 'tcp:3000']);
  }

  function launchDevClient() {
    ensureAdbReverse();
    adb(['shell', 'am', 'force-stop', pkg]);
    adb([
      'shell',
      'am',
      'start',
      '-a',
      'android.intent.action.VIEW',
      '-d',
      `jjoindev://expo-development-client/?url=${DEFAULT_METRO_URL}`,
      '-p',
      pkg,
    ]);
  }

  function deepLink(path: string) {
    const normalized = path.startsWith('/') ? path.slice(1) : path;
    const url = `jjoindev://${normalized.replace(/\(/g, '%28').replace(/\)/g, '%29')}`;
    adb(['shell', 'am', 'start', '-a', 'android.intent.action.VIEW', '-d', url, '-p', pkg]);
  }

  async function waitForAppReady(timeoutMs = 90000) {
    const t0 = Date.now();
    while (Date.now() - t0 < timeoutMs) {
      if (
        uiHas('problem loading', 'project') ||
        uiHas('ConnectException', '127.0.0.1')
      ) {
        tapText('Reload');
        await sleep(6000);
        continue;
      }
      if (
        uiHas('카카오', '로그인') ||
        uiHas('카카오로 시작하기') ||
        uiHas('A 김진우') ||
        uiHas('B 박민수') ||
        uiHas('홈') ||
        uiHas('MY') ||
        uiHas('조인')
      ) {
        return;
      }
      await sleep(2000);
    }
    throw new Error('app boot timeout');
  }

  async function logoutIfNeeded() {
    launchDevClient();
    await waitForAppReady();
    if (uiHas('카카오로 시작하기') || uiHas('카카오', '로그인')) return;
    tapTab('MY');
    await sleep(2000);
    for (let i = 0; i < 4; i++) {
      adb(['shell', 'input', 'swipe', '540', '1800', '540', '400', '450']);
      await sleep(700);
      if (tapText('로그아웃')) break;
    }
    await sleep(3000);
    if (!uiHas('카카오로 시작하기') && !uiHas('카카오', '로그인')) {
      launchDevClient();
      await waitForAppReady();
    }
  }

  async function loginPersona(chipLabel: string) {
    await sleep(2000);
    if (!uiHas('카카오로 시작하기') && !uiHas('카카오', '로그인')) {
      if (uiHas('홈') || uiHas('MY')) return;
    }
    assert(tapText(chipLabel), `dev chip not found: ${chipLabel}`);
    await sleep(400);
    assert(
      tapText('카카오로 시작하기') || tapText('카카오') || tapText('카카오로 로그인'),
      'kakao login missing',
    );
    for (let i = 0; i < 15; i++) {
      await sleep(2000);
      if (uiHas('홈') || uiHas('MY')) return;
    }
    throw new Error('login timeout');
  }

  function dismissKeyboard() {
    adb(['shell', 'input', 'tap', '200', '180']);
    sleepSync(400);
  }

  function clearSearchField() {
    for (let i = 0; i < 24; i++) adb(['shell', 'input', 'keyevent', '67']);
  }

  function pasteSearchQuery(text: string) {
    const ascii = text.replace(/[^A-Za-z0-9_]/g, '');
    if (ascii.length >= 2) {
      adb(['shell', 'input', 'text', ascii]);
      return true;
    }
    return tapText(text) || tapText(text.split('_')[0] ?? text);
  }

  function tapSearchInput(): boolean {
    const xml = dumpUiXml();
    const patterns = [
      /class="android.widget.EditText"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/,
      /hint="닉네임[^"]*"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/,
      /text="닉네임 검색[^"]*"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/,
    ];
    for (const pattern of patterns) {
      const match = pattern.exec(xml);
      if (!match) continue;
      const x = Math.round((Number(match[1]) + Number(match[3])) / 2);
      const y = Math.round((Number(match[2]) + Number(match[4])) / 2);
      adb(['shell', 'input', 'tap', String(x), String(y)]);
      return true;
    }
    adb(['shell', 'input', 'tap', '540', '390']);
    return true;
  }

  function waitForUiHas(needle: string, timeoutMs = 20000): boolean {
    const t0 = Date.now();
    while (Date.now() - t0 < timeoutMs) {
      if (uiHas(needle)) return true;
      adb(['shell', 'input', 'swipe', '540', '1200', '540', '700', '350']);
      sleepSync(600);
    }
    return uiHas(needle);
  }

  function scrollDown() {
    adb(['shell', 'input', 'swipe', '540', '1600', '540', '900', '400']);
  }

  function clearNotifs() {
    try {
      adb(['shell', 'cmd', 'notification', 'cancel-all', pkg]);
    } catch {
      /* ignore */
    }
  }

  function trayHit(needles: string[]): boolean {
    const dump = adb(['shell', 'dumpsys', 'notification', '--noredact']);
    return needles.some((n) => dump.includes(n) && dump.includes(pkg));
  }

  async function waitTray(needles: string[], label: string, timeoutMs = 60000) {
    const t0 = Date.now();
    while (Date.now() - t0 < timeoutMs) {
      if (trayHit(needles)) {
        console.log('TRAY_HIT', label);
        return true;
      }
      await sleep(2500);
    }
    console.warn('TRAY_MISS', label);
    return false;
  }

  function triggerNotificationDelivery() {
    try {
      execFileSync(
        'pnpm',
        [
          'exec',
          'railway',
          'run',
          '--service',
          'notification-delivery-cron',
          '--environment',
          'development',
          '--',
          'pnpm',
          'notification-delivery',
        ],
        { encoding: 'utf8', cwd: process.cwd(), stdio: 'pipe', timeout: 120_000, shell: true },
      );
    } catch {
      /* optional */
    }
  }

  return {
    ...config,
    adb,
    sleep,
    sleepSync,
    assert,
    dumpUiXml,
    uiHas,
    tapText,
    tapTab,
    screenshot,
    ensureAdbReverse,
    launchDevClient,
    deepLink,
    waitForAppReady,
    logoutIfNeeded,
    loginPersona,
    dismissKeyboard,
    clearSearchField,
    pasteSearchQuery,
    tapSearchInput,
    waitForUiHas,
    scrollDown,
    clearNotifs,
    trayHit,
    waitTray,
    triggerNotificationDelivery,
  };
}
