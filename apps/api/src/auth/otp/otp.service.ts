import { Inject, Injectable } from '@nestjs/common';
import {
  and,
  eq,
  gt,
  isNull,
  OtpPurpose,
  schema,
  type Db,
} from '@site-haus/db';
import { CryptoService } from 'src/crypto/crypto.service';
import { DRIZZLE } from 'src/db/tokens';

@Injectable()
export class OtpService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Db,
    private readonly crypto: CryptoService,
  ) {}

  async create(
    userId: string,
    purpose: OtpPurpose,
    opts: { ttlSec?: number; meta?: Record<string, unknown> } = {},
  ) {
    const ttlSec = opts.ttlSec ?? 15 * 60;
    const now = new Date();
    const code = this.crypto.generateCode();
    const codeHash = this.crypto.sha256b64url(code);
    const expiresAt = new Date(Date.now() + ttlSec * 1000);

    // Remove any previous active OTP's
    await this.db
      .update(schema.otpsTable)
      .set({ consumedAt: now })
      .where(
        and(
          eq(schema.otpsTable.userId, userId),
          eq(schema.otpsTable.purpose, purpose),
          isNull(schema.otpsTable.consumedAt),
          gt(schema.otpsTable.expiresAt, now),
        ),
      );

    await this.db
      .insert(schema.otpsTable)
      .values({ userId, purpose, codeHash, expiresAt, meta: opts.meta });

    return { code, expiresAt };
  }

  async consume(
    userId: string,
    purpose: OtpPurpose,
    code: string,
    opts: { maxAttempts?: number } = {},
  ): Promise<
    | { ok: true; otp: { meta?: Record<string, unknown> | null } }
    | {
        ok: false;
        reason:
          | 'not_found'
          | 'expired'
          | 'invalid'
          | 'too_many_attempts'
          | 'race';
      }
  > {
    const maxAttempts = opts.maxAttempts ?? 5;
    const now = new Date();

    return this.db.transaction(async (tx) => {
      const otp = await tx.query.otpsTable.findFirst({
        where: (t, { and: _and, eq: _eq, isNull: _isNull, gt: _gt }) =>
          _and(
            _eq(t.userId, userId),
            _eq(t.purpose, purpose),
            _isNull(t.consumedAt),
            _gt(t.expiresAt, now),
          ),
      });

      if (!otp) {
        const expired = await tx.query.otpsTable.findFirst({
          where: (t, { and: _and, eq: _eq, isNull: _isNull, lt: _lt }) =>
            _and(
              _eq(t.userId, userId),
              _eq(t.purpose, purpose),
              _isNull(t.consumedAt),
              _lt(t.expiresAt, now),
            ),
        });
        return expired
          ? { ok: false, reason: 'expired' }
          : { ok: false, reason: 'not_found' };
      }

      if ((otp.attempts ?? 0) >= maxAttempts) {
        await tx
          .update(schema.otpsTable)
          .set({ consumedAt: now })
          .where(eq(schema.otpsTable.id, otp.id));
        return { ok: false, reason: 'too_many_attempts' };
      }

      const submittedHash = this.crypto.sha256b64url(code);
      const match = this.crypto.safeEqual(otp.codeHash, submittedHash);

      if (match) {
        const updated = await tx
          .update(schema.otpsTable)
          .set({ consumedAt: now, attempts: (otp.attempts ?? 0) + 1 })
          .where(
            and(
              eq(schema.otpsTable.id, otp.id),
              isNull(schema.otpsTable.consumedAt),
            ),
          )
          .returning({ id: schema.otpsTable.id });

        return updated.length
          ? { ok: true, otp: { meta: otp.meta } }
          : { ok: false, reason: 'race' };
      }

      const nextAttempts = (otp.attempts ?? 0) + 1;
      await tx
        .update(schema.otpsTable)
        .set({
          attempts: nextAttempts,
          consumedAt: nextAttempts >= maxAttempts ? now : null,
        })
        .where(eq(schema.otpsTable.id, otp.id));

      return {
        ok: false,
        reason: nextAttempts >= maxAttempts ? 'too_many_attempts' : 'invalid',
      };
    });
  }
}
