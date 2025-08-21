import { Injectable } from '@nestjs/common';
import {
  hash as argon2Hash,
  verify as argon2Verify,
  type Options as Argon2Options,
} from '@node-rs/argon2';
import { createHash, randomBytes, timingSafeEqual } from 'crypto';

const ARGON2_OPTS: Argon2Options = {
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
  outputLen: 32,
};

@Injectable()
export class CryptoService {
  // Cryptographically-strong random string, which is URL-Safe
  randomId(bytes = 32): string {
    return randomBytes(bytes).toString('base64url');
  }

  // SHA-256 -> base64url for PKCE challenge, digest etc.
  sha256b64url(input: string | Buffer): string {
    return createHash('sha256').update(input).digest('base64url');
  }

  // Hash a password with argon2id
  hashPassword(password: string): Promise<string> {
    return argon2Hash(password, ARGON2_OPTS);
  }

  // Verify a password against an encoded Argon2 hash
  verifyPassword(hashed: string, password: string): Promise<boolean> {
    return argon2Verify(hashed, password);
  }

  // Constant-time equality for comparing secrets/digests
  safeEqual(a: string, b: string): boolean {
    const ab = Buffer.from(a);
    const bb = Buffer.from(b);
    if (ab.length !== bb.length) return false;
    return timingSafeEqual(ab, bb);
  }
}
