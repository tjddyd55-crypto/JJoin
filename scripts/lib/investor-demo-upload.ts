/**
 * Upload repo photoreal assets to DEV R2 only.
 * Never writes production/ keys. Skips when R2 is not configured.
 */
import { HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { INVESTOR_DEMO_TAG } from './investor-demo-guard.ts';
import {
  INVESTOR_DEMO_ASSET_ENV,
  inspectDemoAssets,
  listRequiredDemoAssets,
  readDemoAsset,
  type DemoAssetRef,
} from './investor-demo-assets.ts';

export type UploadSummary = {
  uploaded: number;
  reused: number;
  missing: number;
  skipped: boolean;
};

function readR2Config(): {
  enabled: boolean;
  bucket: string;
  endpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
} {
  const mode = (process.env.MEDIA_STORAGE_MODE ?? '').trim().toLowerCase();
  const accountId = process.env.R2_ACCOUNT_ID?.trim() ?? '';
  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim() ?? '';
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim() ?? '';
  const bucket = process.env.R2_BUCKET?.trim() ?? '';
  const endpoint =
    process.env.R2_ENDPOINT?.trim() ||
    (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : '');
  return {
    enabled:
      mode === 'r2' &&
      Boolean(accountId && accessKeyId && secretAccessKey && bucket && endpoint),
    bucket,
    endpoint,
    accessKeyId,
    secretAccessKey,
  };
}

async function objectExists(client: S3Client, bucket: string, key: string, size: number): Promise<boolean> {
  try {
    const head = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return Number(head.ContentLength ?? 0) === size;
  } catch {
    return false;
  }
}

export async function uploadInvestorDemoAssets(): Promise<UploadSummary> {
  const inspection = inspectDemoAssets();
  const config = readR2Config();
  if (!config.enabled) {
    console.log(`${INVESTOR_DEMO_TAG} r2_skip assets_present=${inspection.present}/${inspection.required}`);
    return { uploaded: 0, reused: 0, missing: inspection.missing.length, skipped: true };
  }
  if (inspection.required > 0 && inspection.present === 0) {
    throw new Error(`${INVESTOR_DEMO_TAG} photoreal_assets_missing dir empty`);
  }

  const client = new S3Client({
    region: 'auto',
    endpoint: config.endpoint,
    credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
  });

  let uploaded = 0;
  let reused = 0;
  for (const ref of listRequiredDemoAssets()) {
    const result = await uploadOne(client, config.bucket, ref);
    if (result === 'missing') continue;
    if (result === 'reused') reused += 1;
    else uploaded += 1;
  }
  return { uploaded, reused, missing: inspection.missing.length, skipped: false };
}

async function uploadOne(
  client: S3Client,
  bucket: string,
  ref: DemoAssetRef,
): Promise<'uploaded' | 'reused' | 'missing'> {
  if (!ref.objectKey.startsWith(`${INVESTOR_DEMO_ASSET_ENV}/`)) {
    throw new Error(`${INVESTOR_DEMO_TAG} refused_non_dev_object_key ${ref.objectKey}`);
  }
  let body: Buffer;
  try {
    body = readDemoAsset(ref);
  } catch {
    return 'missing';
  }
  if (await objectExists(client, bucket, ref.objectKey, body.length)) return 'reused';
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: ref.objectKey,
      Body: body,
      ContentType: 'image/jpeg',
    }),
  );
  return 'uploaded';
}
