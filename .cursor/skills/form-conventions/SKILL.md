---
name: form-conventions
description: React Hook Form + Zod forms, filter forms, validation, and field composition. Use when building create/edit forms, filter bars, or validation schemas.
---

# Form Conventions Skill

## Purpose
Consistent, typed forms with schemas colocated in the feature.

## Stack
- React Hook Form + Zod (`@hookform/resolvers/zod`)
- Schemas: `src/features/<feature>/schemas/*.schema.ts`
- Primitives: `Input`, `Select`, `Label`, `Checkbox`, `Button` from `components/ui`
- Copy: `messages` constants — no hardcoded labels when a key exists

## Rules
- Follow DESIGN.md visual language for inputs (rounded XL, focus ring, comfortable height).
- Define Zod schema first; infer form values from it when practical.
- Use `Controller` for Radix select/checkbox fields.
- Filter forms: filter loaded table rows client-side only — do not put search/status in list query params. Keep `reset()` for empty-state clear actions. Paginate filtered results in the UI when needed.
- Keep submit/mutate logic in the parent or a dedicated hook — not inside dumb field components.
- Show validation errors near fields; use toasts for submit-level failures.

## Reference
- `src/features/users/hooks/use-users-filters.ts`
- `src/features/users/components/users-filters.tsx`
- `src/lib/client-table.ts`

## Checklist
- [ ] Zod schema colocated with feature
- [ ] RHF wired with resolver
- [ ] Shared UI primitives used
- [ ] Labels/messages from constants
- [ ] Accessible labels (`htmlFor` / `aria-label`)
