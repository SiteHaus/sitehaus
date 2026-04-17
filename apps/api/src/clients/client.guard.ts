import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { Request } from 'express';
import { ClientsService } from './clients.service';

export type ClientInRequest = {
  client?: { id: string; audience: string; key: string; firstParty: boolean };
};

@Injectable()
export class ClientGuard implements CanActivate {
  constructor(private readonly clients: ClientsService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<Request & ClientInRequest>();
    const key = req.header('x-client-key')?.trim();
    const id = req.header('x-client-id')?.trim();

    const caller = key ? await this.clients.resolveByKey(key) : null;
    if (key && !caller) throw new BadRequestException('Unknown client (key)');

    const target = id ? await this.clients.resolveById(id) : null;
    if (id && !target) throw new BadRequestException('Unknown client (id)');

    if (caller && target && caller.id !== target.id) {
      if (!caller.firstParty) {
        throw new BadRequestException('Client header mismatch');
      }

      // First-party client targeting another client
      req.client = {
        id: target.id,
        audience: target.audience,
        key: caller.key,
        firstParty: caller.firstParty,
      };
    } else {
      // Same client or only one specified
      req.client = target ?? caller ?? undefined;
    }
    return true;
  }
}
