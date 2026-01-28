import { DynamicModule, Global, Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { AccessGuard } from "./guards/access.guard.js";
import { PermissionGuard } from "./guards/permission.guard.js";
import {
  IntrospectionService,
  SITEHAUS_AUTH_CONFIG,
} from "./services/introspection.service.js";
import type { SiteHausAuthConfig } from "./types.js";

/**
 * SiteHaus Authentication Module for NestJS.
 *
 * Provides token validation via IAM introspection, with guards that
 * automatically protect routes and populate user context.
 *
 * @example
 * ```typescript
 * import { SiteHausAuthModule } from '@site-haus/client-sdk/nestjs';
 *
 * @Module({
 *   imports: [
 *     SiteHausAuthModule.forRoot({
 *       iamUrl: process.env.IAM_URL,
 *       clientKey: process.env.IAM_CLIENT_KEY,
 *     }),
 *   ],
 * })
 * export class AppModule {}
 * ```
 */
@Global()
@Module({})
export class SiteHausAuthModule {
  /**
   * Configure the module with IAM connection settings.
   *
   * @param config - IAM URL and client key configuration
   */
  static forRoot(config: SiteHausAuthConfig): DynamicModule {
    return {
      module: SiteHausAuthModule,
      providers: [
        {
          provide: SITEHAUS_AUTH_CONFIG,
          useValue: config,
        },
        IntrospectionService,
        {
          provide: APP_GUARD,
          useClass: AccessGuard,
        },
        {
          provide: APP_GUARD,
          useClass: PermissionGuard,
        },
      ],
      exports: [IntrospectionService, SITEHAUS_AUTH_CONFIG],
    };
  }

  /**
   * Configure the module asynchronously (e.g., using ConfigService).
   *
   * @example
   * ```typescript
   * SiteHausAuthModule.forRootAsync({
   *   imports: [ConfigModule],
   *   useFactory: (config: ConfigService) => ({
   *     iamUrl: config.get('IAM_URL'),
   *     clientKey: config.get('IAM_CLIENT_KEY'),
   *   }),
   *   inject: [ConfigService],
   * })
   * ```
   */
  static forRootAsync(options: {
    imports?: any[];
    useFactory: (
      ...args: any[]
    ) => SiteHausAuthConfig | Promise<SiteHausAuthConfig>;
    inject?: any[];
  }): DynamicModule {
    return {
      module: SiteHausAuthModule,
      imports: options.imports ?? [],
      providers: [
        {
          provide: SITEHAUS_AUTH_CONFIG,
          useFactory: options.useFactory,
          inject: options.inject ?? [],
        },
        IntrospectionService,
        {
          provide: APP_GUARD,
          useClass: AccessGuard,
        },
        {
          provide: APP_GUARD,
          useClass: PermissionGuard,
        },
      ],
      exports: [IntrospectionService, SITEHAUS_AUTH_CONFIG],
    };
  }
}
