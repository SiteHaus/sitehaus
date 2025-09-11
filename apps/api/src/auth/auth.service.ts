import {
  ConflictException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { type ConfigType } from '@nestjs/config';
import authConfig from 'src/conf/auth.config';
import { UserExistsError } from 'src/errors/auth.errors';
import { RolesService } from 'src/roles/roles.service';
import { SessionService } from 'src/session/session.service';
import { UsersService } from 'src/users/users.service';
import { CryptoService } from '../crypto/crypto.service';
import { TokenService } from './token/token.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly crypto: CryptoService,
    private readonly sessions: SessionService,
    private readonly tokens: TokenService,
    private readonly roles: RolesService,
    @Inject(authConfig.KEY) private readonly cfg: ConfigType<typeof authConfig>,
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

    const pc = await this.users.getPasswordCredential(user.id);
    if (!pc) throw new UnauthorizedException('Invalid email or password');

    const ok = await this.crypto.verifyPassword(
      pc.passwordHash,
      input.password,
    );
    if (!ok) throw new UnauthorizedException('Invalid email or password');

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

  private async issueTokens(
    userId: string,
    ctx: { clientId: string; ip?: string; ua?: string },
  ) {
    const { sessionId, refreshToken, refreshExpiresAt } =
      await this.sessions.createSession({
        userId,
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
}
