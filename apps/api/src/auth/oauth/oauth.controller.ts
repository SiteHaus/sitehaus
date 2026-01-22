import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import {
  type Request as ExpressRequest,
  type Response as ExpressResponse,
} from 'express';
import { ClientsService } from 'src/clients/clients.service';
import { Public } from 'src/public.decorator';
import { SessionService } from 'src/session/session.service';
import { UsersService } from 'src/users/users.service';
import { type AuthedRequest } from '../access/access.guard';
import { AuthService } from '../auth.service';
import { VerifiedOptional } from '../verified/verified.guard';
import { AuthCodeService } from '../auth-code/auth-code.service';
import { OAuthService } from './oauth.service';
import { setRefreshCookie } from '../cookie/cookies';
import { TotpService } from '../totp/totp.service';

interface AuthorizeQuery {
  client_id?: string;
  client_key?: string;
  redirect_uri: string;
  response_type: string;
  code_challenge: string;
  code_challenge_method: string;
  state?: string;
  scope?: string;
}

interface TokenBody {
  grant_type: string;
  code: string;
  redirect_uri: string;
  code_verifier: string;
  client_id?: string;
  client_key?: string;
}

interface ConsentBody {
  client_id: string;
  redirect_uri: string;
  scope: string;
  state?: string;
  code_challenge: string;
  code_challenge_method: string;
  approved: boolean;
}

@Controller('auth')
export class OAuthController {
  constructor(
    private readonly authCodeService: AuthCodeService,
    private readonly oauthService: OAuthService,
    private readonly authService: AuthService,
    private readonly clientsService: ClientsService,
    private readonly usersService: UsersService,
    private readonly sessionService: SessionService,
    private readonly totpService: TotpService,
  ) {}

