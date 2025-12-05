import { registerAs } from '@nestjs/config';
import { EnvValidator } from '@site-haus/validation/core/env';

export default registerAs('auth', () => {
  const env = EnvValidator.parse(process.env);

  const secret = env.JWT_SECRET_B64URL
    ? Buffer.from(env.JWT_SECRET_B64URL, 'base64url')
    : env.JWT_SECRET
      ? Buffer.from(env.JWT_SECRET, 'utf-8')
      : null;

  if (!secret) {
    throw new Error('Missing JWT secret. Set JWT_SECRET_B64URL or JWT_SECRET');
  }

  return {
    alg: env.JWT_ALG,
    secret,
    accessTtlSec: env.ACCESS_TTL_SEC,
    refreshTtlSec: env.REFRESH_TTL_SEC,
  } as const;
});
