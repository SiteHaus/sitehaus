# @sitehaus/client-sdk

NestJS SDK for integrating external applications with SiteHaus IAM. Handles backend authentication so your app does minimal work.

## Installation

```bash
pnpm add @sitehaus/client-sdk
```

## Architecture

The SDK uses **token introspection** - your backend calls the IAM API to validate tokens rather than verifying JWTs locally. This approach:

- Keeps all auth logic centralized in IAM
- Enables instant session revocation
- Requires zero database access from clients

```
┌─────────────────────────────────────────────────────────────┐
│  Your App (e.g., GraceJeanne)                               │
│                                                             │
│  Frontend ──────────────────────────────────────────────────┼──► SiteHaus IAM
│  (OAuth login, stores tokens)                               │    (issues tokens)
│                                                             │
│  Backend (NestJS + this SDK) ◄──────────────────────────────┼──► SiteHaus IAM
│  (validates tokens via introspection)                       │    (/auth/introspect)
└─────────────────────────────────────────────────────────────┘
```

## NestJS Backend Integration

### Setup

```typescript
// app.module.ts
import { Module } from "@nestjs/common";
import { SiteHausAuthModule } from "@sitehaus/client-sdk/nestjs";

@Module({
  imports: [
    SiteHausAuthModule.forRoot({
      iamUrl: process.env.IAM_URL, // e.g., 'https://api.sitehaus.dev'
      clientKey: process.env.IAM_CLIENT_KEY,
      cacheTtlMs: 5000, // Optional: introspection cache TTL
    }),
  ],
})
export class AppModule {}
```

### Async Configuration

```typescript
import { ConfigModule, ConfigService } from "@nestjs/config";

@Module({
  imports: [
    SiteHausAuthModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        iamUrl: config.get("IAM_URL"),
        clientKey: config.get("IAM_CLIENT_KEY"),
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
} from "@sitehaus/client-sdk/nestjs";

@Controller("orders")
export class OrdersController {
  // Public route - no authentication required
  @Public()
  @Get("catalog")
  getCatalog() {
    return this.catalogService.getAll();
  }

  // Protected route - requires valid token
  @Get()
  getMyOrders(@CurrentUser() user: UserContext) {
    return this.ordersService.findByUser(user.userId);
  }

  // Protected with ALL permissions required
  @RequirePerms("orders:read", "orders:manage")
  @Get("admin")
  getAllOrders() {
    return this.ordersService.findAll();
  }

  // Protected with ANY permission required
  @RequirePermsAny("admin", "orders:manage")
  @Delete(":id")
  deleteOrder(@Param("id") id: string) {
    return this.ordersService.delete(id);
  }

  // Access specific user property
  @Post()
  createOrder(@CurrentUser("userId") userId: string, @Body() dto: CreateOrderDto) {
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

### API Reference

| Export                 | Description                                       |
| ---------------------- | ------------------------------------------------- |
| `SiteHausAuthModule`   | Main module with `forRoot()` and `forRootAsync()` |
| `AccessGuard`          | Validates tokens via introspection                |
| `PermissionGuard`      | Checks user permissions                           |
| `@Public()`            | Mark route as public                              |
| `@CurrentUser()`       | Extract user from request                         |
| `@RequirePerms()`      | Require ALL permissions                           |
| `@RequirePermsAny()`   | Require ANY permission                            |
| `IntrospectionService` | Direct access to introspection API                |

---

## Frontend Integration (Manual)

The SDK doesn't include frontend utilities - implement OAuth 2.0 with PKCE directly in your app.

### 1. Login - Redirect to SiteHaus

```typescript
// lib/auth.ts

