/**
 * Download missing DEV mall demo images from Pexels (free license).
 * Committed assets are reused; only missing files are fetched.
 *
 *   pnpm exec tsx scripts/download-mall-demo-assets.ts
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { MALL_DEMO_ASSET_DIR, listRequiredDemoAssetFiles } from './demo-mall-assets.ts';

const TAG = '[download-mall-demo-assets]';

/** fileName -> Pexels photo id */
const PEXELS_SOURCES: Record<string, number> = {
  // UV cap extras
  'uv-cap-mesh.jpg': 7776110,
  'uv-cap-content-3.jpg': 1434842,
  // Golf glove extras
  'golf-glove-wrist.jpg': 1325732,
  'golf-glove-content-3.jpg': 3998419,
  // Drink coupon extras
  'drink-coupon-content-2.jpg': 302899,
  'drink-coupon-content-3.jpg': 302896,
  // Cooling arm sleeve
  'arm-sleeve-cover.jpg': 4498294,
  'arm-sleeve-lifestyle.jpg': 1325732,
  'arm-sleeve-detail.jpg': 3764011,
  'arm-sleeve-content-1.jpg': 6550981,
  'arm-sleeve-content-2.jpg': 3764012,
  'arm-sleeve-content-3.jpg': 3764013,
  // Soft golf towel
  'towel-cover.jpg': 3998357,
  'towel-lifestyle.jpg': 1325732,
  'towel-detail.jpg': 1619690,
  'towel-content-1.jpg': 1556906,
  'towel-content-2.jpg': 3998360,
  'towel-content-3.jpg': 3998358,
  // Practice golf ball 6-pack
  'golf-ball-cover.jpg': 6230159,
  'golf-ball-package.jpg': 1325732,
  'golf-ball-detail.jpg': 5697262,
  'golf-ball-content-1.jpg': 209923,
  'golf-ball-content-2.jpg': 6230159,
  'golf-ball-content-3.jpg': 1685083,
  // Home putting mat
  'putting-mat-cover.jpg': 1685083,
  'putting-mat-lifestyle.jpg': 2747449,
  'putting-mat-detail.jpg': 1325732,
  'putting-mat-content-1.jpg': 2747453,
  'putting-mat-content-2.jpg': 2747447,
  'putting-mat-content-3.jpg': 2747450,
  // Screen golf practice pass
  'screen-pass-cover.jpg': 3660204,
  'screen-pass-lounge.jpg': 6573702,
  'screen-pass-booth.jpg': 2624380,
  'screen-pass-content-1.jpg': 3660205,
  'screen-pass-content-2.jpg': 3660208,
  'screen-pass-content-3.jpg': 3660212,
};

function pexelsUrl(photoId: number, width = 1400): string {
  return `https://images.pexels.com/photos/${photoId}/pexels-photo-${photoId}.jpeg?auto=compress&cs=tinysrgb&w=${width}`;
}

async function download(fileName: string, photoId: number): Promise<void> {
  const target = join(MALL_DEMO_ASSET_DIR, fileName);
  const res = await fetch(pexelsUrl(photoId));
  if (!res.ok) {
    throw new Error(`${TAG} download failed ${fileName} photo=${photoId} status=${res.status}`);
  }
  const bytes = Buffer.from(await res.arrayBuffer());
  writeFileSync(target, bytes);
  console.log(`${TAG} saved ${fileName} (${bytes.length} bytes)`);
}

async function main() {
  mkdirSync(MALL_DEMO_ASSET_DIR, { recursive: true });
  const required = listRequiredDemoAssetFiles();
  const missing = required.filter((file) => !existsSync(join(MALL_DEMO_ASSET_DIR, file)));
  if (missing.length === 0) {
    console.log(`${TAG} all ${required.length} assets present`);
    return;
  }

  for (const fileName of missing) {
    const photoId = PEXELS_SOURCES[fileName];
    if (!photoId) {
      throw new Error(`${TAG} no Pexels source for missing file: ${fileName}`);
    }
    await download(fileName, photoId);
  }
  console.log(`${TAG} downloaded ${missing.length} files`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
