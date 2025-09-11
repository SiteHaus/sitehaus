import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq, gt, isNull, schema, type Db } from '@site-haus/db';
import { parseUserAgent } from '@site-haus/utils/core/helpers';
import { CryptoService } from 'src/crypto/crypto.service';
import { DRIZZLE } from 'src/db/tokens';

@Injectable()
export class DevicesService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Db,
    private readonly crypto: CryptoService,
  ) {}

  async resolveOrCreateForSession(
    tx: Db,
    input: { userId: string; ip?: string; ua?: string },
  ): Promise<string | null> {
    const uaNorm = input.ua?.trim();
    const ipNorm = input.ip?.trim();

    const uaHash = uaNorm ? this.crypto.sha256b64url(uaNorm) : null;
    const ipHash = ipNorm ? this.crypto.sha256b64url(ipNorm) : null;

    let prev = uaHash
      ? await tx.query.sessionsTable.findFirst({
          where: (t, { and: _and, eq: _eq, isNull: _isNull, gt: _gt }) =>
            _and(
              _eq(t.userId, input.userId),
              _eq(t.uaHash, uaHash),
              _isNull(t.revokedAt),
              _gt(t.expiresAt, new Date()),
            ),
          columns: { deviceId: true },
          orderBy: (t, { desc }) => [desc(t.lastUsedAt)],
        })
      : null;

    if (!prev && uaHash) {
      prev = await tx.query.sessionsTable.findFirst({
        where: (t, { and, eq }) =>
          and(eq(t.userId, input.userId), eq(t.uaHash, uaHash)),
        columns: { deviceId: true },
        orderBy: (t, { desc }) => [desc(t.lastUsedAt)],
      });
    }

    if (prev?.deviceId) {
      await tx
        .update(schema.devicesTable)
        .set({ lastSeenAt: new Date(), lastIpHash: ipHash ?? null })
        .where(eq(schema.devicesTable.id, prev.deviceId));
      return prev.deviceId;
    }

    const meta = parseUserAgent(input.ua);
    const [dev] = await tx
      .insert(schema.devicesTable)
      .values({
        userId: input.userId,
        label:
          meta.browser && meta.platform
            ? `${meta.browser} on ${meta.platform}`
            : null,
        platform: meta.platform ?? null,
        browser: meta.browser ?? null,
        firstSeenAt: new Date(),
        lastSeenAt: new Date(),
        lastIpHash: ipHash ?? null,
      })
      .returning({ id: schema.devicesTable.id });

    return dev!.id;
  }

  async listForUserClient(userId: string, clientId: string) {
    const now = new Date();

    const sessions = await this.db.query.sessionsTable.findMany({
      where: (t, { and: _and, eq: _eq, gt: _gt, isNull: _isNull }) =>
        _and(
          _eq(t.userId, userId),
          _eq(t.clientId, clientId),
          _isNull(t.revokedAt),
          _gt(t.expiresAt, now),
        ),
      columns: {
        id: true,
        deviceId: true,
        lastUsedAt: true,
      },
      orderBy: (t, { desc }) => [desc(t.lastUsedAt)],
    });

    const byDevice = new Map<string, { lastUsedAt: Date; count: number }>();
    const deviceIds: string[] = [];

    for (const s of sessions) {
      if (!s.deviceId) continue;
      const cur = byDevice.get(s.deviceId);
      if (cur) {
        cur.count += 1;
        if (s.lastUsedAt > cur.lastUsedAt) cur.lastUsedAt = s.lastUsedAt;
      } else {
        byDevice.set(s.deviceId, { lastUsedAt: s.lastUsedAt, count: 1 });
        deviceIds.push(s.deviceId);
      }
    }

    if (!deviceIds.length) return [];

    const devices = await this.db.query.devicesTable.findMany({
      where: (t, { inArray: _in }) => _in(t.id, deviceIds),
      columns: {
        id: true,
        label: true,
        platform: true,
        browser: true,
        firstSeenAt: true,
        lastSeenAt: true,
      },
    });

    return devices
      .map((d) => ({
        ...d,
        activeSessions: byDevice.get(d.id)?.count ?? 0,
        lastActiveAt: byDevice.get(d.id)?.lastUsedAt ?? d.lastSeenAt,
      }))
      .sort((a, b) => b.lastActiveAt.getTime() - a.lastActiveAt.getTime());
  }

  async rename(userId: string, deviceId: string, label: string | null) {
    const dev = await this.db.query.devicesTable.findFirst({
      where: (t, { and: _and, eq: _eq }) =>
        _and(_eq(t.id, deviceId), _eq(t.userId, userId)),
      columns: { id: true },
    });

    if (!dev) throw new NotFoundException('Device not found');

    await this.db
      .update(schema.devicesTable)
      .set({ label })
      .where(eq(schema.devicesTable.id, deviceId));
  }

  async revokeAllSessionsForDevice(
    userId: string,
    clientId: string,
    deviceId: string,
  ) {
    const dev = await this.db.query.devicesTable.findFirst({
      where: (t, { and: _and, eq: _eq }) =>
        _and(_eq(t.id, deviceId), _eq(t.userId, userId)),
      columns: { id: true },
    });

    if (!dev) throw new ForbiddenException('Invalid device');

    const now = new Date();
    await this.db
      .update(schema.sessionsTable)
      .set({ revokedAt: now })
      .where(
        and(
          eq(schema.sessionsTable.userId, userId),
          eq(schema.sessionsTable.clientId, clientId),
          eq(schema.sessionsTable.deviceId, deviceId),
          isNull(schema.sessionsTable.revokedAt),
          gt(schema.sessionsTable.expiresAt, now),
        ),
      );
  }
}
