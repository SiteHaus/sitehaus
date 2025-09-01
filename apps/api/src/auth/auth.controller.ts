import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { ReqCtx } from '@site-haus/utils/core/req-ctx.decorator';
import { type RequestContext } from '@site-haus/utils/core/request-context';
import { loginSchema, registerSchema } from '@site-haus/validation/forms/users';
import {
  type Request as ExpressRequest,
  type Response as ExpressResponse,
} from 'express';
import { Public } from 'src/public.decorator';
import { type AuthedRequest } from './access/access.guard';
import { AuthService } from './auth.service';
import {
  clearRefreshCookie,
  REFRESH_COOKIE,
  setRefreshCookie,
} from './cookies';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('register')
  async register(
    @Body() body: unknown,
    @ReqCtx({ headerName: 'x-client-id' }) ctx: RequestContext,
    @Res()
    res: ExpressResponse,
  ) {
    const parsed = registerSchema.parse(body);
    const result = await this.auth.register(parsed, ctx);

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
    @ReqCtx({ headerName: 'x-client-id' }) ctx: RequestContext,
    @Res() res: ExpressResponse,
  ) {
    const parsed = loginSchema.parse(body);
    const result = await this.auth.login(
      { email: parsed.email, password: parsed.password },
      ctx,
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
    @Req() req: ExpressRequest,
    @ReqCtx({ headerName: 'x-client-id' }) ctx: RequestContext,
    @Res() res: ExpressResponse,
  ) {
    const token =
      req.cookies && (req.cookies[REFRESH_COOKIE] as string | undefined);
    if (!token) throw new BadRequestException('No refresh token');

    try {
      const result = await this.auth.refresh({
        clientId: ctx.clientId,
        refreshToken: token,
        ip: ctx.ip,
        ua: ctx.ua,
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
}
