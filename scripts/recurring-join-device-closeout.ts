/**
 * Recurring join Android device smoke — DEV only.
 *
 *   pnpm exec tsx scripts/recurring-join-device-closeout.ts
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  createAndroidDevQaHelpers,
  resolveAndroidDevQaConfig,
  assertDevelopmentTarget,
} from './lib/android-dev-qa.ts';

async function main() {
  const config = resolveAndroidDevQaConfig({
    screenshotDir: join(process.cwd(), 'artifacts', 'recurring-join-device-closeout'),
  });
  await assertDevelopmentTarget(config);
  const qa = createAndroidDevQaHelpers(config);
  mkdirSync(config.screenshotDir, { recursive: true });

  qa.ensureAdbReverse();
  qa.launchDevClient();
  await qa.waitForAppReady();
  await qa.logoutIfNeeded();
  await qa.loginPersona('DEV_A');

  qa.tapTab('MY');
  await qa.sleep(1200);
  qa.scrollDown();
  qa.assert(qa.uiHas('반복 조인'), 'MY 반복 조인 menu');
  qa.tapText('반복 조인');
  await qa.sleep(1500);
  qa.screenshot('01-my-recurring-list');
  qa.assert(qa.uiHas('반복 조인', '등록된'), 'recurring list screen');

  qa.deepLink('/(tabs)/create');
  await qa.sleep(2000);
  qa.assert(qa.uiHas('조인 만들기'), 'create screen');
  qa.screenshot('02-create-entry');

  const report = {
    ok: true,
    at: new Date().toISOString(),
    checks: ['my-recurring-route', 'create-entry'],
  };
  writeFileSync(join(config.screenshotDir, 'report.json'), JSON.stringify(report, null, 2));
  console.log('RECURRING_JOIN_DEVICE_SMOKE_PASS');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
