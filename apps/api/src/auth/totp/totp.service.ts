import {
  ConflictException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { type Db, eq, schema } from '@site-haus/db';
import * as OTPAuth from 'otpauth';
import * as QRCode from 'qrcode';
import { CryptoService } from 'src/crypto/crypto.service';
import { DRIZZLE } from 'src/db/tokens';

const ISSUER = 'SiteHaus';
const BACKUP_CODE_COUNT = 10;

@Injectable()
export class TotpService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Db,
    private readonly crypto: CryptoService,
  ) {}

  /**
   * Check if 2FA is enabled for a user
   */
  async getStatus(userId: string) {
    const cred = await this.db.query.totpCredentialsTable.findFirst({
      where: (t, { eq }) => eq(t.userId, userId),
    });

    return {
      enabled: !!cred,
      enabledAt: cred?.enabledAt ?? null,
    };
  }

  /**
   * Generate a new TOTP secret and QR code for setup
   * Does NOT save to database - that happens on enable()
   */
  async setup(userId: string, userEmail: string) {
    // Check if already enabled
    const existing = await this.db.query.totpCredentialsTable.findFirst({
      where: (t, { eq }) => eq(t.userId, userId),
    });

    if (existing) {
      throw new ConflictException('2FA is already enabled');
    }

    // Generate a new TOTP secret
    const totp = new OTPAuth.TOTP({
      issuer: ISSUER,
      label: userEmail,
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
    });

    const secret = totp.secret.base32;
    const otpauthUrl = totp.toString();

    // Generate QR code as data URL
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);

    return {
      secret,
      qrCodeDataUrl,
      otpauthUrl,
    };
  }

  /**
   * Enable 2FA by verifying the TOTP code and saving credentials
   */
  async enable(userId: string, secret: string, code: string) {
    // Check if already enabled
    const existing = await this.db.query.totpCredentialsTable.findFirst({
      where: (t, { eq }) => eq(t.userId, userId),
    });

    if (existing) {
      throw new ConflictException('2FA is already enabled');
    }

    // Verify the code
    const totp = new OTPAuth.TOTP({
      issuer: ISSUER,
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(secret),
    });

    const delta = totp.validate({ token: code, window: 1 });
    if (delta === null) {
      throw new UnauthorizedException('Invalid verification code');
    }

    // Generate backup codes
    const backupCodes: string[] = [];
    const backupCodesHashed: string[] = [];

    for (let i = 0; i < BACKUP_CODE_COUNT; i++) {
      const code = this.crypto.randomIdOfLength(12);
      backupCodes.push(code);
      backupCodesHashed.push(this.crypto.sha256b64url(code));
    }

    // Encrypt the secret and save
    const secretEncrypted = this.crypto.encrypt(secret);

    await this.db.insert(schema.totpCredentialsTable).values({
      userId,
      secretEncrypted,
      backupCodesHashed,
      enabledAt: new Date(),
    });

    return {
      enabled: true,
      backupCodes, // Return plain backup codes ONCE for user to save
    };
  }

  /**
   * Disable 2FA for a user
   */
  async disable(userId: string) {
    const existing = await this.db.query.totpCredentialsTable.findFirst({
      where: (t, { eq }) => eq(t.userId, userId),
    });

    if (!existing) {
      throw new ConflictException('2FA is not enabled');
    }

    await this.db
      .delete(schema.totpCredentialsTable)
      .where(eq(schema.totpCredentialsTable.userId, userId));
  }

  /**
   * Verify a TOTP code for login
   */
  async verify(userId: string, code: string): Promise<boolean> {
    const cred = await this.db.query.totpCredentialsTable.findFirst({
      where: (t, { eq }) => eq(t.userId, userId),
    });

    if (!cred) {
      return false; // 2FA not enabled, skip verification
    }

    // Try TOTP code first
    const secret = this.crypto.decrypt(cred.secretEncrypted);
    const totp = new OTPAuth.TOTP({
      issuer: ISSUER,
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(secret),
    });

    const delta = totp.validate({ token: code, window: 1 });
    if (delta !== null) {
      return true;
    }

    // Try backup codes
    const codeHash = this.crypto.sha256b64url(code);
    const backupCodes = cred.backupCodesHashed as string[];
    const codeIndex = backupCodes.findIndex((h) =>
      this.crypto.safeEqual(h, codeHash),
    );

    if (codeIndex !== -1) {
      // Remove used backup code
      const updatedCodes = [...backupCodes];
      updatedCodes.splice(codeIndex, 1);

      await this.db
        .update(schema.totpCredentialsTable)
        .set({ backupCodesHashed: updatedCodes })
        .where(eq(schema.totpCredentialsTable.userId, userId));

      return true;
    }

    return false;
  }

  /**
   * Check if user has 2FA enabled (for login flow)
   */
  async isEnabled(userId: string): Promise<boolean> {
    const cred = await this.db.query.totpCredentialsTable.findFirst({
      where: (t, { eq }) => eq(t.userId, userId),
      columns: { id: true },
    });

    return !!cred;
  }
}
