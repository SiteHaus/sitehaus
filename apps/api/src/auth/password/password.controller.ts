import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { OtpService } from 'src/otp/otp.service';
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

  @Post('request-password-reset')
  @HttpCode(HttpStatus.NO_CONTENT)
  async requestReset(@Body() body: { email: string }) {
    const u = await this.users.findByEmail(body.email);
    if (!u) return;
    const { code } = await this.otps.create(u.id, 'password_reset');
    //TODO: Hook into Amazon SES
  }

  @Post('reset')
  @HttpCode(HttpStatus.NO_CONTENT)
  async reset(
    @Body() body: { email: string; code: string; newPassword: string },
  ) {
    const u = await this.users.findByEmail(body.email);
    if (!u) throw new UnauthorizedException();

    const ok = await this.otps.consume(u.id, 'password_reset', body.code);
    if (!ok) throw new UnauthorizedException('Invalid or expired code');

    const newHash = await this.crypto.hashPassword(body.newPassword);
    await this.users.setPassword(u.id, newHash);

    await this.sessions.revokeAllForUser(u.id);
  }
}
