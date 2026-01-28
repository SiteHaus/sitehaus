import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { eq, schema, type Db } from '@site-haus/db';
import { type UpdateClientInput } from '@site-haus/validation/forms/client';
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

  /**
   * Get full client details by ID
   */
  async getById(id: string) {
    const client = await this.db.query.clientsTable.findFirst({
      where: (t, { eq }) => eq(t.id, id),
    });

    if (!client) throw new NotFoundException('Client not found');
    return client;
  }

  /**
   * Update client settings
   */
  async update(id: string, data: UpdateClientInput) {
    const [updated] = await this.db
      .update(schema.clientsTable)
      .set(data)
      .where(eq(schema.clientsTable.id, id))
      .returning();

    if (!updated) throw new NotFoundException('Client not found');
    return updated;
  }

  /**
   * List all redirect URIs for a client
   */
  async listRedirectUris(clientId: string) {
    return this.db.query.clientRedirectUrisTable.findMany({
      where: (t, { eq }) => eq(t.clientId, clientId),
    });
  }

  /**
   * Add a redirect URI to a client
   */
  async addRedirectUri(clientId: string, uri: string) {
    // Check for duplicates
    const existing = await this.db.query.clientRedirectUrisTable.findFirst({
      where: (t, { eq, and }) =>
        and(eq(t.clientId, clientId), eq(t.uri, uri)),
    });

    if (existing) {
      throw new ConflictException('Redirect URI already exists');
    }

    const [created] = await this.db
      .insert(schema.clientRedirectUrisTable)
      .values({ clientId, uri })
      .returning();

    return created;
  }

  /**
   * Remove a redirect URI from a client
   */
  async removeRedirectUri(clientId: string, uriId: string) {
    const [deleted] = await this.db
      .delete(schema.clientRedirectUrisTable)
      .where(
        eq(schema.clientRedirectUrisTable.id, uriId),
      )
      .returning();

    if (!deleted) throw new NotFoundException('Redirect URI not found');

    // Verify it belonged to the right client
    if (deleted.clientId !== clientId) {
      // This shouldn't happen due to the query, but just in case
      throw new NotFoundException('Redirect URI not found');
    }

    return deleted;
  }
}