  /**
   * OAuth2 Authorization endpoint
   * Validates request and redirects to consent or back to client with code
   */
  @Public()
  @Get('authorize')
  async authorize(
    @Query() query: AuthorizeQuery,
    @Req() req: AuthedRequest,
    @Res() res: ExpressResponse,
  ) {
    // Resolve client by key or id
    let clientId: string;
    let clientName: string | undefined;
    try {
      if (query.client_key) {
        const client = await this.clientsService.resolveByKey(query.client_key);
        clientId = client.id;
        clientName = client.name;
      } else if (query.client_id) {
        clientId = query.client_id;
        // If only client_id is provided, we'll need to fetch the name later if needed
      } else {
        throw new BadRequestException('Either client_id or client_key is required');
      }
    } catch (error) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        error: 'invalid_client',
        error_description: error instanceof Error ? error.message : 'Invalid client',
      });
    }

    // Validate the authorization request
    const validation = await this.oauthService.validateAuthorizationRequest({
      clientId,
      redirectUri: query.redirect_uri,
      responseType: query.response_type,
      codeChallenge: query.code_challenge,
      codeChallengeMethod: query.code_challenge_method,
      scope: query.scope,
      state: query.state,
    });

    if (!validation.valid) {
      // If validation failed, try to redirect with error if redirect_uri is valid
      // Otherwise return 400
      try {
        const errorUrl = this.oauthService.buildRedirectUrl(query.redirect_uri, {
          error: validation.error!,
          error_description: validation.errorDescription || '',
          state: query.state || '',
        });
        return res.redirect(errorUrl);
      } catch {
        return res.status(HttpStatus.BAD_REQUEST).json({
          error: validation.error,
          error_description: validation.errorDescription,
        });
      }
    }

    // Check if user is authenticated
    // For browser-based OAuth, check for refresh token cookie in addition to req.user
    const hasRefreshCookie = req.cookies && req.cookies['sh_refresh'];

    if (!req.user && !hasRefreshCookie) {
      // User not logged in - redirect to login with oauth params
      const oauthParams = Buffer.from(JSON.stringify(query)).toString(
        'base64url',
      );
      const iamUrl = process.env.IAM_APP_URL || 'http://localhost:3002';
      const loginUrl = new URL(`${iamUrl}/login`);
      loginUrl.searchParams.set('oauth_params', oauthParams);
      if (clientName) {
        loginUrl.searchParams.set('client', clientName);
      }
      return res.redirect(loginUrl.toString());
    }

    // If we have refresh cookie but no req.user, verify the refresh token
    let userId: string;
    if (req.user) {
      userId = req.user.userId;
    } else {
      // Verify refresh token against the database
      const refreshToken = req.cookies['sh_refresh'];

      try {
        const session = await this.sessionService.validateRefreshToken(refreshToken);

        if (!session) {
          // Invalid or expired refresh token, redirect to login
          const oauthParams = Buffer.from(JSON.stringify(query)).toString(
            'base64url',
          );
          const iamUrl = process.env.IAM_APP_URL || 'http://localhost:3002';
          const loginUrl = new URL(`${iamUrl}/login`);
          loginUrl.searchParams.set('oauth_params', oauthParams);
          if (clientName) {
            loginUrl.searchParams.set('client', clientName);
          }
          return res.redirect(loginUrl.toString());
        }

        userId = session.userId;
      } catch (err) {
        console.error('[OAuth] Error validating refresh token:', err);
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          error: 'server_error',
          error_description: 'Failed to validate session',
        });
      }
    }

    // User is authenticated - check if consent is required
    const client = await this.clientsService.resolveById(clientId);
    const scope = query.scope || 'openid profile email';

    if (client.requiresConsent) {
      // Check if user has already granted consent
      const hasConsent = await this.oauthService.checkConsent(
        userId,
        clientId,
        scope,
      );

      if (!hasConsent) {
        // Redirect to consent page with client_id (not client_key)
        const consentParams = new URLSearchParams({
          ...query,
          client_id: clientId,
          client: client.name, // Include client name for display
        } as Record<string, string>);
        consentParams.delete('client_key'); // Remove client_key if present
        const iamUrl = process.env.IAM_APP_URL || 'http://localhost:3002';
        const consentUrl = `${iamUrl}/consent?${consentParams.toString()}`;
        return res.redirect(consentUrl);
      }
    }

    // No consent required or already granted - generate auth code
    const { code } = await this.authCodeService.create({
      userId: userId,
      clientId,
      redirectUri: query.redirect_uri,
      codeChallenge: query.code_challenge,
      scope,
    });

    // Redirect back to client with code
    const redirectUrl = this.oauthService.buildRedirectUrl(query.redirect_uri, {
      code,
      state: query.state || '',
    });

    return res.redirect(redirectUrl);
  }

  /**
   * OAuth2 Token endpoint
   * Exchanges authorization code for tokens using PKCE
   */
  @Public()
  @Post('token')
  @HttpCode(HttpStatus.OK)
  async token(
    @Body() body: TokenBody,
    @Req() req: ExpressRequest,
    @Res() res: ExpressResponse,
  ) {
    // Validate grant_type
    if (body.grant_type !== 'authorization_code') {
      return res.status(HttpStatus.BAD_REQUEST).json({
        error: 'unsupported_grant_type',
        error_description: 'Only authorization_code grant type is supported',
      });
    }

    // Resolve client by key or id
    let clientId: string;
    try {
      if (body.client_key) {
        const client = await this.clientsService.resolveByKey(body.client_key);
        clientId = client.id;
      } else if (body.client_id) {
        clientId = body.client_id;
      } else {
        throw new BadRequestException('Either client_id or client_key is required');
      }
    } catch (error) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        error: 'invalid_client',
        error_description: error instanceof Error ? error.message : 'Invalid client',
      });
    }

    try {
      // Consume the authorization code (validates PKCE and creates session)
      const { sessionId, userId, scope, refreshToken, refreshExpiresAt } = await this.authCodeService.consume({
        code: body.code,
        codeVerifier: body.code_verifier,
        clientId,
        ip: req.ip,
        ua: req.headers['user-agent'],
      });

      // Set refresh token cookie for cross-origin session persistence
      setRefreshCookie(res, refreshToken, refreshExpiresAt);

      // Ensure user is a member of this client (auto-join with default role)
      await this.oauthService.ensureClientMembership(userId, clientId);

      // Check if 2FA is enabled for this user
      const has2fa = await this.totpService.isEnabled(userId);

      // Issue tokens using the created session
      const tokens = await this.authService.issueTokens(
        userId,
        {
          clientId,
          sessionId, // Reuse the session created by consume
          ip: req.ip,
          ua: req.headers['user-agent'],
        },
        { mfaPending: has2fa },
      );

      // Return OAuth2 token response
      return res.json({
        access_token: tokens.accessToken,
        token_type: 'Bearer',
        expires_in: tokens.accessTokenExpiresIn,
        scope: scope || 'openid profile email',
        requires_2fa: has2fa,
        // Optional: refresh_token if implementing refresh grant
        // Optional: id_token if implementing OIDC
      });
    } catch (error) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        error: 'invalid_grant',
        error_description:
          error instanceof Error ? error.message : 'Invalid authorization code',
      });
    }
  }

  /**
   * OAuth2 Consent endpoint
   * Handles user consent approval/denial
   */
  @VerifiedOptional()
  @Post('consent')
  @HttpCode(HttpStatus.OK)
  async consent(@Body() body: ConsentBody, @Req() req: AuthedRequest) {
    if (!req.user) {
      throw new UnauthorizedException('User not authenticated');
    }

    const scope = body.scope || 'openid profile email';

    if (body.approved) {
      // User approved - grant consent
      await this.oauthService.grantConsent(
        req.user.userId,
        body.client_id,
        scope,
      );

      // Generate authorization code
      const { code } = await this.authCodeService.create({
        userId: req.user.userId,
        clientId: body.client_id,
        redirectUri: body.redirect_uri,
        codeChallenge: body.code_challenge,
        scope,
      });

      // Build redirect URL with code
      const redirectUrl = this.oauthService.buildRedirectUrl(body.redirect_uri, {
        code,
        state: body.state || '',
      });

      return { redirect_url: redirectUrl };
    } else {
      // User denied - redirect with error
      const redirectUrl = this.oauthService.buildRedirectUrl(body.redirect_uri, {
        error: 'access_denied',
        error_description: 'User denied consent',
        state: body.state || '',
      });

      return { redirect_url: redirectUrl };
    }
  }
}
