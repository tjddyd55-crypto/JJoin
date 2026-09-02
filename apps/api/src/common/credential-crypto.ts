import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const ALGO = 'aes-256-gcm';
const IV_LEN = 12;

function loadMasterKey(env: NodeJS.ProcessEnv = process.env): Buffer | null {
  const raw = (env.PAYMENT_CREDENTIAL_ENCRYPTION_KEY ?? '').trim();
  if (!raw) return null;
  const buf = Buffer.from(raw, 'base64');
  if (buf.length !== 32) {
    throw new Error('PAYMENT_CREDENTIAL_ENCRYPTION_KEY must be 32 bytes base64');
  }
  return buf;
}

/** Encrypt sensitive credentials at rest (e.g. Toss Secret Key). */
export function encryptCredential(plaintext: string, env: NodeJS.ProcessEnv = process.env): string {
  const key = loadMasterKey(env);
  if (!key) throw new Error('payment_encryption_key_missing');
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString('base64url')}:${tag.toString('base64url')}:${encrypted.toString('base64url')}`;
}

export function decryptCredential(encoded: string, env: NodeJS.ProcessEnv = process.env): string {
  const key = loadMasterKey(env);
  if (!key) throw new Error('payment_encryption_key_missing');
  const parts = encoded.split(':');
  if (parts.length !== 4 || parts[0] !== 'v1') throw new Error('invalid_encrypted_credential');
  const iv = Buffer.from(parts[1]!, 'base64url');
  const tag = Buffer.from(parts[2]!, 'base64url');
  const data = Buffer.from(parts[3]!, 'base64url');
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
  return decrypted.toString('utf8');
}

export function hasPaymentEncryptionKey(env: NodeJS.ProcessEnv = process.env): boolean {
  return loadMasterKey(env) != null;
}
