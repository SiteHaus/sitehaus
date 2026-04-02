# NestJS API Standards — SiteHaus Ecommerce

Living document. Update when a decision is made, not when it's considered.
Applies to: the ecommerce platform (`/home/pillar/Dev/ecommerce`).

For the rationale behind these choices vs. the existing SiteHaus API, see [`docs/standards/evolution.md`](./evolution.md).

---

## Philosophy

- Controllers route. Services decide. Repos query.
- The contract is the source of truth for every route's shape — not the controller, not a DTO class.
- Never put business logic in a controller. Never put DB queries in a service.
- Extract on the **third use**, never before.
- Do not add error handling or validation for scenarios that cannot happen.

---

## REST Conventions

### URL structure

- Plural nouns for resources: `/products`, `/orders`, `/collections`
- Kebab-case for multi-word resources: `/shipping-zones`, `/cart-items`
- Nested only one level deep: `/products/:productId/images` — never `/stores/:storeId/products/:productId/images/upload`
- No verbs in URLs — the HTTP method is the verb: `DELETE /products/:id`, not `POST /products/:id/delete`
- Actions that don't map cleanly to CRUD go on a sub-resource: `POST /orders/:id/refund`, `POST /orders/:id/ship`

### HTTP methods

| Method | Meaning | Success status |
|---|---|---|
| `GET` | Read — no side effects, safe to retry | `200 OK` |
| `POST` | Create a new resource | `201 Created` |
| `PATCH` | Partial update — only fields provided are changed | `200 OK` |
| `PUT` | Full replace — rarely used; prefer `PATCH` | `200 OK` |
| `DELETE` | Remove a resource | `200 OK` (with body) or `204 No Content` |

Use `POST` for actions: `POST /orders/:id/refund`, `POST /stores/connect-stripe`. Not `PATCH /orders/:id` with `{ action: 'refund' }`.

### Status codes

| Situation | Code |
|---|---|
| Successful read or update | `200` |
| Resource created | `201` |
| Request valid but business rule blocks it | `422 Unprocessable Entity` |
| Authentication missing or invalid | `401` |
| Authenticated but not allowed | `403` |
| Resource not found | `404` |
| Conflict with existing state | `409` |
| Validation failure (malformed input) | `400` |

`422` vs `400`: use `400` for inputs that are structurally wrong (missing required field, wrong type). Use `422` for inputs that are valid but can't be processed (sold out, store not configured, invalid state transition).

---

## Method Naming — The Standard Vocabulary

Every layer (controller method, service method, TCP pattern) uses the **same verb** for the same operation. Consistency means you can find the service method immediately after reading the contract route.

### CRUD verbs

| Operation | Controller | Service | TCP pattern |
|---|---|---|---|
| List resources | `list` | `list` | `products.list` |
| Get one by ID | `get` | `getById` | `products.get` |
| Create | `create` | `create` | `products.create` |
| Partial update | `update` | `update` | `products.update` |
| Delete/remove | `remove` | `remove` | `products.remove` |

`get` vs `getById`: controllers use `get` (the ID comes from params). Services use `getById` to be explicit at the call site.

### Action verbs (non-CRUD)

For operations that aren't clean CRUD, use a specific past-tense-ready verb:

| Operation | Controller | Service | TCP pattern |
|---|---|---|---|
| Transition order status → shipped | `ship` | `ship` | `orders.ship` |
| Refund an order | `refund` | `refund` | `payments.refund` |
| Reserve inventory | — | `reserve` | `inventory.reserve` |
| Release a reservation | — | `release` | `inventory.release` |
| Commit reserved stock | — | `commit` | `inventory.commit` |
| Merge anonymous cart → user | — | `merge` | `orders.mergeCart` |

### What not to use

