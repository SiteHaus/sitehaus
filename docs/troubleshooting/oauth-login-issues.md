# OAuth Login Troubleshooting Guide

This document describes the OAuth login flow, known issues, and debugging steps.

## Architecture Overview

### OAuth Flow (IAM App)

```
1. User visits protected page (e.g., /my-sessions)
2. RequireAuth component checks for accessToken
3. If no token, starts OAuth flow:
   - Generates PKCE code verifier/challenge
   - Stores verifier in sessionStorage
   - Stores current URL as oauth_next
   - Navigates to api.sitehaus.dev/auth/authorize

4. /auth/authorize endpoint:
   - Checks for req.user (from Authorization header) OR refresh cookie
   - If neither, redirects to /login with oauth_params
   - If authenticated, creates auth code and redirects to callback

5. Login page:
   - User enters credentials
   - POST to /auth/login
   - Sets refresh cookie (sh_refresh)
   - Navigates back to /auth/authorize with stored oauth_params

6. /auth/authorize (now with cookie):
   - Validates refresh cookie via sessionService.validateRefreshToken()
   - Creates auth code with userId
   - Redirects to /callback with code

7. Callback page (EXCLUDED from bootstrap):
   - Exchanges code for tokens via POST /auth/token
   - Sets new refresh cookie
   - Stores accessToken in Zustand (and sessionStorage)
   - Calls me() to hydrate user data
   - Redirects to oauth_next (original page)

8. Protected page loads:
   - Zustand rehydrates from sessionStorage (includes accessToken now!)
   - bootstrap() runs:
     - If valid token AND user loaded → skip API calls (fast!)
     - If valid token but no user → call /me and /clients
     - If no token → try refreshOnce() with cookie
   - User is authenticated
```

### Key Files

| Component         | File Path                                          |
| ----------------- | -------------------------------------------------- |
| OAuth Controller  | `apps/api/src/auth/oauth/oauth.controller.ts`      |
| Auth Controller   | `apps/api/src/auth/auth.controller.ts`             |
| Cookie Config     | `apps/api/src/auth/cookie/cookies.ts`              |
| Session Service   | `apps/api/src/session/session.service.ts`          |
| Auth Code Service | `apps/api/src/auth/auth-code/auth-code.service.ts` |
| RequireAuth       | `apps/iam/lib/require-auth.tsx`                    |
| Callback Page     | `apps/iam/app/callback/page.tsx`                   |
| Login Container   | `apps/iam/app/(auth)/login/login-container.tsx`    |
| Auth Store        | `packages/stores/src/auth-store.ts`                |
| SDK OAuth         | `packages/sdk/src/oauth.ts`                        |
| SDK Refresh       | `packages/sdk/src/refresh.ts`                      |
| SDK Fetcher       | `packages/sdk/src/fetcher.ts`                      |

### Cookie Configuration

The refresh cookie (`sh_refresh`) is set with:

- `httpOnly: true`
- `secure: true` (in production)
- `sameSite: 'none'` (in production)
- `path: '/'`
- `domain: process.env.COOKIE_DOMAIN` (should be `.sitehaus.dev`)

**Critical**: `COOKIE_DOMAIN` must be set in production to `.sitehaus.dev` for cross-subdomain cookies.

### CORS Configuration

Located in `apps/api/src/main.ts`:

- Allowed origins from `clientRedirectUrisTable` + hardcoded dev/prod origins
- `credentials: true` for cookie support
- All SDK requests use `credentials: 'include'`

## Common Issues

### 0. Race Condition: bootstrap() vs OAuth Token Exchange (FIXED)

**Symptoms:**

- `/auth/refresh` returns 401 "Invalid refresh"
- Two different session IDs in logs (one from /login, one from /token)
- Flow: `/login->/me->/token->/refresh` with refresh failing

**Root Cause:**
When the callback page loads, `Providers` runs `bootstrap()` which tries to refresh the session.
Meanwhile, the callback's `handleCallback()` runs `/token` which creates a new session and **revokes the old one**.

The race:

1. `/login` creates session A, sets cookie A
2. `/token` creates session B, **revokes session A**, sets cookie B
3. `bootstrap()` tries to refresh with cookie A (or while revocation is happening)
4. Refresh fails with "Invalid refresh" because session A is revoked

