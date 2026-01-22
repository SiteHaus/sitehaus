import {
  ConflictException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { type ConfigType } from '@nestjs/config';
import { type Db } from '@site-haus/db';
import authConfig from 'src/conf/auth.config';
import { DRIZZLE } from 'src/db/tokens';
import { UserExistsError } from 'src/errors/auth.errors';
import { RolesService } from 'src/roles/roles.service';
import { SessionService } from 'src/session/session.service';
import { UsersService } from 'src/users/users.service';
import { CryptoService } from '../crypto/crypto.service';
import { type AccessPayload } from './access/access.guard';
import { TokenService } from './token/token.service';
import { TotpService } from './totp/totp.service';

const MFA_PENDING_TTL_SEC = 5 * 60; // 5 minutes for partial tokens

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly crypto: CryptoService,
    private readonly sessions: SessionService,
    private readonly tokens: TokenService,
    private readonly roles: RolesService,
    private readonly totp: TotpService,
    @Inject(authConfig.KEY) private readonly cfg: ConfigType<typeof authConfig>,
    @Inject(DRIZZLE) private readonly db: Db,
  ) {}

  async register(
    input: {
      email: string;
      firstName: string;
      lastName: string;
      password: string;
    },
    ctx: { clientId: string; ip?: string; ua?: string },
  ) {
    const passwordHash = await this.crypto.hashPassword(input.password);
    try {
      const user = await this.users.createUserWithPassword({
        email: input.email,
        firstName: input.firstName,
        lastName: input.lastName,
        passwordHash,
      });

      await this.roles.assignDefaultIfAny(user.id, ctx.clientId, user.id);

      return this.issueTokens(user.id, ctx);
    } catch (e) {
      if (e instanceof UserExistsError) {
        throw new ConflictException(e.message);
      }
      throw e;
    }
  }

  async login(
    input: { email: string; password: string },
    ctx: { clientId: string; ip?: string; ua?: string },
  ) {
    const user = await this.users.findByEmail(input.email);
    if (!user) throw new UnauthorizedException('Invalid email or password');

    if (user.status !== 'active') {
      throw new UnauthorizedException('Account is suspended or inactive');
    }

    const pc = await this.users.getPasswordCredential(user.id);
    if (!pc) throw new UnauthorizedException('Invalid email or password');

    const ok = await this.crypto.verifyPassword(
      pc.passwordHash,
      input.password,
    );
    if (!ok) throw new UnauthorizedException('Invalid email or password');

    // Check if 2FA is enabled
    const has2fa = await this.totp.isEnabled(user.id);
    if (has2fa) {
      // Issue partial token with mfa: 'pending'
      return this.issueTokens(user.id, ctx, { mfaPending: true });
    }

    return this.issueTokens(user.id, ctx);
  }

  async refresh(ctx: {
    clientId: string;
    refreshToken: string;
    ip?: string;
    ua?: string;
  }) {
    const { userId, sessionId, refreshToken, refreshExpiresAt } =
      await this.sessions.rotate({
        refreshToken: ctx.refreshToken,
        clientId: ctx.clientId,
        ip: ctx.ip,
        ua: ctx.ua,
      });

    const accessTtlSec = this.cfg.accessTtlSec;
    const accessToken = await this.tokens.signAccessToken(
      { sub: userId, sid: sessionId, aud: ctx.clientId },
      { expiresInSec: accessTtlSec },
    );

    return {
      accessToken,
      accessTokenExpiresIn: accessTtlSec,
      refreshToken,
      refreshTokenExpiresAt: refreshExpiresAt.toISOString(),
      sessionId,
      userId,
    };
  }

  async logoutBySid(sessionId: string) {
    await this.sessions.revoke(sessionId);
  }

  async issueTokens(
    userId: string,
    ctx: { clientId: string; sessionId?: string; ip?: string; ua?: string },
    opts?: { mfaPending?: boolean },
  ) {
    let sessionId: string;
    let refreshToken: string | undefined;
    let refreshExpiresAt: Date | undefined;

    if (ctx.sessionId) {
      // OAuth flow: reuse existing session (created by auth code consumption)
      sessionId = ctx.sessionId;
      // Don't return refresh token for OAuth flow (standard for public clients with PKCE)
    } else {
      // Direct login flow: create new session
      const session = await this.sessions.createSession({
        userId,
        clientId: ctx.clientId,
        ip: ctx.ip,
        ua: ctx.ua,
      });
      sessionId = session.sessionId;
      refreshToken = session.refreshToken;
      refreshExpiresAt = session.refreshExpiresAt;
    }

    // Use shorter TTL for MFA pending tokens
    const mfaPending = opts?.mfaPending ?? false;
    const accessTtlSec = mfaPending ? MFA_PENDING_TTL_SEC : this.cfg.accessTtlSec;
    const mfaClaim = mfaPending ? 'pending' : undefined;

    const accessToken = await this.tokens.signAccessToken(
      { sub: userId, sid: sessionId, aud: ctx.clientId, mfa: mfaClaim },
      { expiresInSec: accessTtlSec },
    );

    return {
      accessToken,
      accessTokenExpiresIn: accessTtlSec,
      ...(refreshToken && {
        refreshToken,
        refreshTokenExpiresAt: refreshExpiresAt!.toISOString(),
      }),
      sessionId,
      userId,
      requires2FA: mfaPending,
    };
  }

  async issueTokensForOTP(
    userId: string,
    ctx: { clientId: string; ip?: string; ua?: string },
  ) {
    return this.issueTokens(userId, ctx);
  }

  /**
   * Complete MFA login by verifying TOTP code and issuing full tokens.
   * Uses the existing session created during initial login.
   */
  async completeMfaLogin(
    code: string,
    ctx: { userId: string; sessionId: string; clientId: string },
  ) {
    // Verify the TOTP code
    const valid = await this.totp.verify(ctx.userId, code);
    if (!valid) {
      throw new UnauthorizedException('Invalid 2FA code');
    }

    // Issue full access token (no mfa claim means complete)
    const accessTtlSec = this.cfg.accessTtlSec;
    const accessToken = await this.tokens.signAccessToken(
      { sub: ctx.userId, sid: ctx.sessionId, aud: ctx.clientId },
      { expiresInSec: accessTtlSec },
    );

    return {
      accessToken,
      accessTokenExpiresIn: accessTtlSec,
      sessionId: ctx.sessionId,
      userId: ctx.userId,
    };
  }

  /**
   * Introspect an access token for external client SDKs.
   * Returns token validity, user info, session info, and permissions.
   */
  async introspect(token: string) {
    // Verify the token
    let payload: AccessPayload;
    try {
      payload = await this.tokens.verifyAccess(token);
    } catch {
      return { active: false };
    }

    // Check if MFA is pending - token is technically valid but user hasn't completed 2FA
    if (payload.mfa === 'pending') {
      return { active: false };
    }

    // Validate session is still active
    const session = await this.db.query.sessionsTable.findFirst({
      where: (t, { eq, isNull, gt, and }) =>
        and(
          eq(t.id, payload.sid),
          eq(t.clientId, payload.aud),
          isNull(t.revokedAt),
          gt(t.expiresAt, new Date()),
        ),
    });

    if (!session) {
      return { active: false };
    }

    // Get user info
    const user = await this.users.findById(payload.sub);
    if (!user || user.status !== 'active') {
      return { active: false };
    }

    // Get permissions for user in the session's client context
    const perms = await this.roles.permsForUserClient(
      payload.sub,
      payload.aud,
    );

    return {
      active: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isVerified: user.isVerified,
        status: user.status,
      },
      session: {
        id: session.id,
        clientId: session.clientId,
      },
      permissions: [...perms],
      exp: payload.exp,
    };
  }
}
