# @site-haus/client-sdk

Unified SDK for integrating external applications with SiteHaus IAM. Handles authentication so your app does minimal work.

## Installation

```bash
pnpm add @site-haus/client-sdk
```

## Architecture

The SDK uses **token introspection** - your backend calls the IAM API to validate tokens rather than verifying JWTs locally. This approach:

- Keeps all auth logic centralized in IAM
- Enables instant session revocation
- Requires zero database access from clients

## NestJS Backend Integration

### Setup

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { SiteHausAuthModule } from '@site-haus/client-sdk/nestjs';

@Module({
  imports: [
    SiteHausAuthModule.forRoot({
      iamUrl: process.env.IAM_URL,        // e.g., 'https://api.sitehaus.io'
      clientKey: process.env.IAM_CLIENT_KEY,
      cacheTtlMs: 5000,                    // Optional: introspection cache TTL
    }),
  ],
})
export class AppModule {}
```

### Async Configuration

```typescript
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    SiteHausAuthModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        iamUrl: config.get('IAM_URL'),
        clientKey: config.get('IAM_CLIENT_KEY'),
      }),
      inject: [ConfigService],
    }),
  ],
})
export class AppModule {}
```

### Using Guards and Decorators

```typescript
import {
  Public,
  CurrentUser,
  RequirePerms,
  RequirePermsAny,
  UserContext,
} from '@site-haus/client-sdk/nestjs';

@Controller('orders')
export class OrdersController {
  // Public route - no authentication required
  @Public()
  @Get('catalog')
  getCatalog() {
    return this.catalogService.getAll();
  }

  // Protected route - requires valid token
  @Get()
  getMyOrders(@CurrentUser() user: UserContext) {
    return this.ordersService.findByUser(user.userId);
  }

  // Protected with ALL permissions required
  @RequirePerms('orders:read', 'orders:manage')
  @Get('admin')
  getAllOrders() {
    return this.ordersService.findAll();
  }

  // Protected with ANY permission required
  @RequirePermsAny('admin', 'orders:manage')
  @Delete(':id')
  deleteOrder(@Param('id') id: string) {
    return this.ordersService.delete(id);
  }

  // Access specific user property
  @Post()
  createOrder(
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateOrderDto,
  ) {
    return this.ordersService.create(userId, dto);
  }
}
```

### UserContext Type

The `@CurrentUser()` decorator provides a `UserContext` object:

```typescript
interface UserContext {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  isVerified: boolean;
  status: string;
  sessionId: string;
  clientId: string;
  permissions: string[];
}
```

## Frontend Integration

### Setup

```typescript
// lib/auth.ts
import { initStoresSdk, useAuthStore } from '@site-haus/client-sdk/frontend';

// Initialize once at app startup
initStoresSdk({
  baseURL: process.env.NEXT_PUBLIC_IAM_URL,
  clientKey: process.env.NEXT_PUBLIC_IAM_CLIENT_KEY,
});
```

### OAuth Login Flow

```typescript
import {
  buildAuthorizationUrl,
  generatePKCE,
  generateState,
  exchangeCodeForTokens,
} from '@site-haus/client-sdk/frontend';

// Login button handler
const handleLogin = async () => {
  const { codeVerifier, codeChallenge } = await generatePKCE();
  const state = generateState();

  // Store for callback
  sessionStorage.setItem('pkce_verifier', codeVerifier);
  sessionStorage.setItem('oauth_state', state);

  const url = buildAuthorizationUrl({
    clientId: process.env.NEXT_PUBLIC_IAM_CLIENT_ID,
    redirectUri: `${window.location.origin}/callback`,
    codeChallenge,
    state,
    scope: 'openid profile email',
  });

  window.location.href = url;
};

// Callback page handler
const handleCallback = async (code: string, state: string) => {
  const savedState = sessionStorage.getItem('oauth_state');
  if (state !== savedState) throw new Error('State mismatch');

  const codeVerifier = sessionStorage.getItem('pkce_verifier');
  const tokens = await exchangeCodeForTokens({
    code,
    codeVerifier,
    redirectUri: `${window.location.origin}/callback`,
    clientId: process.env.NEXT_PUBLIC_IAM_CLIENT_ID,
  });

  // Store tokens and redirect
  useAuthStore.getState().setAccess({
    accessToken: tokens.access_token,
    accessExpiration: Math.floor(Date.now() / 1000) + tokens.expires_in,
  });
};
```

### Using Auth State

```typescript
import { useAuthStore } from '@site-haus/client-sdk/frontend';

function UserProfile() {
  const { user, permissions, hasPerm, logout } = useAuthStore();

  if (!user) return <LoginButton />;

  return (
    <div>
      <p>Welcome, {user.firstName}!</p>
      {hasPerm('admin') && <AdminPanel />}
      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

### Making API Calls

```typescript
import { getApi } from '@site-haus/client-sdk/frontend';

async function fetchUserData() {
  const api = getApi();
  const result = await api.auth.private.me();

  if (result.status === 200) {
    return result.body.user;
  }
}
```

## Client Registration

Before using the SDK, register your application as a client in SiteHaus:

1. Create a client record in the `clients` table:
   - `key`: Unique identifier (e.g., 'my-app')
   - `name`: Display name
   - `redirectUris`: Allowed callback URLs
   - `allowedScopes`: ['openid', 'profile', 'email']
   - `firstParty`: false (for external apps)
   - `requiresConsent`: true

2. Use the client's `id` (UUID) as `clientId` in frontend OAuth flows
3. Use the client's `key` as `clientKey` in backend configuration

## API Reference

### NestJS Exports (`@site-haus/client-sdk/nestjs`)

| Export | Description |
|--------|-------------|
| `SiteHausAuthModule` | Main module with `forRoot()` and `forRootAsync()` |
| `AccessGuard` | Validates tokens via introspection |
| `PermissionGuard` | Checks user permissions |
| `@Public()` | Mark route as public |
| `@CurrentUser()` | Extract user from request |
| `@RequirePerms()` | Require ALL permissions |
| `@RequirePermsAny()` | Require ANY permission |
| `IntrospectionService` | Direct access to introspection API |

### Frontend Exports (`@site-haus/client-sdk/frontend`)

| Export | Description |
|--------|-------------|
| `initStoresSdk()` | Initialize SDK with config |
| `getApi()` | Get typed API client |
| `useAuthStore` | Zustand auth state hook |
| `buildAuthorizationUrl()` | Build OAuth authorize URL |
| `generatePKCE()` | Generate PKCE challenge/verifier |
| `generateState()` | Generate OAuth state parameter |
| `exchangeCodeForTokens()` | Exchange auth code for tokens |

## Environment Variables

### Backend
```env
IAM_URL=https://api.sitehaus.io
IAM_CLIENT_KEY=your-client-key
```

### Frontend
```env
NEXT_PUBLIC_IAM_URL=https://api.sitehaus.io
NEXT_PUBLIC_IAM_CLIENT_ID=your-client-uuid
NEXT_PUBLIC_IAM_CLIENT_KEY=your-client-key
```
