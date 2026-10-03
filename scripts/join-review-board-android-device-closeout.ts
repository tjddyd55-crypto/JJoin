/**
 * DEV device: community join review board (standalone + OTA).
 *   pnpm exec tsx scripts/join-review-board-android-device-closeout.ts
 */
import { join } from 'node:path';
import {
  assertDevelopmentTarget,
  createAndroidDevQaHelpers,
  resolveAndroidDevQaConfig,
} from './lib/android-dev-qa.ts';

const TAG = '[join-review-board-device]';

async function main() {
  const config = resolveAndroidDevQaConfig({
    screenshotDir: join(process.cwd(), 'artifacts', 'join-review-board-device'),
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

  if (!qa.tapText('쪼인 후기')) {
    qa.deepLink('reviews');
  }
  await qa.sleep(6000);

  qa.assert(qa.uiHas('쪼인 후기'), 'board title');
  qa.assert(qa.uiHas('글쓰기'), 'write CTA');
  qa.assert(!qa.uiHas('작성 가능'), 'legacy eligible tab must be gone');
  qa.assert(!qa.uiHas('내가 쓴 후기'), 'legacy mine tab must be gone');

  qa.screenshot('join-review-board-list.png');
  console.log(`${TAG} PASS`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
