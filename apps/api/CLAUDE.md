# API App (IAM)

NestJS 11 backend. Handles auth, sessions, devices, roles, invites, OTP, and OAuth clients. Port 3003.

This app is **feature-complete**. Adding new features requires discussion — don't add endpoints or modules speculatively.

## Key Patterns

**Controllers bind to ts-rest contracts.** Contract in `@site-haus/contracts` defines the route shape. Controller uses `@TsRestHandler` + `tsRestHandler`. Body/query/params arrive already validated.

**Services own business logic.** No HTTP knowledge — never import NestJS exception classes. Return `null` (not found) or `{ error: string }` (invalid operation). Let DB errors propagate.

**Database** via `@site-haus/db` — Drizzle ORM. Schema organized into `iam/` and `core/` domains. Use snake_case for columns.

## Guards

| Guard             | File                       | Purpose                             |
| ----------------- | -------------------------- | ----------------------------------- |
| `AccessGuard`     | `auth/access.guard.ts`     | Validates JWT, populates `req.user` |
| `PermissionGuard` | `auth/permission.guard.ts` | Checks `@RequirePerms` metadata     |
| `VerifiedGuard`   | `auth/verified.guard.ts`   | Requires email-verified user        |

Guards run before handlers — never re-check ownership inside a service.

## Module Structure

```
src/
  auth/         ← JWT, login, refresh, OTP
  users/        ← user CRUD, invite flow
  sessions/     ← session management
  devices/      ← device tracking
  roles/        ← roles + permissions
  clients/      ← OAuth client config
  invites/      ← invite tokens
```

## TypeScript

- Types from Drizzle `$inferSelect` or `z.infer<>` — no re-declarations
- `req.user!` non-null assertion is correct on protected routes (guard guarantees it)
- No `any`
