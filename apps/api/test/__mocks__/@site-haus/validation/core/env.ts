type PEnv = Record<string, string | undefined>;

export const EnvValidator = {
  parse(env: PEnv) {
    return {
      NODE_ENV: env.NODE_ENV ?? 'test',
      DATABASE_URL:
        env.DATABASE_URL ?? 'postgres://user:pass@localhost:5432/db',
      PORT: Number(env.PORT ?? 3003),

      JWT_ALG: (env.JWT_ALG ?? 'HS256') as 'HS256',
      JWT_SECRET_B64URL: env.JWT_SECRET_B64URL,
      JWT_SECRET: env.JWT_SECRET ?? 'test-secret',
      ACCESS_TTL_SEC: Number(env.ACCESS_TTL_SEC ?? 300),
      REFRESH_TTL_SEC: Number(env.REFRESH_TTL_SEC ?? 60 * 60 * 24 * 30),

      CORS_ORIGINS: env.CORS_ORIGINS,
      COOKIE_SECURE: false,
    };
  },
};
