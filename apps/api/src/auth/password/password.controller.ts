import {
  Body,
  ConflictException,
  Controller,
  HttpCode,
  HttpException,
  HttpStatus,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { OtpService } from 'src/auth/otp/otp.service';
import { EmailService } from 'src/email/email.service';
import { Public } from 'src/public.decorator';
import { SessionService } from 'src/session/session.service';
import { UsersService } from 'src/users/users.service';
import { type AuthedRequest } from '../access/access.guard';
import { CryptoService } from '../crypto/crypto.service';

@Controller('password')
export class PasswordController {
  constructor(
    private readonly users: UsersService,
    private readonly crypto: CryptoService,
    private readonly otps: OtpService,
    private readonly sessions: SessionService,
    private readonly email: EmailService,
  ) {}

  @Post('change')
  @HttpCode(HttpStatus.NO_CONTENT)
  async changePassword(
    @Req() req: AuthedRequest,
    @Body() body: { currentPassword: string; newPassword: string },
  ) {
    const u = await this.users.findById(req.user!.userId);
    if (!u) throw new UnauthorizedException();
    const pc = await this.users.getPasswordCredential(u.id);
    if (!pc) throw new UnauthorizedException();

    const ok = await this.crypto.verifyPassword(
      pc.passwordHash,
      body.currentPassword,
    );

    if (!ok) throw new UnauthorizedException('Invalid Password');

    const newHash = await this.crypto.hashPassword(body.newPassword);
    await this.users.setPassword(u.id, newHash);

    await this.sessions.revokeAllOthers(u.id, req.user!.sessionId);
  }

  @Public()
  @Post('request-password-reset')
  @HttpCode(HttpStatus.NO_CONTENT)
  async requestReset(@Body() body: { email: string }) {
    const u = await this.users.findByEmail(body.email);
    console.log('Here in request reset');
    console.log(u);
    if (!u) return;
    const { code } = await this.otps.create(u.id, 'password_reset');
    console.log(code);
    await this.email.sendOtpCode(u.email, { code, appName: 'Site Haus' });
  }

  @Public()
  @Post('reset')
  @HttpCode(HttpStatus.NO_CONTENT)
  async reset(
    @Body() body: { email: string; code: string; newPassword: string },
  ) {
    const u = await this.users.findByEmail(body.email);
    if (!u) throw new UnauthorizedException();

    const res = await this.otps.consume(u.id, 'password_reset', body.code);

    if ('reason' in res) {
      switch (res.reason) {
        case 'too_many_attempts': {
          const retryAfterSec = 15 * 60;
          throw new HttpException(
            {
              message: 'Too many attempts, please request a new code.',
              headers: { 'Retry-After': String(retryAfterSec) },
            },
            HttpStatus.TOO_MANY_REQUESTS,
          );
        }
        case 'race':
          throw new ConflictException('Code already used.');
        case 'expired':
        case 'invalid':
        case 'not_found':
        default:
          throw new UnauthorizedException('Invalid or expired code');
      }
    }

    const newHash = await this.crypto.hashPassword(body.newPassword);
    await this.users.setPassword(u.id, newHash);

    await this.sessions.revokeAllForUser(u.id);
  }
}
