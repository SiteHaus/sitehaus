import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { type ConfigType } from '@nestjs/config';
import { and, eq, gt, isNull, ne, schema, type Db } from '@site-haus/db';
import { AuditService } from 'src/audit/audit.service';
import authConfig from 'src/conf/auth.config';
import { CryptoService } from 'src/crypto/crypto.service';
import { DRIZZLE } from 'src/db/tokens';
import { DevicesService } from 'src/devices/devices.service';

@Injectable()
export class SessionService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Db,
    private readonly crypto: CryptoService,
    private readonly devices: DevicesService,
    private readonly audit: AuditService,
    @Inject(authConfig.KEY) private readonly cfg: ConfigType<typeof authConfig>,
  ) {}

  private async createSessionWith(
    dbx: Db,
    input: {
      userId: string;
      clientId: string;
      ip?: string;
      ua?: string;
      mfaVerifiedAt?: Date | null;
    },
  ) {
    const ttl = this.cfg.refreshTtlSec;
    const refreshToken = this.crypto.randomIdOfLength(96);
    const refreshHash = this.crypto.sha256b64url(refreshToken);
    const now = new Date();
    const expires = new Date(now.getTime() + ttl * 1000);

    const deviceId = await this.devices.resolveOrCreateForSession(dbx, {
      userId: input.userId,
      ip: input.ip,
      ua: input.ua,
    });

    await dbx
      .update(schema.sessionsTable)
      .set({ revokedAt: now })
      .where(
        and(
          eq(schema.sessionsTable.userId, input.userId),
          eq(schema.sessionsTable.clientId, input.clientId),
          eq(schema.sessionsTable.deviceId, deviceId),
          isNull(schema.sessionsTable.revokedAt),
          gt(schema.sessionsTable.expiresAt, now),
        ),
      );

    const [s] = await dbx
      .insert(schema.sessionsTable)
      .values({
        userId: input.userId,
        clientId: input.clientId,
        deviceId: deviceId,
        refreshHash,
        ipHash: input.ip ? this.crypto.sha256b64url(input.ip) : null,
        uaHash: input.ua ? this.crypto.sha256b64url(input.ua) : null,
        expiresAt: expires,
        revokedAt: null,
        mfaVerifiedAt: input.mfaVerifiedAt ?? null,
        meta: {},
      })
      .returning({ id: schema.sessionsTable.id });

    return {
      sessionId: s!.id,
      refreshToken,
      refreshExpiresAt: expires,
    };
  }

  // Public wrapper for non-transactional use
  createSession(input: {
    userId: string;
    clientId: string;
    ip?: string;
    ua?: string;
    mfaVerifiedAt?: Date | null;
  }) {
    return this.createSessionWith(this.db, input);
  }

  // Near-simultaneous duplicate refreshes (same token, e.g. two tabs racing
  // right after a deploy-triggered wave of 401s) land here within a few ms of
  // each other. Whichever loses the atomic claim below gets the winner's
  // already-issued result instead of tripping reuse detection, as long as
  // it's within this window.
  private readonly recentRotations = new Map<
    string,
    {
      userId: string;
      sessionId: string;
      refreshToken: string;
      refreshExpiresAt: Date;
      rotatedAt: number;
    }
  >();
  private static readonly ROTATION_GRACE_MS = 10_000;

  private pruneRotationCache() {
    const cutoff = Date.now() - SessionService.ROTATION_GRACE_MS;
    for (const [key, v] of this.recentRotations) {
      if (v.rotatedAt < cutoff) this.recentRotations.delete(key);
    }
  }

  async rotate(input: {
    refreshToken: string;
    clientId: string;
    ip?: string;
    ua?: string;
  }) {
    const hash = this.crypto.sha256b64url(input.refreshToken);
    this.pruneRotationCache();

    return this.db.transaction(async (tx) => {
      // Atomically claim the session: the WHERE clause only matches while it's
      // still active, so at most one of any concurrent callers using the same
      // token can win this update. A racing duplicate gets 0 rows back rather
      // than independently rotating the same row (which would otherwise mint
      // two live sessions from one token, or trip reuse detection on the
      // loser).
      const [claimed] = await tx
        .update(schema.sessionsTable)
        .set({ revokedAt: new Date() })
        .where(
          and(
            eq(schema.sessionsTable.refreshHash, hash),
            eq(schema.sessionsTable.clientId, input.clientId),
            isNull(schema.sessionsTable.revokedAt),
            gt(schema.sessionsTable.expiresAt, new Date()),
          ),
        )
        .returning();

      if (!claimed) {
        // A winner may have rotated this exact token moments ago — hand back
        // its result instead of treating a same-instant duplicate as theft.
        const recent = this.recentRotations.get(hash);
        if (
          recent &&
          Date.now() - recent.rotatedAt < SessionService.ROTATION_GRACE_MS
        ) {
          return {
            userId: recent.userId,
            sessionId: recent.sessionId,
            refreshToken: recent.refreshToken,
            refreshExpiresAt: recent.refreshExpiresAt,
          };
        }

        const reused = await tx.query.sessionsTable.findFirst({
          where: (t, { eq: _eq, and, isNotNull: _isNotNull }) =>
            and(
              _eq(t.refreshHash, hash),
              _eq(t.clientId, input.clientId),
              _isNotNull(t.revokedAt),
            ),
        });

        // Revoke all sessions if user attempts this!
        if (reused) {
          await this.revokeAllForUserClientInTx(
            tx,
            reused.userId,
            reused.clientId,
          );
          throw new UnauthorizedException('Invalid refresh');
        }

        throw new UnauthorizedException('Invalid refresh');
      }

      const { sessionId, refreshToken, refreshExpiresAt } =
        await this.createSessionWith(tx, {
          userId: claimed.userId,
          clientId: claimed.clientId,
          ip: input.ip,
          ua: input.ua,
          mfaVerifiedAt: claimed.mfaVerifiedAt,
        });

      this.recentRotations.set(hash, {
        userId: claimed.userId,
        sessionId,
        refreshToken,
        refreshExpiresAt,
        rotatedAt: Date.now(),
      });

      return {
        userId: claimed.userId,
        sessionId,
        refreshToken,
        refreshExpiresAt,
      };
    });
  }

  async revoke(
    sessionId: string,
    ctx?: { clientId: string; userId: string; ip?: string; ua?: string },
  ) {
    await this.db
      .update(schema.sessionsTable)
      .set({ revokedAt: new Date() })
      .where(eq(schema.sessionsTable.id, sessionId));

    if (ctx) {
      await this.audit.log({
        clientId: ctx.clientId,
        userId: ctx.userId,
        action: 'session.revoked',
        targetType: 'session',
        targetId: sessionId,
        ip: ctx.ip,
        ua: ctx.ua,
      });
    }
  }

  // Remove all sessions EVERYWHERE for a user
  async revokeAllForUser(
    userId: string,
    ctx?: { clientId: string; ip?: string; ua?: string },
  ) {
    const now = new Date();
    const updated = await this.db
      .update(schema.sessionsTable)
      .set({ revokedAt: now })
      .where(
        and(
          eq(schema.sessionsTable.userId, userId),
          isNull(schema.sessionsTable.revokedAt),
          gt(schema.sessionsTable.expiresAt, now),
        ),
      )
      .returning({ id: schema.sessionsTable.id });

    if (ctx && updated.length > 0) {
      await this.audit.log({
        clientId: ctx.clientId,
        userId,
        action: 'sessions.revokedAll',
        targetType: 'user',
        targetId: userId,
        ip: ctx.ip,
        ua: ctx.ua,
        meta: { count: updated.length },
      });
    }

    return updated.length;
  }

  // Logout everywhere for a user but only for a specific client (e.g. dashboard)
  async revokeAllForUserClient(userId: string, clientId: string) {
    const now = new Date();
    const updated = await this.db
      .update(schema.sessionsTable)
      .set({ revokedAt: now })
      .where(
        and(
          eq(schema.sessionsTable.userId, userId),
          eq(schema.sessionsTable.clientId, clientId), // UUID FK
          isNull(schema.sessionsTable.revokedAt),
          gt(schema.sessionsTable.expiresAt, now),
        ),
      )
      .returning({ id: schema.sessionsTable.id });

    return updated.length;
  }

  // Logout other devices/browsers, keep the current session alive
  async revokeAllOthers(userId: string, keepSessionId: string) {
    const now = new Date();
    const updated = await this.db
      .update(schema.sessionsTable)
      .set({ revokedAt: now })
      .where(
        and(
          eq(schema.sessionsTable.userId, userId),
          ne(schema.sessionsTable.id, keepSessionId),
          isNull(schema.sessionsTable.revokedAt),
          gt(schema.sessionsTable.expiresAt, now),
        ),
      )
      .returning({ id: schema.sessionsTable.id });

    return updated.length;
  }

  async listForUserClient(userId: string, clientId: string) {
    const now = new Date();
    return this.db.query.sessionsTable.findMany({
      where: (t, { and: _and, eq: _eq, gt: _gt, isNull: _isNull }) =>
        _and(
          _eq(t.userId, userId),
          _eq(t.clientId, clientId),
          _isNull(t.revokedAt),
          _gt(t.expiresAt, now),
        ),
      columns: {
        id: true,
        createdAt: true,
        lastUsedAt: true,
        expiresAt: true,
        ipHash: true,
        uaHash: true,
      },
      with: {
        device: {
          columns: {
            browser: true,
            platform: true,
            label: true,
          },
        },
      },
      orderBy: (t, { desc }) => [desc(t.createdAt)],
    });
  }

  private async revokeAllForUserClientInTx(
    tx: Db,
    userId: string,
    clientId: string,
  ) {
    const now = new Date();
    await tx
      .update(schema.sessionsTable)
      .set({ revokedAt: now })
      .where(
        and(
          eq(schema.sessionsTable.userId, userId),
          eq(schema.sessionsTable.clientId, clientId),
          isNull(schema.sessionsTable.revokedAt),
          gt(schema.sessionsTable.expiresAt, now),
        ),
      );
  }

  /**
   * Validate a refresh token and return the user ID if valid.
   * Does NOT rotate the token - use this for checking auth status only.
   * If clientId is provided, validates against that specific client.
   * If not provided, validates any valid session with that token.
   */
  async validateRefreshToken(
    refreshToken: string,
    clientId?: string,
  ): Promise<{
    userId: string;
    sessionId: string;
    clientId: string;
    mfaVerifiedAt: Date | null;
  } | null> {
    const hash = this.crypto.sha256b64url(refreshToken);

    const sessions = await this.db
      .select()
      .from(schema.sessionsTable)
      .where(
        clientId
          ? and(
              eq(schema.sessionsTable.refreshHash, hash),
              eq(schema.sessionsTable.clientId, clientId),
              isNull(schema.sessionsTable.revokedAt),
              gt(schema.sessionsTable.expiresAt, new Date()),
            )
          : and(
              eq(schema.sessionsTable.refreshHash, hash),
              isNull(schema.sessionsTable.revokedAt),
              gt(schema.sessionsTable.expiresAt, new Date()),
            ),
      )
      .limit(1);

    const session = sessions[0];

    if (!session) {
      return null;
    }

    return {
      userId: session.userId,
      sessionId: session.id,
      clientId: session.clientId,
      mfaVerifiedAt: session.mfaVerifiedAt,
    };
  }

  async markMfaVerified(sessionId: string): Promise<void> {
    await this.db
      .update(schema.sessionsTable)
      .set({ mfaVerifiedAt: new Date() })
      .where(eq(schema.sessionsTable.id, sessionId));
  }

  async touch(sessionId: string, ip?: string, ua?: string) {
    const s = await this.db.query.sessionsTable.findFirst({
      where: (t, { eq: _eq }) => _eq(t.id, sessionId),
      columns: { lastUsedAt: true, ipHash: true, uaHash: true },
    });

    if (!s) return;

    const now = new Date();

    const tooSoon =
      s.lastUsedAt && now.getTime() - s.lastUsedAt.getTime() < 60_000;

    const ipHash = ip ? this.crypto.sha256b64url(ip.trim()) : undefined;
    const uaHash = ua ? this.crypto.sha256b64url(ua.trim()) : undefined;

    const ipChanged = ipHash && ipHash !== s.ipHash;
    const uaChanged = uaHash && uaHash !== s.uaHash;

    if (tooSoon && !ipChanged && !uaChanged) return;

    await this.db
      .update(schema.sessionsTable)
      .set({
        lastUsedAt: now,
        ...(ipHash ? { ipHash } : {}),
        ...(uaHash ? { uaHash } : {}),
      })
      .where(eq(schema.sessionsTable.id, sessionId));
  }
}
