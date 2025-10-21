import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { and, eq, gt, isNull, schema, type Db } from '@site-haus/db';
import { normalizeEmail } from '@site-haus/utils/core/helpers';
import { CryptoService } from 'src/crypto/crypto.service';
import { DRIZZLE } from 'src/db/tokens';
import { UsersService } from 'src/users/users.service';

@Injectable()
export class InvitesService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Db,
    private readonly crypto: CryptoService,
    private readonly users: UsersService,
  ) {}

  async list(clientId: string) {
    return this.db.query.invitesTable.findMany({
      where: (t, { eq: _eq }) => _eq(t.clientId, clientId),
      orderBy: (t, { desc: _desc }) => [_desc(t.createdAt)],
    });
  }

  async create(params: {
    clientId: string;
    email: string;
    roleIds?: string[];
    invitedBy?: string | null;
    ttlMinutes?: number;
  }) {
    const email = normalizeEmail(params.email);
    const ttlMinutes = params.ttlMinutes ?? 7 * 24 * 60;
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

    const now = new Date();

    await this.db
      .update(schema.invitesTable)
      .set({ revokedAt: now })
      .where(
        and(
          eq(schema.invitesTable.clientId, params.clientId),
          eq(schema.invitesTable.email, email),
          isNull(schema.invitesTable.revokedAt),
          gt(schema.invitesTable.expiresAt, now),
        ),
      );

    const code = this.crypto.generateCode();
    const codeHash = this.crypto.sha256b64url(code);

    const [invite] = await this.db
      .insert(schema.invitesTable)
      .values({
        clientId: params.clientId,
        email,
        codeHash,
        invitedBy: params.invitedBy ?? null,
        expiresAt,
      })
      .returning({
        id: schema.invitesTable.id,
        email: schema.invitesTable.email,
        expiresAt: schema.invitesTable.expiresAt,
      });

    if (params.roleIds?.length) {
      await this.db.insert(schema.inviteRolesTable).values(
        params.roleIds.map((roleId) => ({
          inviteId: invite!.id,
          roleId,
        })),
      );
    }

    return { inviteId: invite!.id, code, expiresAt };
  }

  async revoke(inviteId: string, clientId: string) {
    const now = new Date();

    const { rowCount } = await this.db
      .update(schema.invitesTable)
      .set({ revokedAt: now })
      .where(
        and(
          eq(schema.invitesTable.id, inviteId),
          eq(schema.invitesTable.clientId, clientId),
          isNull(schema.invitesTable.revokedAt),
        ),
      );
    if (!rowCount)
      throw new BadRequestException('Invite not found or already revoked.');
  }

  async accept(params: {
    clientId: string;
    email: string;
    code: string;
    password: string;
    firstName: string;
    lastName: string;
    ip?: string;
    ua?: string;
  }) {
    const email = normalizeEmail(params.email);
    const now = new Date();

    const invite = await this.db.query.invitesTable.findFirst({
      where: (t, { and: _and, eq: _eq, isNull: _isNull, gt: _gt }) =>
        _and(
          _eq(t.clientId, params.clientId),
          _eq(t.email, email),
          _isNull(t.acceptedAt),
          _isNull(t.revokedAt),
          _gt(t.expiresAt, now),
        ),
      columns: {
        id: true,
        codeHash: true,
      },
      with: { inviteRoles: true },
    });

    if (!invite) throw new UnauthorizedException('Invalid or expired invite');

    const submittedHash = this.crypto.sha256b64url(params.code);
    const ok = this.crypto.safeEqual(invite.codeHash, submittedHash);

    if (!ok) throw new UnauthorizedException('Invalid or expired invite');

    return this.db.transaction(async (tx) => {
      const [updated] = await tx
        .update(schema.invitesTable)
        .set({ acceptedAt: now })
        .where(
          and(
            eq(schema.invitesTable.id, invite.id),
            isNull(schema.invitesTable.acceptedAt),
          ),
        )
        .returning({ id: schema.invitesTable.id });
      if (!updated) throw new ConflictException('Invite already used');

      const roleIds = invite.inviteRoles.map((r) => r.roleId);
      if (roleIds.length) {
        const valid = await tx.query.rolesTable.findMany({
          where: (t, { and: _and, eq: _eq, inArray: _in }) =>
            _and(_eq(t.clientId, params.clientId), _in(t.id, roleIds)),
          columns: { id: true },
        });

        if (valid.length !== roleIds.length) {
          throw new ForbiddenException('Invite roles invalid for client');
        }
      }

      let user = await this.users.findByEmail(email, tx);
      if (!user) {
        const passwordHash = await this.crypto.hashPassword(params.password);

        user = await this.users.createUser(
          {
            email,
            firstName: params.firstName,
            lastName: params.lastName,
          },
          tx,
        );

        await this.users.setPassword(user.id, passwordHash, tx);

        user = await this.users.setVerified(user.id, true, tx);
      } else if (!user.isVerified) {
        user = await this.users.setVerified(user.id, true, tx);
      }

      if (roleIds.length) {
        const existing = await tx.query.userRolesTable.findMany({
          where: (t, { and: _and, eq: _eq, inArray: _in }) =>
            _and(_eq(t.userId, user.id), _in(t.roleId, roleIds)),
        });

        const have = new Set(existing.map((e) => e.roleId));
        const toAdd = roleIds.filter((r) => !have.has(r));

        if (toAdd.length) {
          await tx
            .insert(schema.userRolesTable)
            .values(
              toAdd.map((roleId) => ({
                userId: user.id,
                clientId: params.clientId,
                roleId,
              })),
            )
            .onConflictDoNothing({
              target: [
                schema.userRolesTable.userId,
                schema.userRolesTable.clientId,
                schema.userRolesTable.roleId,
              ],
            });
        }
      }
      return { userId: user.id, acceptedAt: now, rolesAssigned: roleIds };
    });
  }
}
