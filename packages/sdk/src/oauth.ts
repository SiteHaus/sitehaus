/**
 * OAuth2 Authorization Code Flow with PKCE helpers
 */

/**
 * Generate a PKCE (Proof Key for Code Exchange) code verifier and challenge
 * @returns Object containing codeVerifier and codeChallenge
 */
export async function generatePKCE(): Promise<{
  codeVerifier: string;
  codeChallenge: string;
}> {
  // Generate 32-byte random verifier
  const randomBytes = new Uint8Array(32);
  crypto.getRandomValues(randomBytes);
  const codeVerifier = base64UrlEncode(randomBytes);

  // Create SHA256 challenge
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const codeChallenge = base64UrlEncode(new Uint8Array(hashBuffer));

  return { codeVerifier, codeChallenge };
}

/**
 * Base64URL encode a Uint8Array
 */
function base64UrlEncode(buffer: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...buffer));
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

/**
 * Build OAuth2 authorization URL
 */
export function buildAuthorizationUrl(params: {
  authUrl: string; // e.g., https://iam.sitehaus.dev/authorize
  clientId?: string;
  clientKey?: string;
  redirectUri: string;
  codeChallenge: string;
  scope?: string;
  state?: string;
}): string {
  if (!params.clientId && !params.clientKey) {
    throw new Error("Either clientId or clientKey is required");
  }

  const url = new URL(params.authUrl);

  if (params.clientKey) {
    url.searchParams.set("client_key", params.clientKey);
  } else if (params.clientId) {
    url.searchParams.set("client_id", params.clientId);
  }

  url.searchParams.set("redirect_uri", params.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("code_challenge", params.codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");

  if (params.scope) {
    url.searchParams.set("scope", params.scope);
  }

  if (params.state) {
    url.searchParams.set("state", params.state);
  }

  return url.toString();
}

/**
 * OAuth2 token response
 */
export interface TokenResponse {
  access_token: string;
  token_type: "Bearer";
  expires_in: number;
  scope: string;
  requires_2fa?: boolean;
  refresh_token?: string;
  id_token?: string;
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(params: {
  tokenUrl: string; // e.g., https://api.sitehaus.dev/auth/token
  code: string;
  codeVerifier: string;
  clientId?: string;
  clientKey?: string;
  redirectUri: string;
}): Promise<TokenResponse> {
  if (!params.clientId && !params.clientKey) {
    throw new Error("Either clientId or clientKey is required");
  }

  const bodyParams: Record<string, string> = {
    grant_type: "authorization_code",
    code: params.code,
    code_verifier: params.codeVerifier,
    redirect_uri: params.redirectUri,
  };

  if (params.clientKey) {
    bodyParams.client_key = params.clientKey;
  } else if (params.clientId) {
    bodyParams.client_id = params.clientId;
  }

  const body = new URLSearchParams(bodyParams);

  const response = await fetch(params.tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    credentials: "include",
    body: body.toString(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(
      error.error_description || error.error || "Token exchange failed"
    );
  }

  return response.json();
}

/**
 * Generate a random state parameter for CSRF protection
 */
export function generateState(): string {
  const randomBytes = new Uint8Array(32);
  crypto.getRandomValues(randomBytes);
  return base64UrlEncode(randomBytes);
}
