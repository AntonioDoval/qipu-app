import { randomBytes } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { decryptToken, encryptToken } from './tokenCrypto';

describe('token encryption', () => {
  const key = randomBytes(32);
  it('round-trips, and never stores the token in clear', () => {
    const sealed = encryptToken('1//refresh-token-example', key);
    expect(sealed.startsWith('v1.')).toBe(true);
    expect(sealed).not.toContain('refresh-token-example');
    expect(decryptToken(sealed, key)).toBe('1//refresh-token-example');
  });
  it('gives different ciphertext each time (random IV)', () => {
    expect(encryptToken('same', key)).not.toBe(encryptToken('same', key));
  });
  it('refuses a wrong key or tampered data', () => {
    const sealed = encryptToken('secret', key);
    expect(() => decryptToken(sealed, randomBytes(32))).toThrow();
    const parts = sealed.split('.');
    parts[2] = Buffer.from('tampered').toString('base64url');
    expect(() => decryptToken(parts.join('.'), key)).toThrow();
  });
});
