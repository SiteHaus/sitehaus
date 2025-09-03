import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { loginSchema, registerSchema } from '@site-haus/validation/forms/users';
import {
  type Request as ExpressRequest,
  type Response as ExpressResponse,
} from 'express';
import { ClientInRequest } from 'src/clients/client.guard';
import { Public } from 'src/public.decorator';
import { UsersService } from 'src/users/users.service';
import { type AuthedRequest } from './access/access.guard';
import { AuthService } from './auth.service';
import {
  clearRefreshCookie,
  REFRESH_COOKIE,
  setRefreshCookie,
} from './cookie/cookies';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly users: UsersService,
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

    const { refreshToken, ...rest } = result;
    return res.status(HttpStatus.OK).json(rest);
  }

  @Public()
  @HttpCode(HttpStatus.OK)
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

  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('logout')
  async logout(@Req() req: AuthedRequest, @Res() res: ExpressResponse) {
    const sid = req.user?.sessionId;
    if (sid) await this.auth.logoutBySid(sid);
    clearRefreshCookie(res);
    return res.send();
  }

  @Get('me')
  async me(@Req() req: AuthedRequest) {
    const { userId, clientId, sessionId } = req.user!;
    const user = await this.users.findById(userId);

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
    };
  }
}
