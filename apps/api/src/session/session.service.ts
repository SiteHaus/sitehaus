import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { type ConfigType } from '@nestjs/config';
import { and, eq, gt, isNull, ne, schema, type Db } from '@site-haus/db';
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
    @Inject(authConfig.KEY) private readonly cfg: ConfigType<typeof authConfig>,
  ) {}

  private async createSessionWith(
    dbx: Db,
    input: {
      userId: string;
      clientId: string;
      ip?: string;
      ua?: string;
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
  }) {
    return this.createSessionWith(this.db, input);
  }

  async rotate(input: {
    refreshToken: string;
    clientId: string;
    ip?: string;
    ua?: string;
  }) {
    const hash = this.crypto.sha256b64url(input.refreshToken);

    return this.db.transaction(async (tx) => {
      const existing = await tx.query.sessionsTable.findFirst({
        where: (t, { eq: _eq, isNull: _isNull, gt: _gt, and }) =>
          and(
            _eq(t.refreshHash, hash),
            _eq(t.clientId, input.clientId),
            _isNull(t.revokedAt),
            _gt(t.expiresAt, new Date()),
          ),
      });

      if (!existing) {
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

      await tx
        .update(schema.sessionsTable)
        .set({ revokedAt: new Date() })
        .where(eq(schema.sessionsTable.id, existing.id));

      const { sessionId, refreshToken, refreshExpiresAt } =
        await this.createSessionWith(tx, {
          userId: existing.userId,
          clientId: existing.clientId,
          ip: input.ip,
          ua: input.ua,
        });

      return {
        userId: existing.userId,
        sessionId,
        refreshToken,
        refreshExpiresAt,
      };
    });
  }

  async revoke(sessionId: string) {
    await this.db
      .update(schema.sessionsTable)
      .set({ revokedAt: new Date() })
      .where(eq(schema.sessionsTable.id, sessionId));
  }

  // Remove all sessions EVERYWHERE for a user
  async revokeAllForUser(userId: string) {
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
}
