import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AccessPayload } from '../access/access.guard';

@Injectable()
export class TokenService {
  constructor(private readonly jwt: JwtService) {}

  signAccessToken(
    payload: Record<string, unknown>,
    opts: { expiresInSec: number },
  ) {
    return this.jwt.signAsync(payload, { expiresIn: opts.expiresInSec });
  }

  verify<T extends object = any>(token: string) {
    return this.jwt.verifyAsync<T>(token, { algorithms: ['HS256'] as const });
  }

  verifyAccess(token: string) {
    return this.verify<AccessPayload>(token);
  }
}
