---
name: admin-layout-patterns
description: Admin/CMS page layouts — list, detail, settings placeholders, action bars, tabs, dialogs, dashboard cards, and shell composition. Use when building or refactoring admin screens and page structure.
---

# Admin Layout Patterns Skill

## Purpose
Predictable admin screens that match the Bgt File Manager shell and visual language.

## Shell
- `AppShell` = fixed sidebar (desktop always open) + fixed header + max-width main
- Mobile: sidebar drawer only; do not add desktop collapse
- Do not reinvent navigation chrome inside features
- Page content owns title, description, and sections only

## Page patterns

### List page
1. Page title (bold) + muted description  
2. Filters card  
3. Bulk action bar (conditional)  
4. Table / skeleton / empty / error  

### Dashboard / overview
1. Hero greeting / title  
2. Summary metric cards (`interactive-lift surface-card`)  
3. Secondary panels in a responsive grid  

### Tabbed feature
1. Title + description that can change with tab  
2. Underline tabs (`components/ui/tabs`)  
3. Tab content with section cards  

### Placeholder / coming soon
- Wrap `EmptyState` in `surface-card rounded-2xl`

## Rules
- Follow DESIGN.md Visual Language.
- Spacing rhythm: prefer `space-y-8` between major blocks, `gap-4` in grids.
- Destructive flows use dialogs (`Dialog*`) — never instant delete.
- Action bars stay compact; primary actions use `Button` variants.
- Compose `components/ui` + `components/feedback`; avoid nested card clutter.
- Feature UI stays presentational; data via hooks.

## Reference
- List: `src/features/users/index.tsx`
- Dashboard: `src/features/dashboard/index.tsx`
- Tabs: `src/features/business-structure/index.tsx`
- Shell: `src/components/layout/app-shell.tsx`

## Checklist
- [ ] Uses AppShell (no custom chrome)
- [ ] Typography hierarchy matches DESIGN.md
- [ ] Loading / empty / error states present where data loads
- [ ] Light and dark both look correct
