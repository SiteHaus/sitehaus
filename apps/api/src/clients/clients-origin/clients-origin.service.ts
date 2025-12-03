import { Inject, Injectable } from '@nestjs/common';
import { schema, type Db } from '@site-haus/db';
import { DRIZZLE } from 'src/db/tokens';

@Injectable()
export class ClientsOriginService {
  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

  async getAllowedOrigins(): Promise<Set<string>> {
    const rows = await this.db
      .select({ uri: schema.clientRedirectUrisTable.uri })
      .from(schema.clientRedirectUrisTable);

    const origins = new Set<string>();
    for (const { uri } of rows) {
      try {
        const u = new URL(uri);
        if (u.protocol === 'http:' || u.protocol === 'https:') {
          origins.add(u.origin);
        }
      } catch (e) {
        console.error(e);
      }
    }

    origins.add('http://localhost:3000');
    origins.add('http://localhost:3001');
    origins.add('http://localhost:3002');

    return origins;
  }
}