**Fix (applied):**
In `apps/iam/app/providers/providers.tsx`, skip bootstrap on the callback page:

```typescript
useEffect(() => {
  // Skip bootstrap on callback page - it handles its own token exchange
  if (hydrated && pathname !== "/callback") {
    void useAuthStore.getState().bootstrap();
  }
}, [hydrated, pathname]);
```

### 1. Login Loop (Cookie Not Persisted)

**Symptoms:**

- Login accepts credentials
- Redirects to /my-sessions or another protected page
- Immediately redirects back to login
- `/auth/refresh` returns 400

**Causes:**

1. `COOKIE_DOMAIN` not set in production
2. Browser blocking third-party cookies
3. Cookie rejected due to SameSite/Secure mismatch

**Debugging:**

```bash
# Check production env
echo $COOKIE_DOMAIN  # Should be: .sitehaus.dev

# Browser DevTools:
# 1. Network tab → Filter: /auth/token → Check Set-Cookie header
# 2. Application tab → Cookies → Check if sh_refresh exists
# 3. Network tab → Filter: /auth/refresh → Check if cookie is sent
```

**Environment Variables (API):**

```env
COOKIE_DOMAIN=.sitehaus.dev
COOKIE_SAME_SITE=none  # Optional, defaults to 'none' in prod
```

### 2. User is Null After me() Call

**Symptoms:**

- `/auth/me` returns 200 but `user: null`
- Console shows: "User after me(): null"

**Causes:**

1. User ID mismatch between JWT and database
2. User was deleted or doesn't exist
3. Database connection/pooling issues

**Debugging:**

```typescript
// In callback/page.tsx, add logging:
const tokens = await exchangeCodeForTokens({...});
console.log("Token received:", tokens.access_token);

// Decode JWT to check sub claim:
const payload = JSON.parse(atob(tokens.access_token.split('.')[1]));
console.log("JWT payload:", payload);
console.log("User ID (sub):", payload.sub);
```

**Check database:**

```sql
-- Verify user exists
SELECT * FROM users WHERE id = '<userId from JWT>';

-- Check session exists
SELECT * FROM sessions WHERE id = '<sessionId from JWT>';

-- Check auth code was created with correct userId
SELECT * FROM auth_codes ORDER BY created_at DESC LIMIT 5;
```

### 3. /auth/authorize Redirects to Login Despite Cookie

**Symptoms:**

- Cookie exists in browser
- /auth/authorize still redirects to login

**Causes:**

1. Cookie not being sent (domain mismatch)
2. Session expired or revoked
3. Refresh token validation failing

**Debugging:**

```typescript
// Add logging to oauth.controller.ts authorize():
console.log("[OAuth] Cookies:", req.cookies);
console.log("[OAuth] Has refresh cookie:", !!req.cookies["sh_refresh"]);
console.log("[OAuth] req.user:", req.user);
```

### 4. Token Exchange Fails

**Symptoms:**

- Callback shows "Failed to exchange code for tokens"
- Token endpoint returns 400

**Causes:**

1. PKCE validation failed (code_verifier mismatch)
2. Auth code expired (90 second TTL)
3. Auth code already consumed
4. Redirect URI mismatch

**Debugging:**

```typescript
// In oauth.controller.ts token():
console.log("[Token] Body:", body);
console.log("[Token] Client ID:", clientId);

// In auth-code.service.ts consume():
console.log("[AuthCode] Looking for code hash:", codeHash);
console.log("[AuthCode] Found auth code:", authCode);
```

## Zustand State Persistence

The auth store persists to **sessionStorage** (not localStorage):

```typescript
// packages/stores/src/auth-store.ts
partialize: (s) => ({
  user: s.user,
  session: s.session,
  accessToken: s.accessToken,
  accessExpiration: s.accessExpiration,
  clients: s.clients,
}),
```

### Why sessionStorage?

| Aspect           | sessionStorage  | localStorage |
| ---------------- | --------------- | ------------ |
| Tab close        | Cleared ✅      | Persists     |
| Tab isolation    | Yes ✅          | Shared       |
| XSS risk window  | Until tab close | Until logout |
| New tab behavior | Needs refresh   | Immediate    |

