---
name: folder-architecture
description: Feature-first folder placement for Bgt File Manager — where services, hooks, schemas, components, and shared UI live. Use when creating features, moving files, deciding imports, or structuring new screens.
---

# Folder Architecture Skill

## Purpose
Keep the codebase feature-first and predictable.

## Layout

```text
src/
  app/                    # routes only — thin pages that render feature entrypoints
  features/<feature>/
    components/           # presentational UI for this feature
    hooks/                # useQuery / useMutation / local UI hooks
    services/             # axios calls only
    schemas/              # Zod schemas
    types.ts              # DTOs and domain types
    index.tsx             # feature page entry (optional)
    api/                  # optional mocks/stores (dev only)
  components/
    ui/                   # design-system primitives
    layout/               # app shell, sidebar, header
    feedback/             # empty / error states
  query/                  # query client, provider, queryKeys
  lib/                    # axios, cn, utils
  constants/              # messages and shared copy
```

## Rules
- Follow DESIGN.md before anything else.
- Shared code lives outside `features/`.
- Never import feature internals from another feature.
- App routes stay thin: `page.tsx` imports the feature entry only.
- Business logic lives in hooks/services, not components.
- Presentational components receive props; they do not call axios.
- Prefer kebab-case file names; PascalCase component exports.

## Reference
- `src/features/users/` — full CRUD-list pattern
- `src/components/layout/app-shell.tsx` — shell composition

## Checklist
- [ ] New code is in the correct feature or shared folder
- [ ] No cross-feature deep imports
- [ ] Route file is thin
- [ ] Types/schemas/services/hooks are colocated with the feature
