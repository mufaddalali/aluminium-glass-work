---
name: api-conventions
description: Axios service layer, DTOs, error normalization, and mutation toast feedback. Use when adding API calls, services, interceptors, or handling request/response errors.
---

# API Conventions Skill

## Purpose
All HTTP goes through a typed service layer. UI never calls axios directly.

## Stack
- Axios singleton: `src/lib/axios.ts` (`api`)
- Feature services: `src/features/<feature>/services/*.service.ts`
- Errors normalized to `{ message, status? }` via response interceptor
- User-facing copy from `src/constants/messages.ts`
- Mutation feedback via Sonner toasts

## Rules
- Follow DESIGN.md before anything else.
- Components and pages call hooks; hooks call services; services call `api`.
- Type request/response DTOs in the feature `types.ts`.
- Keep query-string builders and payload shaping in the service file.
- Do not catch-and-swallow errors in services — let hooks handle UX.
- On mutation success/error: toast with `messages.*` and `getErrorMessage`.
- When pointing at a real backend, change `api.baseURL` / env — keep service function names stable.

## Pattern

```ts
// services/users.service.ts
export async function getUsers(params: UsersListParams) {
  const { data } = await api.get<PaginatedUsersResponse>(`/users?${qs}`);
  return data;
}
```

```ts
// hooks/use-bulk-delete-users.ts
useMutation({
  mutationFn: bulkDeleteUsers,
  onSuccess: () => {
    toast.success(messages.users.deleteSuccess);
    void queryClient.invalidateQueries({ queryKey: queryKeys.users.lists() });
  },
  onError: (error) => {
    toast.error(getErrorMessage(error, messages.users.deleteError));
  },
});
```

## Checklist
- [ ] No axios usage outside `lib/axios` and feature services
- [ ] DTOs typed
- [ ] Errors normalized / toasted at the hook layer
- [ ] Success invalidates the correct query keys