| Avoid | Use instead |
|---|---|
| `fetch`, `retrieve`, `load` | `list` / `getById` |
| `add`, `insert`, `save` | `create` |
| `modify`, `edit`, `set`, `put` | `update` |
| `delete`, `destroy`, `drop` | `remove` |
| `doX`, `handleX`, `processX` | the actual verb: `refund`, `ship`, `reserve` |

---

## Contracts

Every HTTP route is defined in `packages/contracts` before the controller exists.
The contract owns:
- HTTP method + path
- Request body schema (Zod)
- Query schema (Zod)
- Path params
- All valid response shapes by status code

```typescript
// packages/contracts/src/catalog/products.contract.ts
const c = initContract();

export const productsRouter = c.router({
  create: {
    method: 'POST',
    path: '/products',
    body: createProductSchema,
    responses: {
      201: z.object({ product: productItem }),
      403: apiError,
      422: apiError,
    },
  },
  get: {
    method: 'GET',
    path: '/products/:productId',
    pathParams: z.object({ productId: z.uuid() }),
    responses: {
      200: z.object({ product: productDetail }),
      404: apiError,
    },
  },
});
```

**Rules:**
- Define the contract first, implement second.
- Response schemas are Zod objects — they validate outgoing data in development.
- Every realistic error status gets its own response entry.
- Export typed response shapes: `export type ProductItem = z.infer<typeof productItem>`.

---

## Controllers

**Controllers bind to contracts. Nothing else.**

Use `@TsRestHandler` to bind a method to a contract route and `tsRestHandler` to handle the request. Body, query, and params arrive **already validated and typed** — no manual parsing.

```typescript
import { TsRestHandler, tsRestHandler } from '@ts-rest/nest';
import { contract } from '@sitehaus-ecom/contracts';

@Controller()
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  @TsRestHandler(contract.catalog.create)
  async create(@Req() req: AuthedRequest) {
    return tsRestHandler(contract.catalog.create, async ({ body }) => {
      const result = await this.products.create(body, req.user!);
      if ('error' in result) return { status: 422 as const, body: { message: result.error } };
      return { status: 201 as const, body: { product: result } };
    });
  }

  @TsRestHandler(contract.catalog.get)
  async get(@Req() req: AuthedRequest) {
    return tsRestHandler(contract.catalog.get, async ({ params }) => {
      const product = await this.products.getById(params.productId, req.store!.id);
      if (!product) return { status: 404 as const, body: { message: 'Product not found' } };
      return { status: 200 as const, body: { product } };
    });
  }
}
```

**Rules:**
- Never type `@Body()` or `@Query()` as `unknown` — use the `tsRestHandler` callback params.
- Always use `as const` on status codes — ts-rest needs literal types to enforce the response shape.
- Map service results to the correct status. TypeScript will error if the body shape doesn't match the contract.
- Never throw HTTP exceptions inside `tsRestHandler` — return the error status instead.
- Guards and decorators (`@RequirePerms`, `@Public`, `@StoreOwner`) still go on the method, not inside the handler.

### Multiple routes in one controller

For modules with many routes, use `@TsRestHandler(contract.catalog)` to handle the entire router in one method, or split into focused controllers per sub-resource.

---

## Services

**Services own business logic. They have no knowledge of HTTP or ts-rest.**

- Accept typed inputs inferred from Zod schemas.
- Return typed domain objects, `null` (not found / access denied), or `{ error: string }` (invalid operation).
- Never throw HTTP exceptions. Never import from `@nestjs/common` exception classes.
- Let unexpected errors (DB failures, constraint violations) propagate naturally.

```typescript
// ✅
async create(data: CreateProductInput, ctx: StoreContext): Promise<Product | { error: string }> {
  const store = await this.db.query.storesTable.findFirst({ ... });
  if (!store?.stripeChargesEnabled) return { error: 'Store is not ready to accept payments' };
  const [product] = await this.db.insert(schema.productsTable).values({ ... }).returning();
  return serialise(product);
}

// ❌ — HTTP concern in a service
async create(...) {
  if (!store) throw new NotFoundException('Store not found');
}
```

