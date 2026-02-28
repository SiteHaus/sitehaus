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
import { AuditService } from 'src/audit/audit.service';
import { CryptoService } from 'src/crypto/crypto.service';
import { DRIZZLE } from 'src/db/tokens';
import { UsersService } from 'src/users/users.service';

@Injectable()
export class InvitesService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Db,
    private readonly crypto: CryptoService,
    private readonly users: UsersService,
    private readonly audit: AuditService,
  ) {}

  async list(clientId: string) {
    return await this.db.query.invitesTable.findMany({
      where: (t, { eq: _eq }) => _eq(t.clientId, clientId),
      orderBy: (t, { desc: _desc }) => [_desc(t.createdAt)],
    });
  }

  async create(
    params: {
      clientId: string;
      email: string;
      roleIds?: string[];
      invitedBy?: string | null;
      ttlMinutes?: number;
    },
    ctx?: { ip?: string; ua?: string },
  ) {
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

    await this.audit.log({
      clientId: params.clientId,
      userId: params.invitedBy,
      action: 'invite.created',
      targetType: 'invite',
      targetId: invite!.id,
      ip: ctx?.ip,
      ua: ctx?.ua,
      meta: { email },
    });

    return { inviteId: invite!.id, code, expiresAt };
  }

  async revoke(
    inviteId: string,
    clientId: string,
    ctx?: { userId?: string; ip?: string; ua?: string },
  ) {
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

    await this.audit.log({
      clientId,
      userId: ctx?.userId,
      action: 'invite.cancelled',
      targetType: 'invite',
      targetId: inviteId,
      ip: ctx?.ip,
      ua: ctx?.ua,
    });
  }

  async check(params: { clientId: string; email: string; code: string }) {
    const email = normalizeEmail(params.email);
    const now = new Date();

    // Find valid invite
    const invite = await this.db.query.invitesTable.findFirst({
      where: (t, { and: _and, eq: _eq, isNull: _isNull, gt: _gt }) =>
        _and(
          _eq(t.clientId, params.clientId),
          _eq(t.email, email),
          _isNull(t.acceptedAt),
          _isNull(t.revokedAt),
          _gt(t.expiresAt, now),
        ),
      columns: { id: true, codeHash: true },
      with: { inviteRoles: true },
    });

    if (!invite) {
      return { valid: false, userExists: false, clientName: '', roles: [] };
    }

    // Verify code
    const submittedHash = this.crypto.sha256b64url(params.code);
    const ok = this.crypto.safeEqual(invite.codeHash, submittedHash);

    if (!ok) {
      return { valid: false, userExists: false, clientName: '', roles: [] };
    }

    // Check if user exists
    const user = await this.users.findByEmail(email);
    const userExists = !!user;

    // Get client name
    const client = await this.db.query.clientsTable.findFirst({
      where: (t, { eq: _eq }) => _eq(t.id, params.clientId),
      columns: { name: true },
    });

    // Get role names
    const roleIds = invite.inviteRoles.map((r) => r.roleId);
    let roleNames: string[] = [];
    if (roleIds.length) {
      const roles = await this.db.query.rolesTable.findMany({
        where: (t, { inArray: _in }) => _in(t.id, roleIds),
        columns: { name: true },
      });
      roleNames = roles.map((r) => r.name);
    }

    return {
      valid: true,
      userExists,
      clientName: client?.name ?? '',
      roles: roleNames,
    };
  }

  async accept(params: {
    clientId: string;
    email: string;
    code: string;
    password?: string;
    firstName?: string;
    lastName?: string;
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

    const result = await this.db.transaction(async (tx) => {
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
        // New user - password and name are required
        if (!params.password || !params.firstName || !params.lastName) {
          throw new BadRequestException(
            'Password, first name, and last name are required for new users',
          );
        }

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
        // Existing user - just verify them
        user = await this.users.setVerified(user.id, true, tx);
      }
      // Existing verified user - just add roles (handled below)

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

    // Audit log runs after the transaction commits so the user FK is satisfied
    await this.audit.log({
      clientId: params.clientId,
      userId: result.userId,
      action: 'invite.accepted',
      targetType: 'invite',
      targetId: invite.id,
      ip: params.ip,
      ua: params.ua,
    });

    return result;
  }
}
