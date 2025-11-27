import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { type ConfigType } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import {
  loginSchema,
  registerSchema,
  requestVerifySchema,
  verifySchema,
} from '@site-haus/validation/forms/auth';
import { resetPasswordSchema } from '@site-haus/validation/forms/password';
import {
  type Request as ExpressRequest,
  type Response as ExpressResponse,
} from 'express';
import { ClientInRequest } from 'src/clients/client.guard';
import emailConfig from 'src/conf/email.config';
import { EmailService } from 'src/email/email.service';
import { Public } from 'src/public.decorator';
import { RolesService } from 'src/roles/roles.service';
import { UsersService } from 'src/users/users.service';
import { type AuthedRequest } from './access/access.guard';
import { AuthService } from './auth.service';
import {
  clearRefreshCookie,
  REFRESH_COOKIE,
  setRefreshCookie,
} from './cookie/cookies';
import { OtpService } from './otp/otp.service';
import { VerifiedOptional } from './verified/verified.guard';

@Throttle({ auth: {} })
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly users: UsersService,
    private readonly emailSvc: EmailService,
    private readonly otps: OtpService,
    private readonly roles: RolesService,
    @Inject(emailConfig.KEY)
    private readonly emailCfg: ConfigType<typeof emailConfig>,
  ) {}

  @Public()
  @Post('register')
  async register(
    @Body() body: unknown,
    @Req() req: ExpressRequest & ClientInRequest,
    @Res() res: ExpressResponse,
  ) {
    const parsed = registerSchema.parse(body);

    const result = await this.auth.register(parsed, {
      clientId: req.client!.id,
      ip: req.ip,
      ua: req.headers['user-agent'] as string | undefined,
    });

    setRefreshCookie(
      res,
      result.refreshToken,
      new Date(result.refreshTokenExpiresAt),
    );

    const user = await this.users.findById(result.userId);
    let requiresEmailVerification = false;
    if (user && !user.isVerified) {
      const { code } = await this.otps.create(user.id, 'email_verification');
      const verifyUrl = `${this.emailCfg.appBaseUrl}/verify?email=${encodeURIComponent(user.email)}&code=${code}`;
      await this.emailSvc.sendOtpCodeEmail(user.email, {
        code,
        appName: 'Site Haus',
        supportUrl: verifyUrl,
      });
      requiresEmailVerification = true;
    }

    const { refreshToken, ...rest } = result;
    return res
      .status(HttpStatus.OK)
      .json({ ...rest, requiresEmailVerification });
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Throttle({ auth: { limit: 5 } })
  @Post('login')
  async login(
    @Body() body: unknown,
    @Req() req: ExpressRequest & ClientInRequest,
    @Res() res: ExpressResponse,
  ) {
    const parsed = loginSchema.parse(body);

    const result = await this.auth.login(
      { email: parsed.email, password: parsed.password },
      {
        clientId: req.client!.id,
        ip: req.ip,
        ua: req.headers['user-agent'] as string | undefined,
      },
    );

    setRefreshCookie(
      res,
      result.refreshToken,
      new Date(result.refreshTokenExpiresAt),
    );
    const { refreshToken, ...rest } = result;
    return res.json(rest);
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  async refresh(
    @Req() req: ExpressRequest & ClientInRequest,
    @Res() res: ExpressResponse,
  ) {
    const token =
      req.cookies && (req.cookies[REFRESH_COOKIE] as string | undefined);
    if (!token) throw new BadRequestException('No refresh token');

    try {
      const result = await this.auth.refresh({
        clientId: req.client!.id,
        refreshToken: token,
        ip: req.ip,
        ua: req.headers['user-agent'] as string | undefined,
      });
      setRefreshCookie(
        res,
        result.refreshToken,
        new Date(result.refreshTokenExpiresAt),
      );
      const { refreshToken, ...rest } = result;
      return res.json(rest);
    } catch (e) {
      clearRefreshCookie(res);
      throw e;
    }
  }

  @VerifiedOptional()
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('logout')
  async logout(@Req() req: AuthedRequest, @Res() res: ExpressResponse) {
    const sid = req.user?.sessionId;
    if (sid) await this.auth.logoutBySid(sid);
    clearRefreshCookie(res);
    return res.send();
  }

  @VerifiedOptional()
  @Get('me')
  async me(@Req() req: AuthedRequest) {
    const { userId, clientId, sessionId } = req.user!;

    const user = await this.users.findById(userId);
    const perms = await this.roles.permsForUserClient(userId, clientId);

    return {
      user: user
        ? {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            isVerified: user.isVerified,
            status: user.status,
          }
        : null,
      session: { id: sessionId, clientId },
      permissions: [...perms],
    };
  }

  @Public()
  @Post('request-email-verification')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ auth: { ttl: 15 * 60, limit: 5 } })
  async requestEmailVerification(@Body() body: unknown) {
    const { email } = requestVerifySchema.parse(body);

    const u = await this.users.findByEmail(email);
    if (!u || u.isVerified) return;

    const { code } = await this.otps.create(u.id, 'email_verification');
    const verifyUrl = `${this.emailCfg.appBaseUrl}/verify?email=${encodeURIComponent(email)}&code=${code}`;

    await this.emailSvc.sendOtpCodeEmail(email, {
      code,
      appName: 'Site Haus',
      supportUrl: verifyUrl,
    });
  }

  @Public()
  @Post('verify-email')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ auth: { limit: 6 } })
  async verifyEmail(@Body() body: unknown) {
    const { email, code } = verifySchema.parse(body);

    const u = await this.users.findByEmail(email);
    if (!u) throw new BadRequestException('Invalid email or code');

    const res = await this.otps.consume(u.id, 'email_verification', code);

    if ('reason' in res)
      throw new BadRequestException('Invalid or expired code');
    await this.users.setVerified(u.id, true);
  }

  @Public()
  @Post('login-with-reset-code')
  @HttpCode(HttpStatus.OK)
  @Throttle({ auth: { limit: 6 } })
  async loginWithResetCode(
    @Body() body: unknown,
    @Req() req: ExpressRequest & ClientInRequest,
    @Res() res: ExpressResponse,
  ) {
    const parsed = resetPasswordSchema
      .pick({ email: true, code: true })
      .parse(body);

    const u = await this.users.findByEmail(parsed.email);
    if (!u) throw new UnauthorizedException('Invalid Email or code');

    const otpRes = await this.otps.consume(u.id, 'password_reset', parsed.code);

    if ('reason' in otpRes) {
      throw new UnauthorizedException('Invalid or expired code');
    }

    const tokens = await this.auth.issueTokensForOTP(u.id, {
      clientId: req.client!.id,
      ip: req.ip,
      ua: req.headers['user-agent'],
    });

    setRefreshCookie(
      res,
      tokens.refreshToken,
      new Date(tokens.refreshTokenExpiresAt),
    );

    const { refreshToken, ...rest } = tokens;

    return res.json({
      ...rest,
      isOtpLogin: true,
      requiresEmailVerification: !u.isVerified,
    });
  }
}
