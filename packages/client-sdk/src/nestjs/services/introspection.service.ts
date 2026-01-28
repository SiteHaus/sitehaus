import { Inject, Injectable, Logger } from "@nestjs/common";
import type { IntrospectionResponse, SiteHausAuthConfig } from "../types.js";

export const SITEHAUS_AUTH_CONFIG = "SITEHAUS_AUTH_CONFIG";

interface CacheEntry {
  response: IntrospectionResponse;
  expiresAt: number;
}

@Injectable()
export class IntrospectionService {
  private readonly logger = new Logger(IntrospectionService.name);
  private readonly cache = new Map<string, CacheEntry>();
  private readonly cacheTtlMs: number;

  constructor(
    @Inject(SITEHAUS_AUTH_CONFIG) private readonly config: SiteHausAuthConfig
  ) {
    this.cacheTtlMs = config.cacheTtlMs ?? 5000;
  }

  /**
   * Introspect an access token by calling the IAM API.
   * Results are cached briefly to reduce latency.
   */
  async introspect(token: string): Promise<IntrospectionResponse> {
    // Check cache first
    const cached = this.cache.get(token);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.response;
    }

    try {
      const response = await fetch(`${this.config.iamUrl}/auth/introspect`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "x-client-key": this.config.clientKey,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        this.logger.warn(
          `Introspection failed with status ${response.status}`
        );
        return { active: false };
      }

      const result = (await response.json()) as IntrospectionResponse;

      // Cache the result
      this.cache.set(token, {
        response: result,
        expiresAt: Date.now() + this.cacheTtlMs,
      });

      // Cleanup old cache entries periodically
      this.cleanupCache();

      return result;
    } catch (error) {
      this.logger.error("Introspection request failed", error);
      return { active: false };
    }
  }

  /**
   * Remove expired entries from the cache
   */
  private cleanupCache(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt <= now) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear a specific token from the cache (useful for logout)
   */
  invalidate(token: string): void {
    this.cache.delete(token);
  }

  /**
   * Clear the entire cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}
