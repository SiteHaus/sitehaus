/**
 * Configuration for the SiteHaus Auth Module
 */
export interface SiteHausAuthConfig {
  /** IAM API base URL (e.g., 'https://api.sitehaus.io') */
  iamUrl: string;

  /** Client key for x-client-key header */
  clientKey: string;

  /** Optional introspection cache TTL in milliseconds (default: 5000ms) */
  cacheTtlMs?: number;
}

/**
 * User context populated on requests after token validation
 */
export interface UserContext {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  isVerified: boolean;
  status: string;
  sessionId: string;
  clientId: string;
  permissions: string[];
  accessibleClientIds: string[];
}

/**
 * Introspection response from IAM API
 */
export interface IntrospectionResponse {
  active: boolean;
  user?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    isVerified: boolean;
    status: string;
  };
  session?: {
    id: string;
    clientId: string;
  };
  permissions?: string[];
  accessibleClientIds?: string[];
  exp?: number;
}

/**
 * Request with user context populated by AccessGuard
 */
export interface AuthedRequest {
  user?: UserContext;
}
