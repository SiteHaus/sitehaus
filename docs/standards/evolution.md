# API Evolution — What We Learned

This document captures decisions we made in the original SiteHaus API (`apps/api`), what we'd do differently, and why the ecommerce platform is built the way it is.

Not a criticism of the old code — it works and ships. This is about raising the bar on the next thing.

---

## 1. Contracts existed but controllers ignored them

### What we did
We defined ts-rest contracts in `packages/contracts` with full Zod schemas and typed response shapes. Then the controllers completely bypassed them:

```typescript
// tickets.controller.ts — old approach
async create(@Body() body: unknown) {
  const parsed = createTicketSchema.parse(body);   // manual, could be skipped
  const result = await this.tickets.create(parsed, ctx);
  if ('error' in result) throw new ForbiddenException(result.error);
  return { ticket: result };   // no type enforcement on the response
}
```

The contracts were only used by the frontend SDK client (`@site-haus/sdk`). The backend never bound to them.

### What we do now
Use `@ts-rest/nest` to bind controllers directly to their contract routes. The contract IS the controller's type system:

```typescript
@TsRestHandler(contract.catalog.create)
async create(@Req() req: AuthedRequest) {
  return tsRestHandler(contract.catalog.create, async ({ body }) => {
    const result = await this.products.create(body, req.user!);
    if ('error' in result) return { status: 422 as const, body: { message: result.error } };
    return { status: 201 as const, body: { product: result } };
  });
}
```

**Why it matters:** TypeScript now errors if the response body doesn't match the contract schema. You can't accidentally return the wrong shape or forget a field. The contract enforces correctness at both ends — frontend and backend.

---

## 2. `unknown` bodies made controllers noisy

### What we did
Every controller parameter was typed as `unknown`, then immediately parsed:

```typescript
async create(@Body() body: unknown) {
  const parsed = createTicketSchema.parse(body);
  // now we have a type, but we had to add boilerplate to get here
}
```

In every single handler. Easy to forget on a quick patch. No compile-time safety until runtime.

### What we do now
With `@ts-rest/nest`, `body`, `query`, and `params` arrive pre-validated and fully typed inside the `tsRestHandler` callback. No manual `.parse()`. No `unknown` in controllers.

---

## 3. Response shapes were unenforced

### What we did
Controllers returned plain object literals with no type checking on the response:

```typescript
return { ticket: result };   // TypeScript doesn't verify this matches the contract
```

If a field was renamed or a new required field added to the contract, the controller silently returned the wrong shape.

### What we do now
The `tsRestHandler` return type is derived from the contract's response schemas. Add a field to the contract and forget to add it to the service output — TypeScript errors. Remove a field — TypeScript errors. The compiler enforces contract compliance end-to-end.

---

## 4. Audit logging blocked the hot path

### What we did
`AuditService.log()` was a direct DB write, awaited inline after every mutation. Every create/update/delete waited for an audit row before returning a response.

### What we do now
`AuditModule.enqueue()` pushes to the `ecom:audit` BullMQ queue (fire-and-forget). The worker's `AuditProcessor` writes to DB asynchronously. The hot path returns immediately. If the audit write fails, it retries in the worker — it doesn't affect the user's response.

---

## 5. Business logic crept into controllers

### What we did
Controllers occasionally held logic that belonged in services — ownership checks, conditional branching, constructing multi-field update objects. It wasn't always obvious where the line was.

### What we do now
The rule is strict: controllers translate (route → parse → call service → map result → return). Services decide (ownership, state transitions, business rules). If you find yourself writing an `if` in a controller that isn't about HTTP status mapping, it belongs in the service.

---

## 6. No repo layer meant bloated services

### What we did
Services held both business logic and Drizzle queries in the same file. The tickets service was already approaching 370 lines and mixed query construction with state machine logic.

### What we do now
`*.repo.ts` is an explicit layer. Services grow to ~150 lines before a repo is extracted — not as a rule to always follow, but as a signal. When a service is large, the split makes each layer easier to read, test, and modify independently.

---

## Summary

| Old | New | Why |
|---|---|---|
| `@Body() body: unknown` + manual `.parse()` | `tsRestHandler` typed callback | Removes boilerplate, enforces at compile time |
| Contract unused by backend | `@TsRestHandler` binds controller to contract | Single source of truth, TS enforces both ends |
| Plain object return, no type check | Return must match contract response schema | Catch shape mismatches at build time |
| `await audit.log()` on hot path | `audit.enqueue()` fire-and-forget | Faster responses, retryable audit writes |
| Logic in controllers | Controllers route only | Predictable, testable, easy to locate logic |
| Queries in services | Repo layer extracted at ~150 lines | Easier to read and modify each layer independently |
