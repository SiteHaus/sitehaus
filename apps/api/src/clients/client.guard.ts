import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
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
    const key = req.header('x-client-key') ?? req.header('x-client-id');
    const client = await this.clients.resolveByKey(key);

    req.client = client as any;
    return true;
  }
}