// Generate PKCE challenge
async function generatePKCE() {
  const verifier = crypto.randomUUID() + crypto.randomUUID();
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hash = await crypto.subtle.digest("SHA-256", data);
  const challenge = btoa(String.fromCharCode(...new Uint8Array(hash)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  return { verifier, challenge };
}

// Login handler
async function login() {
  const { verifier, challenge } = await generatePKCE();
  const state = crypto.randomUUID();

  // Store for callback
  sessionStorage.setItem("pkce_verifier", verifier);
  sessionStorage.setItem("oauth_state", state);

  const params = new URLSearchParams({
    client_id: process.env.NEXT_PUBLIC_IAM_CLIENT_ID,
    redirect_uri: `${window.location.origin}/auth/callback`,
    response_type: "code",
    code_challenge: challenge,
    code_challenge_method: "S256",
    state,
    scope: "openid profile email",
  });

  window.location.href = `${process.env.NEXT_PUBLIC_IAM_URL}/auth/authorize?${params}`;
}
```

### 2. Callback - Exchange Code for Tokens

```typescript
// app/auth/callback/page.tsx (Next.js example)

async function handleCallback(searchParams: URLSearchParams) {
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const savedState = sessionStorage.getItem("oauth_state");
  const verifier = sessionStorage.getItem("pkce_verifier");

  // Validate state
  if (state !== savedState) {
    throw new Error("Invalid state parameter");
  }

  // Exchange code for tokens
  const response = await fetch(`${process.env.NEXT_PUBLIC_IAM_URL}/auth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: `${window.location.origin}/auth/callback`,
      code_verifier: verifier,
      client_id: process.env.NEXT_PUBLIC_IAM_CLIENT_ID,
    }),
  });

  const tokens = await response.json();

  // Store tokens (use httpOnly cookies for production!)
  localStorage.setItem("access_token", tokens.access_token);
  localStorage.setItem("token_expires", Date.now() + tokens.expires_in * 1000);

  // Cleanup
  sessionStorage.removeItem("pkce_verifier");
  sessionStorage.removeItem("oauth_state");

  // Redirect to app
  window.location.href = "/dashboard";
}
```

### 3. Making Authenticated API Calls

```typescript
// lib/api.ts

async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const token = localStorage.getItem("access_token");

  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`,
    },
  });

  if (response.status === 401) {
    // Token expired - redirect to login
    localStorage.removeItem("access_token");
    window.location.href = "/login";
  }

  return response;
}

// Usage
const orders = await fetchWithAuth("https://your-api.com/orders").then((r) => r.json());
```

### 4. Get Current User

```typescript
// Fetch user info from your backend (which uses introspection)
async function getCurrentUser() {
  const response = await fetchWithAuth("https://your-api.com/me");
  if (!response.ok) return null;
  return response.json();
}
```

### 5. Logout

```typescript
async function logout() {
  const token = localStorage.getItem("access_token");

  // Optionally notify IAM to revoke session
  await fetch(`${process.env.NEXT_PUBLIC_IAM_URL}/auth/logout`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    credentials: "include",
  });

  localStorage.removeItem("access_token");
  localStorage.removeItem("token_expires");
  window.location.href = "/";
}
```

---

## Client Registration

Before integrating, register your application as a client in SiteHaus:

1. Create a client record in the `clients` table:
   - `key`: Unique identifier (e.g., 'gracejeanne')
   - `name`: Display name (e.g., 'GraceJeanne')
   - `redirectUris`: Allowed callback URLs (e.g., `['https://gracejeanne.com/auth/callback']`)
   - `allowedScopes`: `['openid', 'profile', 'email']`
   - `firstParty`: `false`
   - `requiresConsent`: `true`

2. Use the client's `id` (UUID) as `client_id` in OAuth flows
3. Use the client's `key` as `clientKey` in backend SDK configuration

---

## Environment Variables

### Backend

```env
IAM_URL=https://api.sitehaus.dev
IAM_CLIENT_KEY=your-client-key
```

### Frontend

```env
NEXT_PUBLIC_IAM_URL=https://api.sitehaus.dev
NEXT_PUBLIC_IAM_CLIENT_ID=your-client-uuid
```

---

## Security Notes

- **Never expose your client secret** - PKCE flow doesn't need one for public clients
- **Use httpOnly cookies** in production instead of localStorage for token storage
- **Validate the state parameter** to prevent CSRF attacks
- **Token introspection** ensures revoked sessions are rejected immediately
