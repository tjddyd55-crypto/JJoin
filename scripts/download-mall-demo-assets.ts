/**
 * Download DEV mall demo images from Pexels (free license).
 *
 *   pnpm exec tsx scripts/download-mall-demo-assets.ts
 *   pnpm exec tsx scripts/download-mall-demo-assets.ts --force
 *   pnpm exec tsx scripts/download-mall-demo-assets.ts --force arm-sleeve-cover.jpg
 *
 * Policy:
 * - download failure => exit 1 (no placeholder substitute)
 * - min file size enforced
 * - --force re-downloads even when file exists
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { MALL_DEMO_ASSET_DIR, listRequiredDemoAssetFiles } from './demo-mall-assets.ts';

const TAG = '[download-mall-demo-assets]';
const MIN_BYTES = 8_000;

type PexelsSource = {
  photoId: number;
  purpose: string;
};

/** fileName -> curated Pexels photo (product-matched, no dumbbell/portrait reuse). */
const PEXELS_SOURCES: Record<string, PexelsSource> = {
  // UV cap — product + mesh + field wear
  'uv-cap-mesh.jpg': { photoId: 7776110, purpose: 'cap mesh detail' },
  'uv-cap-content-3.jpg': { photoId: 1434842, purpose: 'cap field wear' },
  // Golf glove — grip / wrist / fabric
  'golf-glove-wrist.jpg': { photoId: 3998419, purpose: 'glove wrist band' },
  'golf-glove-content-3.jpg': { photoId: 3998419, purpose: 'glove care detail' },
  // Drink coupon
  'drink-coupon-content-2.jpg': { photoId: 302899, purpose: 'cafe lounge' },
  'drink-coupon-content-3.jpg': { photoId: 302896, purpose: 'drink exchange' },
  // Cooling arm sleeve — compression sleeve only (no gym/dumbbell)
  'arm-sleeve-cover.jpg': { photoId: 5477614, purpose: 'sleeve product' },
  'arm-sleeve-lifestyle.jpg': { photoId: 33449108, purpose: 'sleeve on arm outdoor' },
  'arm-sleeve-detail.jpg': { photoId: 3764011, purpose: 'sleeve fabric' },
  'arm-sleeve-content-1.jpg': { photoId: 3764012, purpose: 'sleeve stretch' },
  'arm-sleeve-content-2.jpg': { photoId: 3764013, purpose: 'sleeve mesh' },
  'arm-sleeve-content-3.jpg': { photoId: 4498294, purpose: 'sleeve pair product' },
  // Golf towel
  'towel-cover.jpg': { photoId: 4021872, purpose: 'towel product' },
  'towel-lifestyle.jpg': { photoId: 1556906, purpose: 'towel usage' },
  'towel-detail.jpg': { photoId: 1619690, purpose: 'towel fabric' },
  'towel-content-1.jpg': { photoId: 1556906, purpose: 'club wipe usage' },
  'towel-content-2.jpg': { photoId: 3998360, purpose: 'towel absorb detail' },
  'towel-content-3.jpg': { photoId: 3998358, purpose: 'carabiner hook' },
  // Practice golf balls
  'golf-ball-cover.jpg': { photoId: 6230159, purpose: 'golf balls product' },
  'golf-ball-package.jpg': { photoId: 209923, purpose: 'ball package' },
  'golf-ball-detail.jpg': { photoId: 5697262, purpose: 'ball dimple detail' },
  'golf-ball-content-1.jpg': { photoId: 5697262, purpose: 'ball close-up' },
  'golf-ball-content-2.jpg': { photoId: 6230159, purpose: 'balls on turf' },
  'golf-ball-content-3.jpg': { photoId: 209923, purpose: 'ball pouch storage' },
  // Putting mat
  'putting-mat-cover.jpg': { photoId: 2747449, purpose: 'indoor putting mat' },
  'putting-mat-lifestyle.jpg': { photoId: 2747453, purpose: 'home putting practice' },
  'putting-mat-detail.jpg': { photoId: 2747447, purpose: 'distance lines' },
  'putting-mat-content-1.jpg': { photoId: 2747453, purpose: 'indoor practice' },
  'putting-mat-content-2.jpg': { photoId: 2747447, purpose: 'alignment lines' },
  'putting-mat-content-3.jpg': { photoId: 2747450, purpose: 'fold storage' },
  // Screen golf pass
  'screen-pass-cover.jpg': { photoId: 3660204, purpose: 'simulator booth' },
  'screen-pass-lounge.jpg': { photoId: 6573702, purpose: 'screen lounge' },
  'screen-pass-booth.jpg': { photoId: 2624380, purpose: 'simulator bay' },
  'screen-pass-content-1.jpg': { photoId: 3660205, purpose: 'check-in' },
  'screen-pass-content-2.jpg': { photoId: 3660208, purpose: 'practice swing' },
  'screen-pass-content-3.jpg': { photoId: 3660212, purpose: 'voucher usage' },
};

