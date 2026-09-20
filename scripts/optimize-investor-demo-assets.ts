/**
 * Copy generated photoreal assets into repo paths and compress for mobile.
 */
import { mkdirSync, readdirSync } from 'node:fs';
import { basename, join } from 'node:path';
import sharp from 'sharp';
import { INVESTOR_DEMO_ASSET_DIR, listRequiredDemoAssets } from './lib/investor-demo-assets.ts';

const SOURCE_DIRS = [
  '/opt/cursor/artifacts/assets',
  join(process.cwd(), 'artifacts/assets'),
];

function findSource(fileName: string): string | null {
  for (const dir of SOURCE_DIRS) {
    try {
      const names = readdirSync(dir);
      const match = names.find((name) => name === fileName || name === fileName.replace(/\.jpg$/i, '.png'));
      if (match) return join(dir, match);
    } catch {
      /* missing dir */
    }
  }
  return null;
}

function sourceNameFor(kind: string, slug: string, fileName: string): string[] {
  if (kind === 'avatars') return [`investor_avatar_${slug}.png`, `${slug}.png`];
  if (kind === 'stores') {
    const stem = fileName.replace(/\.jpg$/, '');
    return [`investor_store_${stem.replace('-', '_')}.png`, `investor_store_${stem}.png`];
  }
  if (kind === 'banners') {
    return [`investor_banner_${slug}.png`, `investor_banner_${slug.replace(/-/g, '_')}.png`];
  }
  if (kind === 'field') {
    return [`investor_field_${slug}.png`, `investor_field_${slug.replace(/-/g, '_')}.png`];
  }
  return [];
}

async function writeOptimized(src: string, dest: string, kind: string): Promise<void> {
  mkdirSync(join(dest, '..'), { recursive: true });
  const image = sharp(src).rotate();
  const jpeg = image.jpeg({ quality: kind === 'avatars' ? 78 : 80, mozjpeg: true });
  if (kind === 'avatars') {
    await jpeg.resize(720, 960, { fit: 'cover' }).toFile(dest);
    return;
  }
  await jpeg.resize(1280, 720, { fit: 'cover' }).toFile(dest);
}

async function main(): Promise<void> {
  const required = listRequiredDemoAssets();
  const missing: string[] = [];
  let written = 0;
  for (const ref of required) {
    const candidates = [
      ...sourceNameFor(ref.kind, ref.slug, ref.fileName),
      ref.fileName.replace('.jpg', '.png'),
      basename(ref.localPath).replace('.jpg', '.png'),
    ];
    let src: string | null = null;
    for (const name of candidates) {
      src = findSource(name);
      if (src) break;
    }
    // stores use slug like gangnam-g1 — generated as investor_store_gangnam_g1.png
    if (!src && ref.kind === 'stores') {
      src = findSource(`investor_store_${ref.fileName.replace(/-/g, '_').replace('.jpg', '.png')}`);
    }
    if (!src) {
      missing.push(ref.fileName);
      continue;
    }
    await writeOptimized(src, ref.localPath, ref.kind);
    written += 1;
  }
  console.log(`optimized ${written}/${required.length}`);
  if (missing.length) console.log(`missing sources: ${missing.join(', ')}`);
  if (missing.length) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
