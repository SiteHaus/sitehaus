# React / Next.js Standards — SiteHaus Dashboard

Living document. Update when a decision is made, not when it's considered.

---

## Philosophy

- Colocate by feature. Extract on the **third use**, never before.
- Never abstract for abstraction's sake. Three similar lines of code is better than a premature utility.
- Prefer editing existing files over creating new ones.
- Do not add error handling, fallbacks, or validation for scenarios that cannot happen.

---

## Client vs Server Components

All dashboard pages are `"use client"` — they depend on `useAuthStore` which is a Zustand store.
Server components are acceptable only for pure layout wrappers that do not touch auth or async data.

---

## Data Fetching

Use **React Query** (`@tanstack/react-query`) for all async data in the dashboard.

**Query (read):**

```ts
const { data: milestones = [], isLoading } = useQuery({
  queryKey: queryKeys.milestones.list(projectId),
  queryFn: async () => {
    const res = await getApi().milestones.list({ params: { projectId } });
    if (res.status !== 200) throw new Error("Failed to load milestones");
    return res.body.milestones;
  },
});
```

**Mutation (write):**

```ts
const queryClient = useQueryClient();

const createMutation = useMutation({
  mutationFn: (data: CreateMilestoneInput) =>
    getApi().milestones.create({ params: { projectId }, body: data }),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.milestones.list(projectId) });
    toast.success("Milestone created");
  },
  onError: () => toast.error("Failed to create milestone"),
});
```

Rules:

- All query keys come from `@/lib/query-keys` — never inline string arrays.
- Default `staleTime` is 30 s (set in `QueryClientProvider`). Use `Infinity` for rarely-changing data (e.g., breadcrumb names).
- `retry: 1`, `refetchOnWindowFocus: false` by default.
- Mutations use `onSuccess`/`onError` for toasts. Initial loads throw (React Query handles retry/error).
- Optimistic updates via `onMutate` only where reorder UX demands it.

---

## Custom Hooks

- **Naming**: `use-<noun>.ts` (kebab-case file, `use` prefix function)
- **Location**: `hooks/` for shared (used across pages), `_components/` for local (one page only)
- **Return shape**: `{ data, loading, ...actions }` — keep the same public API when migrating

Hooks that do not perform async fetching (`useIsEmployee`, `useClientContext`) stay as plain Zustand selectors — no React Query needed.

---

## Component Organization

| Layer            | Location                             | Rule                                               |
| ---------------- | ------------------------------------ | -------------------------------------------------- |
| Generic UI       | `@site-haus/ui`                      | No domain knowledge, no business logic             |
| Shared dashboard | `apps/dashboard/components/`         | Shared across multiple pages, may use domain types |
| Colocated        | `apps/dashboard/app/**/_components/` | One page only — delete if the page is removed      |

### One component per file

Every named component lives in its own file. No exceptions.

### Thin page files

`page.tsx` files contain only the top-level export and role dispatch. All real view components go in `_components/`. A page file should rarely exceed 15 lines.

```
app/(dashboard)/
  page.tsx                   ← role dispatch only (~8 lines)
  _components/
    client-home-view.tsx
    employee-home-view.tsx
    project-hero-card.tsx
    milestone-status-icon.tsx
```

---

## Forms

- **Library**: react-hook-form + `@hookform/resolvers/zod`
- **Schema**: always from `@site-haus/validation` (never inline Zod schemas in components)
- **Infer types**: `type Input = z.infer<typeof schema>` — no `any`

---

## Auth & Permissions

```ts
const canManage = useAuthStore((s) => s.hasPerm("projects:manage"));
const isEmployee = useIsEmployee(); // SiteHaus staff with canManage
const client = useClientContext(); // non-first-party client, or null
```

---

## Error Handling

- **Initial loads**: throw inside `queryFn` — React Query handles retry and error states.
- **Mutations**: `toast.error(...)` in `onError`. Never silent-fail on writes.
- **Silent failures**: acceptable only for supplemental data (versions, breadcrumb names) where a missing value degrades gracefully.

---

## Utilities

| What                                   | Where to import from           |
| -------------------------------------- | ------------------------------ |
| `formatDate`, `formatCents`, `label`   | `@site-haus/utils/core/format` |
| Badge variants (status, billing, etc.) | `@/lib/variants`               |
| Query key factories                    | `@/lib/query-keys`             |

---

## TypeScript

- Response and domain types from `@site-haus/contracts` — never re-declare them.
- Form input types via `z.infer<typeof schema>` from `@site-haus/validation`.
- No `any`. Use `unknown` at boundaries; narrow with type guards.

---

## Naming Conventions

| Thing                   | Convention                                               |
| ----------------------- | -------------------------------------------------------- |
| Files                   | `kebab-case.tsx`                                         |
| Components              | `PascalCase`                                             |
| Hooks                   | `use` prefix, file in `use-<noun>.ts`                    |
| Query keys              | Always via `queryKeys.*` factory from `@/lib/query-keys` |
| Private page components | Defined in same file or `_components/` subdirectory      |
