# IAM App (Identity Portal)

Next.js 15 auth UI. Port 3002. This app is **feature-complete** — don't add features without discussion.

## Key Points

- All pages are `"use client"` (auth state from Zustand)
- API calls via `@site-haus/sdk` — provides typed client with automatic token refresh
- UI components from `@site-haus/ui` (shadcn/ui)
- Covers: login, register, 2FA/OTP, sessions, devices, team management, roles/permissions, OAuth client config, audit logs

## Structure

```
app/
  (auth)/       ← login, register, forgot-password
  callback/     ← OAuth callback handler
  (console)/    ← authenticated portal (sessions, devices, team, etc.)
  components/   ← shared IAM components
  providers/    ← auth provider, query client
```
