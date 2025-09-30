import {
  BadRequestException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { type Db } from '@site-haus/db';
import { DRIZZLE } from 'src/db/tokens';

@Injectable()
export class ClientsService {
  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

  async resolveByKey(key?: string) {
    if (!key) throw new BadRequestException('Missing x-client-key');

    const client = await this.db.query.clientsTable.findFirst({
      where: (t, { eq }) => eq(t.key, key),
    });

    if (!client) throw new UnauthorizedException('Unknown client');
    return client;
  }

  async resolveById(id?: string) {
    if (!id) throw new BadRequestException('Missing x-client-id');

    const client = await this.db.query.clientsTable.findFirst({
      where: (t, { eq }) => eq(t.id, id),
    });

    if (!client) throw new UnauthorizedException('Unknown client');
    return client;
  }
}
