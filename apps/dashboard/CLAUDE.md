# Dashboard App

Next.js 15 dashboard for SiteHaus clients and employees. All pages are `"use client"` (auth via Zustand store). Port 3001.

## Component Rules

- One component per file — no exceptions
- `page.tsx` is role-dispatch only (≤15 lines); all view components in `_components/`
- Component layers:
  - Generic UI → `@site-haus/ui`
  - Shared dashboard → `apps/dashboard/components/` (used across multiple pages)
  - Colocated → `app/**/_components/` (one page only)

```
app/(dashboard)/some-page/
  page.tsx              ← role dispatch only
  _components/
    employee-view.tsx
    client-view.tsx
```

## Data Fetching

React Query for all async data. Never fetch in components directly.

```ts
// Query
const { data: items = [], isLoading } = useQuery({
  queryKey: queryKeys.foo.list(id),
  queryFn: async () => {
    const res = await getApi().foo.list({ params: { id } });
    if (res.status !== 200) throw new Error("Failed to load");
    return res.body.items;
  },
});

// Mutation
const mut = useMutation({
  mutationFn: (data: Input) => getApi().foo.create({ body: data }),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.foo.list(id) });
    toast.success("Created");
  },
  onError: () => toast.error("Failed"),
});
```

Rules:

- All query keys from `@/lib/query-keys` — never inline string arrays
- `useIsEmployee` and `useClientContext` are plain Zustand selectors — no React Query
- Initial loads throw (React Query handles retry/error); mutations use `toast.error` in `onError`
- `staleTime: Infinity` for rarely-changing data (e.g. breadcrumb names)

## Forms

react-hook-form + zod resolver. Schema always from `@site-haus/validation` — never inline Zod in a component.

## Auth & Permissions

```ts
const canManage = useAuthStore((s) => s.hasPerm("projects:manage"));
const isEmployee = useIsEmployee(); // SiteHaus staff
const client = useClientContext(); // non-first-party client, or null
```

## Utilities

| What                                                     | Import from                                           |
| -------------------------------------------------------- | ----------------------------------------------------- |
| `formatDate`, `formatCents`, `label`                     | `@site-haus/utils/core/format`                        |
| Badge variants (`statusVariant`, `billingVariant`, etc.) | `@/lib/variants`                                      |
| Query key factories                                      | `@/lib/query-keys`                                    |
| Domain types                                             | `@site-haus/contracts` — never re-declare             |
| Form input types                                         | `z.infer<typeof schema>` from `@site-haus/validation` |

No inline format or variant functions — extract on third use, never before. No `any`.

## Full spec

`docs/standards/react.md`