### StoreContext

Every store-scoped operation receives a `StoreContext`:

```typescript
interface StoreContext {
  storeId: string;
  userId?: string;   // undefined for anonymous/system operations
}
```

Build it from `req.store` and `req.user` in the controller. Never build it inside the service.

### AuditContext

Every mutating operation also receives an `AuditContext` for fire-and-forget audit logging:

```typescript
interface AuditContext {
  storeId: string;
  userId?: string;
  action: string;     // format: domain.past_verb  e.g. 'product.created'
  targetType: string;
  targetId: string;
  meta?: Record<string, unknown>;
}
```

---

## Database Access

All queries use **Drizzle ORM** via the `DB` injection token from `@sitehaus-ecom/database`.

```typescript
constructor(@Inject(DB) private readonly db: Db) {}
```

### Query style

`db.query.*` for reads with relations. `db.insert/update/delete` for writes and complex filters.

```typescript
// read with relation
const product = await this.db.query.productsTable.findFirst({
  where: and(eq(schema.productsTable.id, id), eq(schema.productsTable.storeId, storeId)),
  with: {
    variants: { where: eq(schema.variantsTable.isActive, true) },
    images: { orderBy: asc(schema.imagesTable.sortOrder) },
  },
});

// write
const [product] = await this.db
  .insert(schema.productsTable)
  .values({ storeId, name, status: 'draft' })
  .returning();
```

### Always scope to storeId

Every query on a store-owned table must include a `storeId` condition. There are no exceptions — this is the multi-tenancy boundary.

```typescript
// ✅
where: and(eq(schema.productsTable.id, id), eq(schema.productsTable.storeId, storeId))

// ❌ — missing tenant scope
where: eq(schema.productsTable.id, id)
```

### Column selection on joins

Specify `columns: { id: true, name: true }` when loading relations you only need a few fields from. Never load full rows for joins.

### Serialisation

Define a `serialise` function per service. Dates from Postgres are `Date` objects — always convert to ISO strings.

```typescript
function serialise(row: typeof schema.productsTable.$inferSelect) {
  return {
    ...row,
    goesLiveAt: row.goesLiveAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
```

### Cursor pagination

Use cursor-based pagination for all list endpoints. Never use offset.

```typescript
const rows = await this.db.query.productsTable.findMany({
  where: conditions.length ? and(...conditions) : undefined,
  orderBy: [desc(schema.productsTable.createdAt)],
  limit: limit + 1,
});

const hasMore = rows.length > limit;
const items = hasMore ? rows.slice(0, limit) : rows;
return { items: items.map(serialise), nextCursor: hasMore ? items.at(-1)?.id : undefined };
```

---

## TCP Handlers (Microservices)

TCP endpoints can't use ts-rest (HTTP only). Use a typed Zod parse directly on `data`.

```typescript
import { MessagePattern, EventPattern, Payload, RpcException } from '@nestjs/microservices';

// Request-response: called with clientProxy.send()
@MessagePattern('inventory.reserve')
async reserve(@Payload() data: unknown) {
  const input = reserveInventorySchema.parse(data); // throws on invalid input
  const result = await this.inventory.reserve(input);
  if (result === 'sold_out') throw new RpcException({ status: 422, message: 'Sold out', code: 'SOLD_OUT' });
  return result;
}

// Fire-and-forget: called with clientProxy.emit()
@EventPattern('order.confirmed')
async onOrderConfirmed(@Payload() data: unknown) {
  const event = orderConfirmedEventSchema.parse(data);
  await this.notifications.sendConfirmation(event);
  // No return. Never throw — crashed events are lost silently.
}
```

`RpcException` shape: `{ status: number, message: string, code: string }`.
The gateway's `RpcExceptionFilter` maps `status` → HTTP response code.

---

## Auth & Permissions

### Guards (all global via `SiteHausAuthModule`)

