import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Patch,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { type ConfigType } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import {
  changeEmailConfirmSchema,
  changeEmailRequestSchema,
  deleteAccountSchema,
  disable2faSchema,
  enable2faSchema,
  updateProfileSchema,
} from '@site-haus/validation/forms/account';
import { type Response as ExpressResponse } from 'express';
import { AuditService } from 'src/audit/audit.service';
import { type ClientInRequest } from 'src/clients/client.guard';
import emailConfig from 'src/conf/email.config';
import { CryptoService } from 'src/crypto/crypto.service';
import { EmailService } from 'src/email/email.service';
import { UsersService } from 'src/users/users.service';
import { type AuthedRequest } from '../access/access.guard';
import { clearAllRefreshCookies } from '../cookie/cookies';
import { OtpService } from '../otp/otp.service';
import { TotpService } from '../totp/totp.service';

@Throttle({ auth: {} })
@Controller('auth')
export class AccountController {
  constructor(
    private readonly users: UsersService,
    private readonly crypto: CryptoService,
    private readonly otps: OtpService,
    private readonly totp: TotpService,
    private readonly emailSvc: EmailService,
    private readonly audit: AuditService,
    @Inject(emailConfig.KEY)
    private readonly emailCfg: ConfigType<typeof emailConfig>,
  ) {}

  /**
   * Update profile (first name, last name)
   */
  @Patch('profile')
  async updateProfile(@Body() body: unknown, @Req() req: AuthedRequest) {
    const { firstName, lastName } = updateProfileSchema.parse(body);
    const user = await this.users.updateProfile(req.user!.userId, {
      firstName,
      lastName,
    });

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      isVerified: user.isVerified,
      status: user.status,
    };
  }

  /**
   * Request email change - sends OTP to new email
   */
  @Post('email/request')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ auth: { ttl: 15 * 60_000, limit: 3 } })
  async requestEmailChange(@Body() body: unknown, @Req() req: AuthedRequest) {
    const { newEmail, password } = changeEmailRequestSchema.parse(body);

    // Verify current password
    const user = await this.users.findById(req.user!.userId);
    if (!user) throw new UnauthorizedException('User not found');

    const cred = await this.users.getPasswordCredential(user.id);
    if (!cred) throw new UnauthorizedException('Invalid credentials');

    const valid = await this.crypto.verifyPassword(cred.passwordHash, password);
    if (!valid) throw new UnauthorizedException('Invalid password');

    // Check if new email is already in use
    const existing = await this.users.findByEmail(newEmail);
    if (existing && existing.id !== user.id) {
      throw new ConflictException('Email already in use');
    }

    // Create OTP and send to new email
    const { code } = await this.otps.create(user.id, 'email_change', {
      meta: { newEmail },
    });

    await this.emailSvc.sendOtpCodeEmail(newEmail, {
      code,
      appName: 'Site Haus',
      supportUrl: this.emailCfg.appBaseUrl,
    });
  }

  /**
   * Confirm email change with OTP
   */
  @Post('email/confirm')
  @HttpCode(HttpStatus.OK)
  @Throttle({ auth: { limit: 6 } })
  async confirmEmailChange(@Body() body: unknown, @Req() req: AuthedRequest) {
    const { code } = changeEmailConfirmSchema.parse(body);

    const user = await this.users.findById(req.user!.userId);
    if (!user) throw new UnauthorizedException('User not found');

    const res = await this.otps.consume(user.id, 'email_change', code);

    if ('reason' in res) {
      throw new BadRequestException('Invalid or expired code');
    }

    // Get the new email from OTP metadata
    const newEmail = res.otp.meta?.newEmail as string | undefined;
    if (!newEmail) {
      throw new BadRequestException('Email change request expired');
    }

    const updatedUser = await this.users.updateEmail(user.id, newEmail);

    return {
      id: updatedUser.id,
      email: updatedUser.email,
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
      isVerified: updatedUser.isVerified,
      status: updatedUser.status,
    };
  }

  /**
   * Delete account
   */
  @Delete('account')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAccount(
    @Body() body: unknown,
    @Req() req: AuthedRequest,
    @Res() res: ExpressResponse,
  ) {
    const { password, confirmation } = deleteAccountSchema.parse(body);

    if (confirmation !== 'DELETE') {
      throw new BadRequestException('Type "DELETE" to confirm');
    }

    const user = await this.users.findById(req.user!.userId);
    if (!user) throw new UnauthorizedException('User not found');

    const cred = await this.users.getPasswordCredential(user.id);
    if (!cred) throw new UnauthorizedException('Invalid credentials');

    const valid = await this.crypto.verifyPassword(cred.passwordHash, password);
    if (!valid) throw new UnauthorizedException('Invalid password');

    await this.users.deleteUser(user.id);
    clearAllRefreshCookies(res, req.cookies as Record<string, string>);
    return res.send();
  }

  // =============== 2FA Endpoints ===============

  /**
   * Get 2FA status
   */
  @Get('2fa/status')
  async get2faStatus(@Req() req: AuthedRequest) {
    return this.totp.getStatus(req.user!.userId);
  }

  /**
   * Setup 2FA - generate secret and QR code
   */
  @Post('2fa/setup')
  @HttpCode(HttpStatus.OK)
  async setup2fa(@Req() req: AuthedRequest) {
    const user = await this.users.findById(req.user!.userId);
    if (!user) throw new UnauthorizedException('User not found');

    return this.totp.setup(user.id, user.email);
  }

  /**
   * Enable 2FA - verify TOTP code and activate
   */
  @Post('2fa/enable')
  @HttpCode(HttpStatus.OK)
  @Throttle({ auth: { limit: 6 } })
  async enable2fa(
    @Body() body: unknown,
    @Req() req: AuthedRequest & ClientInRequest,
  ) {
    const { code } = enable2faSchema.parse(body);

    // The secret should be stored temporarily (e.g., in session or passed from client)
    // For security, we'll require the client to pass the secret they received from setup
    const secret = (body as { secret?: string }).secret;
    if (!secret) {
      throw new BadRequestException(
        'Secret is required. Call /2fa/setup first.',
      );
    }

    const result = await this.totp.enable(req.user!.userId, secret, code);

    await this.audit.log({
      clientId: req.client?.id ?? req.user!.clientId,
      userId: req.user!.userId,
      action: 'user.2fa.enabled',
      targetType: 'user',
      targetId: req.user!.userId,
      ip: req.ip,
      ua: req.headers['user-agent'] as string | undefined,
    });

    return result;
  }

  /**
   * Disable 2FA
   */
  @Post('2fa/disable')
  @HttpCode(HttpStatus.NO_CONTENT)
  async disable2fa(
    @Body() body: unknown,
    @Req() req: AuthedRequest & ClientInRequest,
  ) {
    const { password } = disable2faSchema.parse(body);

    const user = await this.users.findById(req.user!.userId);
    if (!user) throw new UnauthorizedException('User not found');

    const cred = await this.users.getPasswordCredential(user.id);
    if (!cred) throw new UnauthorizedException('Invalid credentials');

    const valid = await this.crypto.verifyPassword(cred.passwordHash, password);
    if (!valid) throw new UnauthorizedException('Invalid password');

    await this.totp.disable(user.id);

    await this.audit.log({
      clientId: req.client?.id ?? req.user!.clientId,
      userId: req.user!.userId,
      action: 'user.2fa.disabled',
      targetType: 'user',
      targetId: req.user!.userId,
      ip: req.ip,
      ua: req.headers['user-agent'] as string | undefined,
    });
  }
}
