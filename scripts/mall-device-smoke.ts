/**
 * Join Mall — Android DEV device smoke (Figma-aligned list/detail/confirm).
 *
 *   $env:API_BASE='https://api-development-e387.up.railway.app'
 *   pnpm exec tsx scripts/mall-device-smoke.ts
 */
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { MockAuthPersona, SocialProvider } from '../packages/types/src/index.ts';
import {
  assertDevelopmentTarget,
  assertMetroRunning,
  createAndroidDevQaHelpers,
} from './lib/android-dev-qa.ts';

const OUT = join(process.cwd(), 'artifacts', 'mall-device-qa');
const qa = createAndroidDevQaHelpers({ screenshotDir: OUT });
const {
  apiBase,
  assert,
  sleep,
  tapText,
  tapTab,
  screenshot,
  launchDevClient,
  waitForAppReady,
  loginPersona,
  deepLink,
  uiHas,
  scrollDown,
  waitForUiHas,
} = qa;

async function json<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${apiBase}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${path} -> ${res.status} ${text.slice(0, 400)}`);
  return JSON.parse(text) as T;
}

async function signIn(persona: MockAuthPersona) {
  const s = await json<{ session: { accessToken: string } }>('/auth/social/mock-sign-in', {
    method: 'POST',
    body: JSON.stringify({ provider: SocialProvider.KAKAO, persona }),
  });
  return s.session.accessToken;
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  await assertDevelopmentTarget(qa);
  console.log('METRO', await assertMetroRunning());
  qa.ensureAdbReverse();

  const token = await signIn(MockAuthPersona.DEV_A);
  const products = await json<{
    items: Array<{ id: string; name: string }>;
  }>('/mall/products', { headers: { Authorization: `Bearer ${token}` } });
  assert(products.items.length > 0, 'no mall products on DEV API');
  const target =
    products.items.find((p) => p.name.includes('골프공 세트')) ??
    products.items.find((p) => p.name.includes('골프')) ??
    products.items[0]!;
  await qa.ensureDevClientConnected({ retries: 4, forceStopOnRetry: true });
  if (uiHas('Dismiss')) {
    tapText('Dismiss');
    await sleep(1500);
  }
  await loginPersona('A 김진우');

  deepLink('mall');
  await sleep(3500);
  screenshot('mall-list.png');
  assert(uiHas('쪼인몰'), 'mall list title');
  assert(uiHas('코인') || uiHas('C'), 'header coin pill or coin label');

  deepLink(`mall/${target.id}`);
  await sleep(4000);
  screenshot('mall-detail.png');
  assert(uiHas('코인') || uiHas('C'), 'detail coin price');
  assert(uiHas('구매') || uiHas('교환'), 'purchase CTA on detail');

  if (tapText('구매') || tapText('교환하기') || tapText('코인으로')) {
    await sleep(2500);
    screenshot('mall-confirm.png');
    assert(
      uiHas('구매') || uiHas('확인') || uiHas('코인'),
      'purchase confirm screen',
    );
  } else {
    deepLink(`mall/confirm?productId=${target.id}`);
    await sleep(2500);
    screenshot('mall-confirm-deeplink.png');
    assert(waitForUiHas('구매', 8000) || waitForUiHas('코인', 8000), 'confirm via deeplink');
  }

  console.log('MALL_DEVICE_SMOKE_PASS product=', target.id);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
