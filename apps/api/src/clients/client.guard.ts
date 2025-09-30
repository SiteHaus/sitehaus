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

    let client = null;

    if (key) {
      client = await this.clients.resolveByKey(key);
      if (!client) throw new BadRequestException('Unknown client (key)');
    } else if (id) {
      client = await this.clients.resolveById(id);
      if (!client) throw new BadRequestException('Unknown client (id)');
    }

    if (key && id && client && client.id != id) {
      throw new BadRequestException('Client header mismatch');
    }

    req.client = client ?? undefined;
    return true;
  }
}
