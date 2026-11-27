// Server only. Encrypts the Google refresh token before it is stored in the database,
// with AES-256-GCM and a key that exists only on the server (QIPU_TOKEN_KEY on Netlify).
// Anyone reading the database (or the browser) sees only ciphertext.

import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const VERSION = 'v1';

/** The 32-byte key from QIPU_TOKEN_KEY (base64), or null if it is not configured. */
export function serverTokenKey(): Buffer | null {
  const raw = process.env.QIPU_TOKEN_KEY;
  if (!raw) return null;
  const key = Buffer.from(raw, 'base64');
  if (key.length !== 32) throw new Error('QIPU_TOKEN_KEY must be 32 bytes, base64-encoded (openssl rand -base64 32).');
  return key;
}

export function encryptToken(plain: string, key: Buffer): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const data = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION, iv.toString('base64url'), data.toString('base64url'), tag.toString('base64url')].join('.');
}

export function decryptToken(sealed: string, key: Buffer): string {
  const [version, iv, data, tag] = sealed.split('.');
  if (version !== VERSION || !iv || !data || !tag) throw new Error('Unknown token format.');
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64url'));
  decipher.setAuthTag(Buffer.from(tag, 'base64url'));
  return Buffer.concat([decipher.update(Buffer.from(data, 'base64url')), decipher.final()]).toString('utf8');
}
