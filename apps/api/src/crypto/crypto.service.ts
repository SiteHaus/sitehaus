import { Inject, Injectable } from '@nestjs/common';
import { type ConfigType } from '@nestjs/config';
import {
  hash as argon2Hash,
  verify as argon2Verify,
  type Options as Argon2Options,
} from '@node-rs/argon2';
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  randomInt,
  scryptSync,
  timingSafeEqual,
} from 'crypto';
import authConfig from 'src/conf/auth.config';

const ARGON2_OPTS: Argon2Options = {
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
  outputLen: 32,
} as const;

const ENCRYPTION_ALGO = 'aes-256-gcm';

@Injectable()
export class CryptoService {
  private readonly encryptionKey: Buffer;

  constructor(
    @Inject(authConfig.KEY)
    private readonly authCfg: ConfigType<typeof authConfig>,
  ) {
    // Derive a 32-byte key from the JWT secret using scrypt
    this.encryptionKey = scryptSync(this.authCfg.secret, 'totp-salt', 32);
  }

  /**
   * Encrypt a string using AES-256-GCM
   * Returns: iv:authTag:ciphertext (all base64url encoded)
   */
  encrypt(plaintext: string): string {
    const iv = randomBytes(12); // 96-bit IV for GCM
    const cipher = createCipheriv(ENCRYPTION_ALGO, this.encryptionKey, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'base64url');
    encrypted += cipher.final('base64url');

    const authTag = cipher.getAuthTag();

    return `${iv.toString('base64url')}:${authTag.toString('base64url')}:${encrypted}`;
  }

  /**
   * Decrypt a string encrypted with encrypt()
   */
  decrypt(encrypted: string): string {
    const [ivB64, authTagB64, ciphertext] = encrypted.split(':');

    const iv = Buffer.from(ivB64, 'base64url');
    const authTag = Buffer.from(authTagB64, 'base64url');

    const decipher = createDecipheriv(ENCRYPTION_ALGO, this.encryptionKey, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(ciphertext, 'base64url', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Generates a code for use in OTP, and invites with a
   * variable length.
   *
   * @param len
   * @returns
   */
  generateCode(len = 6) {
    const max = 10 ** len;
    return String(randomInt(0, max)).padStart(len, '0');
  }

  /**
   * Cryptographically-strong random, URL-safe string.
   * Note: resulting string length != requested bytes
   * If you need a specific char length, use `randomOfIdLength`
   *
   * @param bytes
   * @returns
   */
  randomId(bytes = 32): string {
    return randomBytes(bytes).toString('base64url');
  }

  /**
   * Generate a URL-safe random string of (at-least) a desired length
   * Useful for RFC7636 PKCE verifiers (43-128 chars).
   *
   * @param minLength
   * @returns
   */
  randomIdOfLength(minLength = 64): string {
    if (minLength < 1) minLength = 1;
    const bytes = Math.ceil((minLength * 3) / 4) + 2;
    return this.randomId(bytes).slice(0, minLength);
  }

  /**
   * SHA-256 -> base64url for PKCE challenge, digest etc.
   *
   * @param input
   * @returns
   */
  sha256b64url(input: string | Buffer): string {
    const buf = Buffer.isBuffer(input) ? input : Buffer.from(input);
    return createHash('sha256').update(buf).digest('base64url');
  }

  /**
   * Hash a password with argon2id
   * Wraps errors to avoid leaking details
   * @param password
   * @returns
   */
  async hashPassword(password: string): Promise<string> {
    try {
      return await argon2Hash(password, ARGON2_OPTS);
    } catch {
      throw new Error('Password hashing failed');
    }
  }

  /**
   * Verify a password against an encoded Argon2 hash
   * Returns false on mismatch OR any verification error
   *
   * @param hashed
   * @param password
   * @returns
   */
  async verifyPassword(hashed: string, password: string): Promise<boolean> {
    try {
      return await argon2Verify(hashed, password);
    } catch {
      return false;
    }
  }

  /**
   * Constant-time equality for comparing secrets/digests
   *
   * @param a
   * @param b
   * @returns
   */
  safeEqual(a: string | Buffer, b: string | Buffer): boolean {
    const ab = Buffer.isBuffer(a) ? a : Buffer.from(a);
    const bb = Buffer.isBuffer(b) ? b : Buffer.from(b);
    if (ab.length !== bb.length) return false;
    return timingSafeEqual(ab, bb);
  }
}
