/**
 * DEV physical device: MY 쪼인 후기 hub smoke (standalone, no Metro).
 *
 *   pnpm exec tsx scripts/join-session-review-android-device-closeout.ts
 */
import { join } from 'node:path';
import {
  assertDevelopmentTarget,
  createAndroidDevQaHelpers,
  resolveAndroidDevQaConfig,
} from './lib/android-dev-qa.ts';

const TAG = '[join-session-review-device]';

async function main() {
  const config = resolveAndroidDevQaConfig({
    screenshotDir: join(process.cwd(), 'artifacts', 'join-session-review-device'),
  });
  await assertDevelopmentTarget(config);
  const qa = createAndroidDevQaHelpers(config);

  qa.adb(['shell', 'am', 'force-stop', config.pkg]);
  qa.adb(['shell', 'am', 'start', '-n', `${config.pkg}/.MainActivity`]);
  await qa.sleep(8000);

  if (qa.uiHas('카카오로 시작하기') || qa.uiHas('A 김진우')) {
    await qa.loginPersona('A 김진우');
    await qa.sleep(4000);
  }

  qa.deepLink('my/join-session-reviews');
  await qa.sleep(5000);

  qa.assert(qa.uiHas('쪼인 후기'), 'MY hub title must be 쪼인 후기');
  qa.assert(!qa.uiHas('조인 후기'), 'must not show 조인 후기');
  qa.assert(qa.uiHas('작성 가능'), 'eligible tab');
  qa.assert(qa.uiHas('내가 쓴 후기'), 'mine tab');
  qa.assert(qa.uiHas('QA-JOIN-SESSION-REVIEW'), 'seeded FIELD or SCREEN card');

  qa.screenshot('join-session-reviews-hub.png');
  console.log(`${TAG} PASS`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
