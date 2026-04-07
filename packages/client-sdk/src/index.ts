/**
 * @site-haus/client-sdk
 *
 * Unified SDK for integrating external applications with SiteHaus IAM.
 *
 * Subpath imports:
 * - @site-haus/client-sdk/nestjs - NestJS module with guards and decorators
 * - @site-haus/client-sdk/frontend - React hooks and SDK initialization
 */

// Re-export types that are useful in both contexts
export type { UserContext, IntrospectionResponse, SiteHausAuthConfig } from "./nestjs/types.js";
