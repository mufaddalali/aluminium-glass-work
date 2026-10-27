---
name: datatable
description: Admin data tables with TanStack Table — pagination, filters, search, selection, bulk actions, skeletons, and empty/error states. Use when building or changing list pages and table UX.
---

# Datatable Skill

## Purpose
Server-driven lists that feel premium, fast, and safe for bulk work.

## Stack
- `@tanstack/react-table` + `components/ui/table`
- List query hook + filter hook + mutation hooks
- Filters/search via Zod + RHF; params in the query key
- Feedback: `UsersTableSkeleton`, `EmptyState`, `ErrorState`

## Rules
- Follow DESIGN.md (tables + Visual Language).
- Table container: `surface-card`, sticky header, row hover, generous padding.
- Server-side pagination/filter/sort — do not load entire datasets client-side by default.
- Selection state is local UI state; clear selection when filters/page change.
- Bulk destructive actions require a confirmation dialog.
- Search: debounced or explicit Apply; include search icon; premium field styling.
- Always implement: loading skeleton, empty state + reset CTA, error + retry.
- Keep columns presentational; formatting helpers stay small and local.

## Invalidation
After row mutations, invalidate `queryKeys.<resource>.lists()` so every filter/page refreshes.

## Reference
- `src/features/users/index.tsx`
- `src/features/users/components/users-table.tsx`
- `src/features/users/components/users-filters.tsx`
- `src/features/users/components/users-bulk-actions.tsx`
- `src/features/users/components/delete-users-dialog.tsx`

## Checklist
- [ ] Query params drive the list key
- [ ] Sticky header + elevated container
- [ ] Selection + bulk action + confirm
- [ ] Skeleton / empty / error covered
- [ ] Responsive column behavior considered
