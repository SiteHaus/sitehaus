import { Inject, Injectable } from '@nestjs/common';
import { and, eq, schema, type Db } from '@site-haus/db';
import { ClientsService } from 'src/clients/clients.service';
import { DRIZZLE } from 'src/db/tokens';
import { RolesService } from 'src/roles/roles.service';

export interface AuthorizationRequest {
  clientId: string;
  redirectUri: string;
  responseType: string;
  codeChallenge: string;
  codeChallengeMethod: string;
  scope?: string;
  state?: string;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
  errorDescription?: string;
}

@Injectable()
export class OAuthService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Db,
    private readonly clientsService: ClientsService,
    private readonly roles: RolesService,
  ) {}

  /**
   * Validate OAuth2 authorization request
   */
  async validateAuthorizationRequest(
    params: AuthorizationRequest,
  ): Promise<ValidationResult> {
    // Validate response_type
    if (params.responseType !== 'code') {
      return {
        valid: false,
        error: 'unsupported_response_type',
        errorDescription: 'Only "code" response type is supported',
      };
    }

    // Validate code_challenge_method
    if (params.codeChallengeMethod !== 'S256') {
      return {
        valid: false,
        error: 'invalid_request',
        errorDescription: 'Only S256 code challenge method is supported',
      };
    }

    // Validate code_challenge format (43-128 chars, base64url)
    if (
      !params.codeChallenge ||
      params.codeChallenge.length < 43 ||
      params.codeChallenge.length > 128
    ) {
      return {
        valid: false,
        error: 'invalid_request',
        errorDescription: 'Invalid code_challenge format',
      };
    }

    // Validate client exists
    let client;
    try {
      client = await this.clientsService.resolveById(params.clientId);
    } catch {
      return {
        valid: false,
        error: 'invalid_client',
        errorDescription: 'Unknown client',
      };
    }

    // Validate redirect_uri matches registered URIs
    const redirectUris = await this.db
      .select()
      .from(schema.clientRedirectUrisTable)
      .where(
        and(
          eq(schema.clientRedirectUrisTable.clientId, params.clientId),
          eq(schema.clientRedirectUrisTable.uri, params.redirectUri),
        ),
      )
      .limit(1);

    if (redirectUris.length === 0) {
      return {
        valid: false,
        error: 'invalid_request',
        errorDescription: 'Invalid redirect_uri',
      };
    }

    // Validate scope (if provided) against allowed scopes
    if (params.scope && client.allowedScopes) {
      const requestedScopes = params.scope.split(' ');
      const allowedScopes = client.allowedScopes.split(' ');

      const invalidScopes = requestedScopes.filter(
        (scope) => !allowedScopes.includes(scope),
      );

      if (invalidScopes.length > 0) {
        return {
          valid: false,
          error: 'invalid_scope',
          errorDescription: `Invalid scopes: ${invalidScopes.join(', ')}`,
        };
      }
    }

    return { valid: true };
  }

  /**
   * Check if user has already granted consent for the requested scope
   */
  async checkConsent(
    userId: string,
    clientId: string,
    scope: string,
    db?: Db,
  ): Promise<boolean> {
    const dbInstance = db ?? this.db;

    const consents = await dbInstance
      .select()
      .from(schema.userConsentsTable)
      .where(
        and(
          eq(schema.userConsentsTable.userId, userId),
          eq(schema.userConsentsTable.clientId, clientId),
          eq(schema.userConsentsTable.scope, scope),
        ),
      )
      .limit(1);

    const consent = consents[0];

    if (!consent) {
      return false;
    }

    // Check if consent has expired
    if (consent.expiresAt && consent.expiresAt < new Date()) {
      return false;
    }

    return true;
  }

  /**
   * Grant and store user consent
   */
  async grantConsent(
    userId: string,
    clientId: string,
    scope: string,
    expiresAt?: Date,
    db?: Db,
  ): Promise<void> {
    const dbInstance = db ?? this.db;

    // Check if consent already exists
    const existing = await dbInstance
      .select()
      .from(schema.userConsentsTable)
      .where(
        and(
          eq(schema.userConsentsTable.userId, userId),
          eq(schema.userConsentsTable.clientId, clientId),
          eq(schema.userConsentsTable.scope, scope),
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      // Update expiration if provided
      if (expiresAt) {
        await dbInstance
          .update(schema.userConsentsTable)
          .set({ expiresAt })
          .where(eq(schema.userConsentsTable.id, existing[0].id));
      }
      return;
    }

    // Insert new consent
    await dbInstance.insert(schema.userConsentsTable).values({
      userId,
      clientId,
      scope,
      expiresAt: expiresAt || null,
    });
  }

  /**
   * Build redirect URL with parameters
   */
  buildRedirectUrl(
    redirectUri: string,
    params: Record<string, string>,
  ): string {
    const url = new URL(redirectUri);

    Object.entries(params).forEach(([key, value]) => {
      if (value) {
        url.searchParams.set(key, value);
      }
    });

    return url.toString();
  }

  /**
   * Ensure user is a member of the client (auto-join with default role)
   * Called during OAuth token exchange to implement SSO-style membership
   */
  async ensureClientMembership(
    userId: string,
    clientId: string,
  ): Promise<void> {
    // Check if user already has any role in this client
    const existing = await this.db.query.userRolesTable.findFirst({
      where: (t, { and: _and, eq: _eq }) =>
        _and(_eq(t.userId, userId), _eq(t.clientId, clientId)),
    });

    if (existing) return; // Already a member

    // Add with default role if one exists
    await this.roles.assignDefaultIfAny(userId, clientId);
  }
}