| Guard | What it does |
|---|---|
| `AccessGuard` | Introspects token via IAM SDK, populates `req.user: UserContext` |
| `PermissionGuard` | Reads `@RequirePerms` metadata, checks `req.user.permissions` |
| `StoreResolutionMiddleware` | Resolves domain/slug → store record, attaches `req.store` |
| `StoreOwnerGuard` | Verifies `req.user.clientId === req.store.clientId` |

### Decorators

```typescript
@RequirePerms('products:manage')     // ALL listed perms required
@RequireAnyPerm('admin', 'owner')    // ANY listed perm sufficient
@Public()                            // Skip auth; req.user still populated if token present
@StoreOwner()                        // Shorthand for StoreOwnerGuard
```

Guards run before the route handler. Never re-check ownership inside a service — the guard already did it.

---

## Audit Logging

Fire-and-forget via BullMQ (`ecom:audit` queue). Never awaited on the hot path.

```typescript
// In service, after a successful mutation:
this.audit.enqueue({
  storeId: ctx.storeId,
  userId: ctx.userId,
  action: 'product.created',      // domain.past_verb
  targetType: 'product',
  targetId: product.id,
  meta: { name: product.name },
});
```

The `AuditProcessor` in the worker writes to `store_audit_logs`. Services call `enqueue` and move on — they don't wait for the write.

---

## TypeScript

- No `any`. Use `unknown` at TCP boundaries and external API responses; narrow with Zod.
- Domain types from Drizzle's `$inferSelect` / `$inferInsert` or from contract schemas via `z.infer<>` — never re-declare.
- Input types via `z.infer<typeof schema>` — no DTO classes, no separate interfaces for validated inputs.
- `type` over `interface` for all local shapes.
- `req.user!` and `req.store!` non-null assertions are correct on protected routes — the guards guarantee presence.

---

## Comments

Comment **why**, not **what**.

```typescript
// ✅ — explains a constraint
// storeId is denormalised on variants for query performance — always include it
where: and(eq(schema.variantsTable.id, id), eq(schema.variantsTable.storeId, storeId))

// ❌ — restates the obvious
// Filter by variant ID
where: eq(schema.variantsTable.id, id)
```

When to add a comment:
- A guard clause that looks wrong but is intentional
- A business rule that isn't clear from variable names alone
- A workaround for a library bug or external API quirk
- Multi-step operations where order matters for a non-obvious reason

Do not comment every method. No JSDoc on internal service methods — only on exported module APIs.

---

## Naming Conventions

| Thing | Convention | Example |
|---|---|---|
| Files | `kebab-case.ts` | `products.service.ts` |
| Classes | `PascalCase` | `ProductsService` |
| Methods | `camelCase`, imperative | `create`, `getById`, `transitionStatus` |
| DB injection token | `DB` (constant from `@sitehaus-ecom/database`) | `@Inject(DB)` |
| Audit actions | `domain.past_verb` | `product.created`, `order.shipped` |
| TCP patterns | `domain.verb` | `inventory.reserve`, `orders.ship` |
| BullMQ queues | `ecom:domain` | `ecom:inventory`, `ecom:audit` |
| Zod schemas | `${verb}${Noun}Schema` / `${noun}Schema` | `createProductSchema`, `productItem` |
| Inferred types | `${Verb}${Noun}Input` | `CreateProductInput`, `ListProductsQuery` |

---

## Module File Layout

```
packages/catalog/src/
  products/
    products.controller.ts   ← @TsRestHandler bindings only
    products.service.ts      ← business logic, error signaling
    products.repo.ts         ← DB queries (add when service > ~150 lines)
  catalog.module.ts
  index.ts                   ← export { CatalogModule }
```

### Dependency rules

```
controller  →  service
service     →  repo (if extracted) | db directly (if not)
service     →  AuditModule (enqueue only)
service     →  other services via injected module
repo        →  db only
```

Controllers never import repos. Services never import controllers. No circular module imports.