**Security**: Access tokens are cleared when the tab closes, reducing the window for XSS attacks. The refresh token in the HttpOnly cookie handles cross-session persistence.

### Bootstrap Optimization

The `bootstrap()` function is optimized to minimize API calls:

```typescript
if (hasValidToken) {
  // If all data already loaded, skip API calls entirely
  const hasAllData = currentState.user && currentState.session && currentState.clients.length > 0;

  if (hasAllData) {
    set({ bootstrapped: true });
    return; // Zero API calls!
  }
  // Otherwise fetch fresh data
  await get().me();
  await get().loadMyClients();
}
```

| Scenario                | API Calls                           |
| ----------------------- | ----------------------------------- |
| Same-tab navigation     | 0                                   |
| New tab (valid token)   | 2 (`/me` + `/clients`)              |
| New tab (expired token) | 3 (`/refresh` + `/me` + `/clients`) |
| Logged out              | 1 (`/refresh` fails)                |

## Debug Logging

Add these environment variables for verbose logging:

```env
# In apps/api
DEBUG=oauth,auth,session
```

Or add console.log statements at key points:

1. `/auth/login` - after setting cookie
2. `/auth/authorize` - cookie check
3. `/auth/token` - code exchange
4. `/auth/me` - user lookup
5. `/auth/refresh` - cookie check

## Browser Considerations

### Third-Party Cookies

Some browsers block third-party cookies by default:

- Safari: ITP (Intelligent Tracking Prevention)
- Firefox: Enhanced Tracking Protection
- Chrome: Privacy Sandbox (future)

With `SameSite=None; Secure`, cross-origin cookies should work, but some privacy extensions may block them.

### Testing Cross-Origin Cookies

1. Open browser DevTools → Application → Cookies
2. After login, check if `sh_refresh` exists for `.sitehaus.dev`
3. Navigate to protected page
4. Check Network tab for `/auth/refresh` request
5. Verify cookie is included in request headers

## Production Checklist

- [ ] `COOKIE_DOMAIN=.sitehaus.dev` in API .env
- [ ] All subdomains use HTTPS
- [ ] CORS allows `iam.sitehaus.dev` origin
- [ ] Client redirect URIs include `https://iam.sitehaus.dev/callback`
- [ ] `IAM_APP_URL=https://iam.sitehaus.dev` in API .env
- [ ] Browser not blocking third-party cookies

## Applied Fixes (January 2026)

### 1. Race Condition Fix

**File:** `apps/iam/app/providers/providers.tsx`

Skip `bootstrap()` on the `/callback` page to prevent it from racing with OAuth token exchange:

```typescript
if (hydrated && pathname !== "/callback") {
  void useAuthStore.getState().bootstrap();
}
```

### 2. Token & Client Persistence

**File:** `packages/stores/src/auth-store.ts`

Changed from localStorage to sessionStorage and added token + clients persistence:

```typescript
storage: createJSONStorage(() => sessionStorage),
partialize: (s) => ({
  user: s.user,
  session: s.session,
  accessToken: s.accessToken,
  accessExpiration: s.accessExpiration,
  clients: s.clients,
}),
```

### 3. Bootstrap Optimization

**File:** `packages/stores/src/auth-store.ts`

Skip API calls if all data is already loaded:

```typescript
if (hasValidToken) {
  const hasAllData = currentState.user && currentState.session && currentState.clients.length > 0;

  if (hasAllData) {
    set({ bootstrapped: true });
    return; // No API calls needed
  }
  // ...
}
```

## Related Commits

- 9d2b3b1: Bug fixes for oauth AND cleaning up IAM UI/UX
- 0b4b1fe: Fixed bug relating to login refresh tokens for oauth clients
- (pending): Race condition fix + token persistence + bootstrap optimization

## Quick Diagnosis Commands

```bash
# Check API logs for auth errors
docker logs api 2>&1 | grep -E "(OAuth|auth|cookie|session)" | tail -100

# Database: Check recent sessions
psql $DATABASE_URL -c "SELECT id, user_id, client_id, created_at, revoked_at FROM sessions ORDER BY created_at DESC LIMIT 10;"

# Database: Check recent auth codes
psql $DATABASE_URL -c "SELECT id, user_id, client_id, consumed_at, expires_at FROM auth_codes ORDER BY created_at DESC LIMIT 10;"
```
