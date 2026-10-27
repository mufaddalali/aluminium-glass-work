---
name: query-key-conventions
description: Central TanStack Query keys, useQuery/useMutation patterns, and invalidation strategy. Use when adding queries, mutations, cache updates, or list/detail refetch behavior.
---

# Query Key Conventions Skill

## Purpose
One hierarchical `queryKeys` object; invalidate after mutations; keep server state out of Zustand.

## Source of truth
- Keys: `src/query/query-keys.ts`
- Client defaults: `src/query/query-client.ts`
- Provider: `src/query/query-provider.tsx` (via `AppProviders`)

## Key shape

```ts
queryKeys = {
  users: {
    all: ["users"],
    lists: () => [...all, "list"],
    list: (params) => [...lists(), params],
    // later: details / detail(id)
  },
}
```

## Rules
- Follow DESIGN.md before anything else.
- Never hardcode query key arrays in components — always use `queryKeys`.
- `useQuery` lives in feature hooks (`use-users-query.ts`), not deep leaf UI.
- `useMutation` invalidates the broadest useful scope:
  - after create/update/delete list rows → `queryKeys.<resource>.lists()`
  - after detail edit → detail key + lists if the list shows that field
- Prefer `placeholderData: keepPreviousData` for paginated/filterable lists.
- Server data = React Query. Client UI state (modals, selection) = React state or Zustand.

## Reference
- `src/features/users/hooks/use-users-query.ts`
- `src/features/users/hooks/use-bulk-delete-users.ts`

## Checklist
- [ ] Keys added under `queryKeys`
- [ ] Query hook uses `queryKey` + service `queryFn`
- [ ] Mutation invalidates related keys on success
- [ ] No server cache stored in Zustand
