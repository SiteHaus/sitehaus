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
import { Throttle } from '@nestjs/throttler';
import {
  changePasswordSchema,
  requestPasswordResetSchema,
  resetPasswordSchema,
} from '@site-haus/validation/forms/password';
import { OtpService } from 'src/auth/otp/otp.service';
import { EmailService } from 'src/email/email.service';
import { Public } from 'src/public.decorator';
import { SessionService } from 'src/session/session.service';
import { UsersService } from 'src/users/users.service';
import { CryptoService } from '../../crypto/crypto.service';
import { type AuthedRequest } from '../access/access.guard';
import { VerifiedOptional } from '../verified/verified.guard';

@Throttle({ auth: {} })
@VerifiedOptional()
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
  async changePassword(@Req() req: AuthedRequest, @Body() body: unknown) {
    const parsed = changePasswordSchema.parse(body);

    const u = await this.users.findById(req.user!.userId);
    if (!u) throw new UnauthorizedException();
    const pc = await this.users.getPasswordCredential(u.id);
    if (!pc) throw new UnauthorizedException();

    const ok = await this.crypto.verifyPassword(
      pc.passwordHash,
      parsed.currentPassword,
    );

    if (!ok) throw new UnauthorizedException('Invalid Password');

    const newHash = await this.crypto.hashPassword(parsed.newPassword);
    await this.users.setPassword(u.id, newHash);

    await this.sessions.revokeAllOthers(u.id, req.user!.sessionId);
  }

  @Public()
  @Post('request-password-reset')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ auth: { ttl: 15 * 60, limit: 5 } })
  async requestReset(@Body() body: unknown) {
    const parsed = requestPasswordResetSchema.parse(body);

    const u = await this.users.findByEmail(parsed.email);
    if (!u) return;
    const { code } = await this.otps.create(u.id, 'password_reset');
    await this.email.sendOtpCodeEmail(u.email, { code, appName: 'Site Haus' });
  }

  @Public()
  @Post('reset')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ auth: { limit: 6 } })
  async reset(@Body() body: unknown) {
    const parsed = resetPasswordSchema.parse(body);

    const u = await this.users.findByEmail(parsed.email);
    if (!u) throw new UnauthorizedException();

    const res = await this.otps.consume(u.id, 'password_reset', parsed.code);

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

    const newHash = await this.crypto.hashPassword(parsed.newPassword);
    await this.users.setPassword(u.id, newHash);

    await this.sessions.revokeAllForUser(u.id);
  }
}
