import { Inject, Injectable } from '@nestjs/common';
import { and, eq, isNull, lt, schema, type Db } from '@site-haus/db';
import { randomBytes } from 'crypto';
import { CryptoService } from 'src/crypto/crypto.service';
import { DRIZZLE } from 'src/db/tokens';
import { SessionService } from 'src/session/session.service';

@Injectable()
export class AuthCodeService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Db,
    private readonly crypto: CryptoService,
    private readonly session: SessionService,
  ) {}

  /**
   * Generate and store authorization code
   */
  async create(
    params: {
      userId: string;
      clientId: string;
      redirectUri: string;
      codeChallenge: string;
      scope?: string;
    },
    db?: Db,
  ): Promise<{ code: string; expiresAt: Date }> {
    const dbInstance = db ?? this.db;

    // Generate 32-byte random code
    const code = randomBytes(32).toString('base64url');

    // Hash the code for storage (SHA256 - fast for short-lived codes)
    const codeHash = this.crypto.sha256b64url(code);

    // Calculate expiration (90 seconds from now)
    const expiresAt = new Date(Date.now() + 90 * 1000);

    // Insert into database
    await dbInstance.insert(schema.authCodesTable).values({
      codeHash,
      userId: params.userId,
      clientId: params.clientId,
      redirectUri: params.redirectUri,
      codeChallenge: params.codeChallenge,
      method: 'S256',
      scope: params.scope || null,
      expiresAt,
    });

    return { code, expiresAt };
  }

  /**
   * Validate authorization code and return details
   */
  async validate(
    params: {
      code: string;
      clientId: string;
      redirectUri: string;
    },
    db?: Db,
  ): Promise<
    | { userId: string; codeChallenge: string; scope: string | null }
    | { reason: string }
  > {
    const dbInstance = db ?? this.db;

    // Hash the provided code
    const codeHash = this.crypto.sha256b64url(params.code);

    // Find the auth code
    const authCodes = await dbInstance
      .select()
      .from(schema.authCodesTable)
      .where(eq(schema.authCodesTable.codeHash, codeHash))
      .limit(1);

    const authCode = authCodes[0];

    if (!authCode) {
      return { reason: 'Invalid authorization code' };
    }

    // Check if already consumed
    if (authCode.consumedAt) {
      return { reason: 'Authorization code already used' };
    }

    // Check if expired
    if (authCode.expiresAt < new Date()) {
      return { reason: 'Authorization code expired' };
    }

    // Validate client ID
    if (authCode.clientId !== params.clientId) {
      return { reason: 'Client ID mismatch' };
    }

    // Validate redirect URI
    if (authCode.redirectUri !== params.redirectUri) {
      return { reason: 'Redirect URI mismatch' };
    }

    if (!authCode.userId) {
      return { reason: 'Invalid authorization code' };
    }

    return {
      userId: authCode.userId,
      codeChallenge: authCode.codeChallenge,
      scope: authCode.scope,
    };
  }

  /**
   * Consume code (mark as used) and create session
   */
  async consume(
    params: {
      code: string;
      codeVerifier: string;
      clientId: string;
      ip?: string;
      ua?: string;
    },
    db?: Db,
  ): Promise<{
    sessionId: string;
    userId: string;
    scope: string | null;
    refreshToken: string;
    refreshExpiresAt: Date;
  }> {
    const dbInstance = db ?? this.db;

    // Hash the provided code (SHA256)
    const codeHash = this.crypto.sha256b64url(params.code);

    // Find and update the auth code
    const authCodes = await dbInstance
      .select()
      .from(schema.authCodesTable)
      .where(
        and(
          eq(schema.authCodesTable.codeHash, codeHash),
          isNull(schema.authCodesTable.consumedAt),
        ),
      )
      .limit(1);

    const authCode = authCodes[0];

    if (!authCode || !authCode.userId) {
      throw new Error('Invalid authorization code');
    }

    // Validate client ID matches the one the code was issued for
    if (authCode.clientId !== params.clientId) {
      throw new Error('Client ID mismatch');
    }

    // Validate PKCE: SHA256(code_verifier) should equal stored code_challenge
    const computedChallenge = this.crypto.sha256b64url(params.codeVerifier);

    if (!this.crypto.safeEqual(computedChallenge, authCode.codeChallenge)) {
      throw new Error('PKCE validation failed');
    }

    // Create session
    const session = await this.session.createSession({
      userId: authCode.userId,
      clientId: authCode.clientId,
      ip: params.ip,
      ua: params.ua,
    });

    // Mark code as consumed and link to session
    await dbInstance
      .update(schema.authCodesTable)
      .set({
        consumedAt: new Date(),
        sessionId: session.sessionId,
      })
      .where(eq(schema.authCodesTable.id, authCode.id));

    return {
      sessionId: session.sessionId,
      userId: authCode.userId,
      scope: authCode.scope,
      refreshToken: session.refreshToken,
      refreshExpiresAt: session.refreshExpiresAt,
    };
  }

  /**
   * Cleanup expired authorization codes
   */
  async expireOld(db?: Db): Promise<number> {
    const dbInstance = db ?? this.db;

    const result = await dbInstance
      .delete(schema.authCodesTable)
      .where(lt(schema.authCodesTable.expiresAt, new Date()));

    return result.rowCount ?? 0;
  }

  /**
   * Get authorization code by ID (for internal use)
   */
  async findById(
    id: string,
    db?: Db,
  ): Promise<typeof schema.authCodesTable.$inferSelect | null> {
    const dbInstance = db ?? this.db;

    const codes = await dbInstance
      .select()
      .from(schema.authCodesTable)
      .where(eq(schema.authCodesTable.id, id))
      .limit(1);

    return codes[0] || null;
  }
}
