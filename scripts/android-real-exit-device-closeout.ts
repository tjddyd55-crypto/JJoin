/**
 * DEV standalone: double-back complete exit + cold start (no Metro).
 *
 *   pnpm exec tsx scripts/android-real-exit-device-closeout.ts
 */
import { join } from 'node:path';
import {
  assertDevelopmentTarget,
  createAndroidDevQaHelpers,
  resolveAndroidDevQaConfig,
} from './lib/android-dev-qa.ts';

const TAG = '[real-exit-device]';
const EXIT_TOAST = '한 번 더 누르면 종료됩니다.';

async function pidOf(pkg: string, adb: (args: string[]) => string): Promise<string | null> {
  try {
    const out = adb(['shell', 'pidof', pkg]).trim();
    return out.length ? out.split(/\s+/)[0] ?? null : null;
  } catch {
    return null;
  }
}

async function pressBack(qa: ReturnType<typeof createAndroidDevQaHelpers>) {
  qa.adb(['shell', 'input', 'keyevent', '4']);
}

async function main() {
  const config = resolveAndroidDevQaConfig({
    screenshotDir: join(process.cwd(), 'artifacts', 'real-exit-device'),
  });
  await assertDevelopmentTarget(config);
  const qa = createAndroidDevQaHelpers(config);

  qa.adb(['shell', 'am', 'force-stop', config.pkg]);
  qa.adb(['shell', 'am', 'start', '-n', `${config.pkg}/.MainActivity`]);
  await qa.sleep(10000);

  if (qa.uiHas('카카오로 시작하기') || qa.uiHas('A 김진우')) {
    await qa.loginPersona('A 김진우');
    await qa.sleep(6000);
  }

  qa.tapTab('홈');
  await qa.sleep(2000);
  qa.assert(qa.uiHas('MY') || qa.uiHas('쪼인'), 'home tabs visible');

  await pressBack(qa);
  await qa.sleep(1200);
  qa.assert(qa.uiHas(EXIT_TOAST), 'first back shows exit toast');
  const pidAfterFirst = await pidOf(config.pkg, qa.adb);
  qa.assert(pidAfterFirst, 'app process still alive after first back');

  await qa.sleep(2500);
  await pressBack(qa);
  await qa.sleep(1200);
  qa.assert(qa.uiHas(EXIT_TOAST), 'back after 2s+ should show toast again, not exit');
  qa.assert(await pidOf(config.pkg, qa.adb), 'app still alive after timeout back');

  qa.tapTab('홈');
  await qa.sleep(1500);
  await pressBack(qa);
  await qa.sleep(800);
  await pressBack(qa);
  await qa.sleep(2000);

  const pidAfterExit = await pidOf(config.pkg, qa.adb);
  qa.assert(!pidAfterExit, `process should exit (pid=${pidAfterExit ?? 'none'})`);

  qa.adb(['shell', 'am', 'start', '-n', `${config.pkg}/.MainActivity`]);
  await qa.sleep(8000);
  qa.assert(
    qa.uiHas('카카오로 시작하기') === false && (qa.uiHas('MY') || qa.uiHas('쪼인')),
    'cold start keeps session (home visible, no login gate)',
  );

  qa.screenshot('cold-start-after-exit.png');
  console.log(`${TAG} PASS`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
