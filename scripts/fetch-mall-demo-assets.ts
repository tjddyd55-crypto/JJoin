/**
 * Verify DEV mall demo image assets exist locally.
 * Assets are committed under apps/mobile/assets/demo/mall/.
 *
 *   pnpm exec tsx scripts/fetch-mall-demo-assets.ts
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { MALL_DEMO_ASSET_DIR, listRequiredDemoAssetFiles } from './demo-mall-assets.ts';

const TAG = '[fetch-mall-demo-assets]';

function main() {
  const missing: string[] = [];
  for (const fileName of listRequiredDemoAssetFiles()) {
    const target = join(MALL_DEMO_ASSET_DIR, fileName);
    if (!existsSync(target)) missing.push(fileName);
  }
  if (missing.length > 0) {
    throw new Error(`${TAG} missing assets: ${missing.join(', ')}`);
  }
  console.log(`${TAG} OK files=${listRequiredDemoAssetFiles().length}`);
}

main();
