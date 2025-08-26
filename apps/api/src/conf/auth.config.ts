import { registerAs } from '@nestjs/config';
import { EnvValidator } from '@site-haus/validation/core/env';

export default registerAs('auth', () => {
  const env = EnvValidator.parse({
    JWT_SECRET: process.env.JWT_SECRET,
    JWT_SECRET_B64URL: process.env.JWT_SECRET_B64URL,
    JWT_ALG: process.env.JWT_ALG,
  });

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
  } as const;
});
