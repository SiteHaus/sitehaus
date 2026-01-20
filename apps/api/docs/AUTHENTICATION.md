# Authentication System Documentation

This document outlines the complete authentication architecture for SiteHaus, including password-based login, OAuth2 flows, and cross-app SSO behavior.

---

## Table of Contents

1. [Overview](#overview)
2. [Key Concepts](#key-concepts)
3. [Password-Based Authentication](#password-based-authentication)
4. [OAuth2 PKCE Flow](#oauth2-pkce-flow)
5. [Token Management](#token-management)
6. [Session Management](#session-management)
7. [Guards & Authorization](#guards--authorization)
8. [Cross-App SSO](#cross-app-sso)
9. [Security Features](#security-features)

---

## Overview

SiteHaus uses a **multi-tenant authentication system** where:

- **IAM App** (`iam.sitehaus.dev`) - Central identity provider for login/register
- **Client Apps** (Dashboard, customer sites) - Authenticate via OAuth2 through IAM
- **API** (`api.sitehaus.dev`) - Handles all auth logic and token issuance

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Dashboard     │     │  Customer Site  │     │   Other Apps    │
│  (Client App)   │     │  (Client App)   │     │  (Client Apps)  │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │ OAuth2 PKCE
                                 ▼
                    ┌─────────────────────────┐
                    │         IAM App         │
                    │  (Identity Provider)    │
                    └────────────┬────────────┘
                                 │ API Calls
                                 ▼
                    ┌───────────────────────────┐
                    │           API             │
                    │  (Auth + Business Logic)  │
                    └───────────────────────────┘
```

---

## Key Concepts

### Clients

A **Client** represents an application that users can authenticate to. Examples:

- IAM Portal (internal)
- Dashboard App
- gracejeanphotography.com

Each client has:

- Unique ID and key
- Registered redirect URIs
- Allowed scopes
- Whether consent is required
- Default role for auto-joining members

### Users vs Members

- **User**: A person with an account in the system
- **Member**: A user who belongs to a specific client with assigned roles

Users can be members of multiple clients (SSO pattern - one account, many apps).

### Tokens

| Token         | Type           | Storage          | TTL        |
| ------------- | -------------- | ---------------- | ---------- |
| Access Token  | JWT            | Memory/Header    | ~15 min    |
| Refresh Token | Random 96-byte | HTTP-only cookie | ~7 days    |
| Auth Code     | Random 32-byte | Database         | 90 seconds |

---

## Password-Based Authentication

### Registration Flow

```
POST /auth/register
{
  "email": "user@example.com",
  "password": "...",
  "firstName": "John",
  "lastName": "Doe"
}
```

1. Validate input and check email uniqueness
2. Hash password with bcrypt
3. Create user record (isVerified: false)
4. Assign client's default role to user
5. Create session and issue tokens
6. Send verification email with OTP code
7. Return tokens + `requiresEmailVerification: true`

### Login Flow

```
POST /auth/login
{
  "email": "user@example.com",
  "password": "..."
}
```

1. Look up user by email
2. Verify account is active (not suspended)
3. Hash submitted password and compare
4. Create session with refresh token
5. Issue JWT access token
6. Set HTTP-only refresh cookie
7. Return tokens

### Email Verification

```
POST /auth/verify-email
{
  "email": "user@example.com",
  "code": "123456"
}
```

1. Find OTP by email and purpose
2. Validate code (max 5 attempts)
3. Mark user as verified
4. Mark OTP as consumed

---

## OAuth2 PKCE Flow

Used when external apps (Dashboard, customer sites) need to authenticate users through IAM.

### Flow Diagram

```
┌──────────────┐                    ┌──────────────┐                    ┌──────────────┐
│ Client App   │                    │   IAM App    │                    │     API      │
│ (Dashboard)  │                    │              │                    │              │
└──────┬───────┘                    └──────┬───────┘                    └──────┬───────┘
       │                                   │                                   │
       │ 1. User clicks "Login"            │                                   │
       │ ─────────────────────────────────>│                                   │
       │    /authorize?client_id=...       │                                   │
       │    &redirect_uri=...              │                                   │
       │    &code_challenge=...            │                                   │
       │    &state=...                     │                                   │
       │                                   │                                   │
       │                                   │ 2. Check if user logged in        │
       │                                   │ ─────────────────────────────────>│
       │                                   │    GET /auth/authorize            │
       │                                   │                                   │
       │                                   │<──────────────────────────────────│
       │                                   │ 3. Not logged in → show login     │
       │                                   │                                   │
       │                                   │ 4. User enters credentials        │
       │                                   │ ─────────────────────────────────>│
       │                                   │    POST /auth/login               │
       │                                   │                                   │
       │                                   │<──────────────────────────────────│
       │                                   │ 5. Tokens issued, cookie set      │
       │                                   │                                   │
       │                                   │ 6. Redirect back to /authorize    │
       │                                   │ ─────────────────────────────────>│
       │                                   │                                   │
       │                                   │<──────────────────────────────────│
       │                                   │ 7. Auth code generated            │
       │                                   │                                   │
       │<──────────────────────────────────│ 8. Redirect to callback           │
       │    /callback?code=...&state=...   │                                   │
       │                                   │                                   │
       │ 9. Exchange code for token        │                                   │
       │ ─────────────────────────────────────────────────────────────────────>│
       │    POST /auth/token               │                                   │
       │    { code, code_verifier }        │                                   │
       │                                   │                                   │
       │<─────────────────────────────────────────────────────────────────────│
       │ 10. Access token returned         │                                   │
       │                                   │                                   │
       │ 11. Make API calls with token     │                                   │
       │ ─────────────────────────────────────────────────────────────────────>│
       │    Authorization: Bearer <token>  │                                   │
       │                                   │                                   │
```

### Step 1: Client Initiates Authorization

Client app redirects user to IAM with OAuth parameters:

```
GET /auth/authorize?
  client_id=abc123
  &redirect_uri=https://dashboard.sitehaus.dev/callback
  &response_type=code
  &code_challenge=E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM
  &code_challenge_method=S256
  &scope=openid%20profile%20email
  &state=xyz789
```

**PKCE Parameters:**

- `code_verifier`: Random string (43-128 chars) generated by client
- `code_challenge`: `base64url(sha256(code_verifier))`

### Step 2-7: User Authentication

If user is not logged in:

1. Redirect to `/login` with OAuth params encoded
2. User logs in via password
3. Session created, refresh cookie set
4. Redirect back to `/auth/authorize`

If user is logged in:

1. Validate session from refresh cookie
2. Check if consent required
3. Generate authorization code

### Step 8: Callback with Auth Code

```
GET https://dashboard.sitehaus.dev/callback?
  code=SplxlOBeZQQYbYS6WxSbIA
  &state=xyz789
```

### Step 9-10: Token Exchange

```
POST /auth/token
{
  "grant_type": "authorization_code",
  "code": "SplxlOBeZQQYbYS6WxSbIA",
  "redirect_uri": "https://dashboard.sitehaus.dev/callback",
  "code_verifier": "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk",
  "client_id": "abc123"
}
```

**Response:**

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "Bearer",
  "expires_in": 900,
  "scope": "openid profile email"
}
```

### Consent Flow

If `client.requiresConsent` is true and user hasn't previously consented:

1. User redirected to `/consent` page
2. Shows requested scopes and client name
3. User approves or denies
4. `POST /auth/consent` records decision
5. If approved, auth code generated and user redirected

---

## Token Management

### Access Token (JWT)

**Payload:**

```json
{
  "sub": "user-uuid", // User ID
  "sid": "session-uuid", // Session ID
  "aud": "client-uuid", // Client ID (audience)
  "iat": 1699999999, // Issued at
  "exp": 1700000899 // Expires at
}
```

- Signed with HS256 using `JWT_SECRET`
- Short-lived (~15 minutes)
- Sent in `Authorization: Bearer <token>` header

### Refresh Token

- Random 96-byte string
- Only SHA256 hash stored in database
- Long-lived (~7 days)
- Stored in HTTP-only cookie (`sh_refresh`)
- Rotated on each refresh (old token invalidated)

### Token Refresh

```
POST /auth/refresh
Cookie: sh_refresh=<refresh_token>
```

1. Hash submitted refresh token
2. Find matching active session
3. Verify not revoked or expired
4. **Detect token reuse**: If hash found but session revoked, revoke ALL user sessions (security breach)
5. Revoke old session
6. Create new session with new refresh token
7. Issue new access token
8. Set new refresh cookie

---

## Session Management

### Session Record

```typescript
{
  id: string,              // Session UUID
  userId: string,          // User reference
  clientId: string,        // Client reference
  deviceId: string,        // Device fingerprint
  refreshHash: string,     // SHA256 of refresh token
  ipHash: string | null,   // SHA256 of IP address
  uaHash: string | null,   // SHA256 of User-Agent
  expiresAt: Date,         // When session expires
  revokedAt: Date | null,  // Null if active
  lastUsedAt: Date,        // Last request time
}
```

### Session Operations

| Operation  | Description                            |
| ---------- | -------------------------------------- |
| Create     | On login/register/OAuth token exchange |
| Touch      | Update `lastUsedAt` on each request    |
| Rotate     | On refresh - old revoked, new created  |
| Revoke     | On logout or password change           |
| Revoke All | On password reset or detected breach   |

### Device Tracking

Sessions are linked to devices based on IP + User-Agent hash combination. This enables:

- Multi-device login
- "Sign out all devices" functionality
- Suspicious activity detection

---

## Guards & Authorization

Guards run in order: **Access → Client → Verified → Permission**

### AccessGuard (Global)

Validates JWT access tokens on every request.

```typescript
@Public()  // Skip token requirement
```

1. Extract Bearer token from header
2. Verify JWT signature and expiration
3. Validate session is active
4. Verify token audience matches request client
5. Populate `req.user` with user context

### VerifiedGuard (Global)

Enforces email verification.

```typescript
@VerifiedOptional()  // Allow unverified users
```

1. Look up user from `req.user`
2. Check `user.isVerified` flag
3. Throw `ForbiddenException` if not verified

### PermissionGuard (Global)

Enforces role-based access control.

```typescript
@RequirePerms('invites:read', 'invites:manage')  // ALL required
@RequireAnyPerm('admin', 'moderator')            // ANY required
```

1. Get required permissions from decorators
2. Fetch user's permissions for this client
3. Throw `ForbiddenException` if insufficient

### ClientGuard (Global)

Identifies the client making the request.

1. Resolve client from header/query
2. Populate `req.client` with client info
3. Used for multi-tenant authorization

---

## Cross-App SSO

SiteHaus implements Google-style SSO where one account works across all apps.

### How It Works

1. **User registers on IAM** → Added to IAM client with default role
2. **User authenticates to Dashboard via OAuth** →
   - Tokens issued
   - **Auto-joined to Dashboard** with default role
3. **User authenticates to another app** → Same process, auto-joined

### Auto-Join Implementation

During OAuth token exchange (`POST /auth/token`):

```typescript
// After validating auth code
await this.oauthService.ensureClientMembership(userId, clientId);
```

This method:

1. Checks if user has any role in the client
2. If not, assigns the client's default role
3. User becomes a member without explicit invite

### When Auto-Join Doesn't Apply

- Client has no default role configured → User authenticates but has no permissions
- User already a member → No change
- Invite flow → Specific roles assigned via invite

### Invites vs Auto-Join

| Feature  | Auto-Join             | Invite                                  |
| -------- | --------------------- | --------------------------------------- |
| Trigger  | OAuth login           | Explicit invite sent                    |
| Role     | Client's default role | Specific roles selected                 |
| Use case | Public apps, SSO      | Controlled access, specific permissions |

---

## Security Features

| Feature                  | Implementation                           |
| ------------------------ | ---------------------------------------- |
| Password Hashing         | bcrypt                                   |
| Token Signing            | JWT with HS256                           |
| PKCE                     | SHA256 code challenge                    |
| Token Reuse Detection    | Revoke all sessions on detected reuse    |
| Timing Attack Prevention | `crypto.timingSafeEqual` for comparisons |
| Session Binding          | Token audience bound to client           |
| HttpOnly Cookies         | Refresh tokens protected from XSS        |
| Rate Limiting            | Throttle on auth endpoints               |
| IP/UA Tracking           | Fingerprinting for security monitoring   |
| OTP Attempt Limiting     | Max 5 attempts per code                  |
| Email Verification       | Required for protected actions           |

---

## Environment Configuration

```bash
# Token TTLs
ACCESS_TTL_SEC=900        # 15 minutes
REFRESH_TTL_SEC=604800    # 7 days

# JWT
JWT_SECRET=your-secret-key
JWT_ALG=HS256

# Cookie settings
COOKIE_SAME_SITE=lax      # 'lax' in dev, 'none' in prod
COOKIE_DOMAIN=.sitehaus.dev

# App URLs
IAM_APP_URL=https://iam.sitehaus.dev
```

---

## Client-Side State Management

The frontend apps use Zustand for auth state with smart persistence and caching.

### Storage Strategy

| Data | Storage | Reason |
|------|---------|--------|
| `accessToken` | sessionStorage | Cleared on tab close (security) |
| `accessExpiration` | sessionStorage | Paired with token |
| `user` | sessionStorage | Quick hydration |
| `session` | sessionStorage | Quick hydration |

**Why sessionStorage over localStorage:**
- Access tokens cleared when tab closes (reduces XSS risk window)
- Isolated per tab (more secure)
- Refresh token in HttpOnly cookie handles cross-session persistence

### Bootstrap Flow

On page load, the auth store runs `bootstrap()`:

```
┌─────────────────────────────────────────────────────────────┐
│                      Page Loads                              │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│              Zustand hydrates from sessionStorage            │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │ Has valid accessToken │
              │   AND user loaded?    │
              └───────────┬───────────┘
                          │
            ┌─────────────┴─────────────┐
            │ YES                       │ NO
            ▼                           ▼
┌───────────────────────┐   ┌───────────────────────┐
│  Skip all API calls   │   │ Has valid accessToken │
│  (fast page load)     │   │    but no user?       │
└───────────────────────┘   └───────────┬───────────┘
                                        │
                          ┌─────────────┴─────────────┐
                          │ YES                       │ NO
                          ▼                           ▼
              ┌───────────────────────┐   ┌───────────────────────┐
              │ Call /me & /clients   │   │ Try refreshOnce()     │
              │ (fetch permissions)   │   │ using refresh cookie  │
              └───────────────────────┘   └───────────┬───────────┘
                                                      │
                                        ┌─────────────┴─────────────┐
                                        │ SUCCESS                   │ FAIL
                                        ▼                           ▼
                            ┌───────────────────────┐   ┌───────────────────────┐
                            │ Call /me & /clients   │   │ Clear auth state      │
                            │ Store new token       │   │ User needs to login   │
                            └───────────────────────┘   └───────────────────────┘
```

### Performance Optimizations

| Scenario | API Calls | Notes |
|----------|-----------|-------|
| Same-tab navigation | 0 | User data cached in memory |
| New tab (logged in) | 2 | `/me` + `/clients` with existing token |
| New tab (token expired) | 3 | `/refresh` + `/me` + `/clients` |
| First visit / logged out | 1 | `/refresh` fails, redirect to login |

### Callback Page Exception

The `/callback` page handles OAuth token exchange and is **excluded from bootstrap** to prevent race conditions:

```typescript
// apps/iam/app/providers/providers.tsx
useEffect(() => {
  // Skip bootstrap on callback page - it handles its own token exchange
  if (hydrated && pathname !== "/callback") {
    void useAuthStore.getState().bootstrap();
  }
}, [hydrated, pathname]);
```

Without this, `bootstrap()` would race with the callback's token exchange, potentially causing "Invalid refresh" errors due to session revocation conflicts.

---

## API Endpoints Reference

### Public Endpoints

| Endpoint                           | Method | Description             |
| ---------------------------------- | ------ | ----------------------- |
| `/auth/register`                   | POST   | Create new account      |
| `/auth/login`                      | POST   | Password login          |
| `/auth/refresh`                    | POST   | Refresh access token    |
| `/auth/verify-email`               | POST   | Verify email with OTP   |
| `/auth/authorize`                  | GET    | OAuth authorization     |
| `/auth/token`                      | POST   | OAuth token exchange    |
| `/password/request-password-reset` | POST   | Request password reset  |
| `/password/reset`                  | POST   | Reset password with OTP |

### Protected Endpoints

| Endpoint           | Method | Description             |
| ------------------ | ------ | ----------------------- |
| `/auth/me`         | GET    | Get current user info   |
| `/auth/logout`     | POST   | Revoke current session  |
| `/auth/consent`    | POST   | Handle OAuth consent    |
| `/password/change` | POST   | Change password         |
| `/sessions`        | GET    | List user sessions      |
| `/sessions/:id`    | DELETE | Revoke specific session |
