/**
 * Photorealistic DEV assets live in the repo and upload to R2 under
 * development/investor-demo/v2/… — never production/.
 */
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { INVESTOR_DEMO_BATCH_VERSION } from './investor-demo-joins.ts';
import { DEMO_PERSONAS } from './investor-demo-personas.ts';
import { DEMO_BANNERS, DEMO_CLUBS, DEMO_STORES } from './investor-demo-venues.ts';

export const INVESTOR_DEMO_ASSET_ENV = 'development';
export const INVESTOR_DEMO_ASSET_DIR = join(
  process.cwd(),
  'apps/mobile/assets/demo/investor',
  INVESTOR_DEMO_BATCH_VERSION,
);

export const MIN_ASSET_BYTES = 12_000;

export type DemoAssetKind = 'avatars' | 'stores' | 'banners' | 'field' | 'clubs';

export type DemoAssetRef = {
  kind: DemoAssetKind;
  slug: string;
  fileName: string;
  objectKey: string;
  localPath: string;
};

export function demoObjectKey(kind: DemoAssetKind, fileName: string): string {
  return `${INVESTOR_DEMO_ASSET_ENV}/investor-demo/${INVESTOR_DEMO_BATCH_VERSION}/${kind}/${fileName}`;
}

export function resolveDemoAssetPath(kind: DemoAssetKind, fileName: string): string {
  return join(INVESTOR_DEMO_ASSET_DIR, kind, fileName);
}

export function personaAvatarRef(slug: string): DemoAssetRef {
  const fileName = `${slug}.jpg`;
  return {
    kind: 'avatars',
    slug,
    fileName,
    objectKey: demoObjectKey('avatars', fileName),
    localPath: resolveDemoAssetPath('avatars', fileName),
  };
}

export function storeCoverRef(slug: string): DemoAssetRef {
  const fileName = `${slug}-cover.jpg`;
  return {
    kind: 'stores',
    slug,
    fileName,
    objectKey: demoObjectKey('stores', fileName),
    localPath: resolveDemoAssetPath('stores', fileName),
  };
}

export function storeGalleryRef(slug: string, index: number): DemoAssetRef {
  const fileName = `${slug}-g${index}.jpg`;
  return {
    kind: 'stores',
    slug: `${slug}-g${index}`,
    fileName,
    objectKey: demoObjectKey('stores', fileName),
    localPath: resolveDemoAssetPath('stores', fileName),
  };
}

export function bannerAssetRef(slug: string): DemoAssetRef {
  const fileName = `${slug}.jpg`;
  return {
    kind: 'banners',
    slug,
    fileName,
    objectKey: demoObjectKey('banners', fileName),
    localPath: resolveDemoAssetPath('banners', fileName),
  };
}

export function fieldAssetRef(slug: string): DemoAssetRef {
  const fileName = `${slug}.jpg`;
  return {
    kind: 'field',
    slug,
    fileName,
    objectKey: demoObjectKey('field', fileName),
    localPath: resolveDemoAssetPath('field', fileName),
  };
}

export function clubAssetRef(kind: 'field' | 'screen' | 'clubhouse'): DemoAssetRef {
  return fieldAssetRef(kind);
}

export function listRequiredDemoAssets(): DemoAssetRef[] {
  const refs: DemoAssetRef[] = [];
  for (const persona of DEMO_PERSONAS) refs.push(personaAvatarRef(persona.slug));
  for (const store of DEMO_STORES) {
    refs.push(storeCoverRef(store.slug));
    for (let i = 1; i < store.galleryCount; i += 1) {
      refs.push(storeGalleryRef(store.slug, i));
    }
  }
  for (const banner of DEMO_BANNERS) refs.push(bannerAssetRef(banner.slug));
  refs.push(fieldAssetRef('field'), fieldAssetRef('screen'), fieldAssetRef('clubhouse'));
  return refs;
}

export function inspectDemoAssets(): {
  required: number;
  present: number;
  missing: string[];
  tooSmall: string[];
} {
  const missing: string[] = [];
  const tooSmall: string[] = [];
  const required = listRequiredDemoAssets();
  for (const ref of required) {
    if (!existsSync(ref.localPath)) {
      missing.push(ref.fileName);
      continue;
    }
    if (statSync(ref.localPath).size < MIN_ASSET_BYTES) tooSmall.push(`${ref.fileName}(${statSync(ref.localPath).size})`);
  }
  return {
    required: required.length,
    present: required.length - missing.length,
    missing,
    tooSmall,
  };
}

export function readDemoAsset(ref: DemoAssetRef): Buffer {
  return readFileSync(ref.localPath);
}

export function assetFingerprint(body: Buffer): string {
  return createHash('sha256').update(body).digest('hex').slice(0, 16);
}

export function listPresentAssetFiles(kind: DemoAssetKind): string[] {
  const dir = join(INVESTOR_DEMO_ASSET_DIR, kind);
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((name) => /\.(jpg|jpeg|png|webp)$/i.test(name));
}

export function resolvePublicAssetUrl(objectKey: string): string {
  const base = (process.env.R2_PUBLIC_BASE_URL ?? '').trim().replace(/\/+$/, '');
  if (!base) return objectKey;
  const https = base.startsWith('http://') ? base.replace('http://', 'https://') : base;
  return `${https}/${objectKey}`;
}