function pexelsUrl(photoId: number, width = 1400): string {
  return `https://images.pexels.com/photos/${photoId}/pexels-photo-${photoId}.jpeg?auto=compress&cs=tinysrgb&w=${width}`;
}

function parseArgs(argv: string[]): { force: boolean; only: Set<string> | null } {
  const force = argv.includes('--force');
  const onlyIdx = argv.indexOf('--only');
  if (onlyIdx >= 0 && argv[onlyIdx + 1]) {
    return { force: true, only: new Set(argv[onlyIdx + 1].split(',').map((s) => s.trim())) };
  }
  const positional = argv.filter((a) => !a.startsWith('--') && a.endsWith('.jpg'));
  if (positional.length > 0) return { force: true, only: new Set(positional) };
  return { force, only: null };
}

async function download(fileName: string, source: PexelsSource): Promise<void> {
  const target = join(MALL_DEMO_ASSET_DIR, fileName);
  const res = await fetch(pexelsUrl(source.photoId));
  if (!res.ok) {
    throw new Error(
      `${TAG} download failed ${fileName} purpose=${source.purpose} photo=${source.photoId} status=${res.status}`,
    );
  }
  const bytes = Buffer.from(await res.arrayBuffer());
  if (bytes.length < MIN_BYTES) {
    throw new Error(
      `${TAG} file too small ${fileName} (${bytes.length} bytes) — likely invalid placeholder`,
    );
  }
  writeFileSync(target, bytes);
  console.log(`${TAG} saved ${fileName} purpose=${source.purpose} (${bytes.length} bytes)`);
}

function validateLocal(fileName: string): void {
  const target = join(MALL_DEMO_ASSET_DIR, fileName);
  if (!existsSync(target)) {
    throw new Error(`${TAG} missing required asset: ${fileName}`);
  }
  const bytes = readFileSync(target);
  if (bytes.length < MIN_BYTES) {
    throw new Error(`${TAG} asset too small: ${fileName} (${bytes.length} bytes)`);
  }
}

async function main() {
  const { force, only } = parseArgs(process.argv.slice(2));
  mkdirSync(MALL_DEMO_ASSET_DIR, { recursive: true });

  const required = listRequiredDemoAssetFiles();
  const pexelsManaged = required.filter((file) => PEXELS_SOURCES[file]);
  const committedOnly = required.filter((file) => !PEXELS_SOURCES[file]);

  for (const fileName of committedOnly) {
    validateLocal(fileName);
  }

  const targets = only
    ? pexelsManaged.filter((file) => only.has(file))
    : pexelsManaged.filter((file) => force || !existsSync(join(MALL_DEMO_ASSET_DIR, file)));

  if (targets.length === 0) {
    console.log(`${TAG} OK required=${required.length} committed=${committedOnly.length} pexels=${pexelsManaged.length}`);
    for (const fileName of required) validateLocal(fileName);
    return;
  }

  for (const fileName of targets) {
    const source = PEXELS_SOURCES[fileName];
    if (!source) {
      throw new Error(`${TAG} no Pexels source for: ${fileName}`);
    }
    await download(fileName, source);
  }

  for (const fileName of required) validateLocal(fileName);
  console.log(`${TAG} downloaded=${targets.length} total=${required.length}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
