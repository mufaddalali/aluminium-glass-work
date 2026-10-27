# DESIGN.md

Production Engineering Guide for a React CMS

> This document is the single source of truth for architecture, UI, code style and AI-assisted development.

# Project Philosophy


## Tech Stack
- Next.js App Router
- React + TypeScript
- Tailwind CSS
- GSAP
- TanStack Query
- React Hook Form + Zod
- Axios
- Zustand
- JWT Authentication

## Core Principles
1. Feature-first architecture.
2. Reusable before custom.
3. Composition over inheritance.
4. Accessibility first.
5. Mobile-first responsive UI.
6. Strong typing everywhere.
7. Keep business logic out of UI.
8. Every feature owns its API, hooks, schemas, and types.


# Folder Structure


```text
src/
 app/
 features/
   users/
     api/
     components/
     hooks/
     schemas/
     services/
     types.ts
 components/
   ui/
   layout/
   feedback/
 hooks/
 lib/
 services/
 styles/
 utils/
 constants/
 query/
 types/
```
Rules:
- Shared code lives outside features.
- Never import feature internals from another feature.


# TypeScript Conventions

No any, prefer interfaces for public contracts, type API responses, strict mode, barrel exports only where useful.

# React Component Standards

Presentational components receive props only. Business logic belongs in hooks. Max ~250 LOC per component.

# Tailwind CSS

Use design tokens, utility-first, extract repeated UI, avoid arbitrary values unless justified.
Prefer semantic classes and shared utilities from `src/app/globals.css` (`surface-card`, `surface-glass`, `interactive-lift`, `skeleton-shimmer`) over one-off visual recipes.

# Design Tokens

Source of truth: `src/app/globals.css` (`:root` / `.dark` + `@theme inline`).

Rules:
- Spacing uses an 8px rhythm (multiples of 4/8). Prefer breathable section gaps (`space-y-8`, `gap-4`/`gap-5`) over cramped stacks.
- Radius: controls/buttons/badges `rounded-md` / `rounded-sm` (4–6px); cards and panels `rounded-xl` (16px). Prefer square Mintlify geometry over pills.
- Shadows: use `--shadow-xs/sm/md/lg` and `--shadow-primary`. Whispered elevation (3–6% opacity) — prefer a 1px border when separation is enough.
- Colors are semantic only: `background`, `foreground`, `card`, `muted`, `border`, `primary`, `secondary`, `accent`, `destructive`, `ring`, plus status (`success`/`warning`/`info`).
- Light and dark values must be defined together.
- Primary green is for actions and active indicators — not decoration everywhere. Accent red is reserved for badges, alerts, and rare emphasis.
- Avoid arbitrary hex/rgb in components unless adding a justified new token.

# Visual Language (Institutional Mint)

Inspired by [Mintlify on Refero](https://styles.refero.design/style/80d7ef36-ed7e-48bb-b558-f772eb40106f), adapted to Burhani Guards Trust Pakistan brand colors from `public/logo.png`.

Target feel: calm documentation-grade monochrome with a single green spark; institutional, scannable CMS — not flashy marketing UI.

## Goals
- Premium, calm, and scannable for daily work.
- Clear hierarchy, generous whitespace, reduced visual noise.
- Hairline borders + soft elevation instead of heavy chrome or glass overload.
- Interactive feedback without distracting motion.
- Fully light/dark compatible.

## Layout
- App shell: fixed-width sidebar (desktop always open) + fixed glass header + max-width main content.
- Mobile: sidebar drawer with overlay open/close only (no desktop collapse).
- Separate content with elevated cards / soft surfaces, not thick borders.
- Align to a consistent grid; keep pages breathable; never overcrowd.
- Responsive: mobile → tablet → laptop → desktop → ultra-wide. Avoid wasted empty regions on large screens.

## Typography hierarchy
- Page title: large, semibold, tight tracking (`text-3xl`/`text-4xl font-semibold tracking-tight`).
- Section / card title: medium, semibold (`text-base`/`text-lg font-semibold`).
- Body / description: muted, relaxed leading.
- Metric values: large, semibold, tabular nums.
- Captions / meta / eyebrows: small uppercase with `tracking-[0.08em]`.
- Improve readability before adding decoration.

## Colors
- Brand primary: logo field green `#0B7A45` — CTAs, focus rings, active nav, success.
- Accent: fleur-de-lis red `#D62027` — badges, destructive, rare emphasis (not large fills).
- Surfaces: paper white `#FFFFFF`, mist `#F2F2F2`, hairline borders `#E8E8E8` / `#DDDDDD`.
- Text: ink `#08090A` with muted `#5C636A`.
- Soft green secondary wash (`#EEF6F1`) for icon wells and subtle highlights.
- Hover states gently lift or wash — no harsh color jumps. Neutrals carry the UI; green is punctuation.

## Buttons
- Variants: `primary`, `secondary`, `outline`, `ghost`, `destructive`.
- Geometry: `rounded-md` (square, not pill).
- Primary: solid brand green + soft shadow.
- Motion: short color/brightness transitions; respect `prefers-reduced-motion`.
- Redesign via `src/components/ui/button.tsx` — do not invent one-off button styles in features.

## Inputs & forms
- Compact radius (`rounded-md`), comfortable padding (`h-10`/`h-11`), clear focus ring in primary green.
- Search fields should feel calm (icon + muted field background where appropriate).
- React Hook Form + Zod; validation feedback should be clear and non-jarring.

## Cards & surfaces
- Use `surface-card` / `Card` for grouped content.
- White/card fill, 1px border, whispered shadow, `rounded-xl` (16px).
- Card padding typically `p-5`/`p-6` (20–24px). Element gaps `gap-3`/`gap-4`.
- Use `Badge` for status (role, Drive, year, event year) — square tags, not pills.
- Optional `interactive-lift` for hoverable summary cards (1px lift + stronger shadow).
- Prefer cards over heavy boxed layouts; avoid nested card clutter.

## Tables
- Rounded elevated container, sticky header, row hover, generous cell padding.
- Status via `Badge` tones; pagination and density controls stay accessible.
- Always support loading skeleton, empty state, and error/retry.

## Sidebar & top nav
- Sidebar: fixed `w-60` on desktop (not collapsible). Mobile drawer with backdrop + close control.
- Active nav: soft primary wash + start-edge indicator bar (green punctuation).
- Header: `fixed` (does not scroll with page), `lg:start-60`, glass/white blur, theme toggle, profile, logout.
- Lucide icons only; consistent size (`h-4 w-4`) and spacing.

## Motion
- Tasteful only: page enter, card lift, tab content fade, dropdowns, theme toggle.
- GSAP: animate transform/opacity, kill timelines on cleanup, use `gsap.context`, honor reduced motion.
- No excessive animation; motion must clarify hierarchy or feedback.

## Empty / loading / error
- Empty: icon treatment + helpful title/description + optional CTA.
- Loading: shimmer skeletons — never spinners for primary content.
- Error: friendly card + clear explanation + retry action.

## UI change rules (mandatory)
When changing UI:
1. Preserve functionality, API calls, business logic, and accessibility.
2. Improve hierarchy, spacing, interactions, responsiveness, and motion only.
3. Reuse `components/ui` and `components/feedback` before inventing new primitives.
4. Keep feature components presentational; data stays in hooks/services.
5. Match light and dark modes.
6. Result should feel like a calm institutional CMS (Mintlify discipline + BGTP logo palette), not Bootstrap-era admin chrome.

# CMS Product Model

CMS features should model content explicitly: status, slug, ownership, timestamps, SEO metadata, media relationships, publish state, and audit history. Prefer workflow-aware UI over plain CRUD when content can be drafted, reviewed, scheduled, published, archived, restored, or reverted.

Core CMS capabilities:
- Content modeling
- Draft/publish workflows
- Revision history
- Audit logs
- Media library
- Admin layout patterns
- Settings management
- Search and filters

# Design System Governance

The design system owns tokens, primitives, component anatomy, variants, density, state styling, dark mode, accessibility behavior, and motion rules. Feature code composes design-system components; it should not create one-off visual systems.

Canonical primitives live in `src/components/ui` and layout in `src/components/layout`. Feedback patterns live in `src/components/feedback`.

Every reusable component should define:
- Anatomy and slots
- Variants and sizes
- Loading, empty, disabled, error, focus and destructive states
- Keyboard and screen reader behavior
- Responsive behavior
- Example usage

Reference implementations for visual quality:
- Shell: `app-shell`, `sidebar`, `header`
- Data: `users` feature (filters, table, bulk actions, empty/error)
- Overview: `dashboard` feature (hero, summary cards, list cards)

# GSAP

Animate transform/opacity, kill timelines on cleanup, use context, respect reduced motion, reusable animation helpers. Prefer short staggers and fade/slide-up for page sections — never decorative noise.

# React Query

Central queryKeys object, staleTime defaults, invalidate after mutations, optimistic updates where appropriate.

# Zustand

Zustand is for client-only UI/local state, never server data. Rules:
- One store per feature/domain, not a single global store.
- Server state (anything fetched from the API) belongs in React Query, not Zustand.
- Keep stores small: state + actions only, no derived data (use selectors instead).
- Use selective selectors (`useStore(s => s.value)`) to avoid unnecessary re-renders.
- Persist only what's needed (e.g. via `persist` middleware) and never persist sensitive data.
- Co-locate a feature's store under that feature's folder; only cross-feature/global UI state lives outside `features/`.

# API Layer

Axios singleton, interceptors, refresh token flow, services only, components never call axios.

# Authentication

JWT access+refresh, middleware protection, RBAC permissions, role guards.

# Forms

React Hook Form + Zod, schema beside feature, reusable field components.

# Error Handling

Error boundaries, API normalization, toast notifications, retry strategy.

# Loading States

Skeletons over spinners (`skeleton-shimmer`), optimistic UI, suspense where appropriate. Match skeleton shape to the final layout.

# Accessibility

Keyboard navigation, focus rings, aria labels, contrast AA, semantic HTML. All motion must degrade under `prefers-reduced-motion`.

# i18n & RTL

No hardcoded strings, translation keys, logical CSS properties, RTL tested.

# Naming

PascalCase components, kebab-case files, useX hooks, UPPER_SNAKE constants.

# Git

Conventional commits, feature branches, squash merges.

# Performance

Lazy routes, memoization only when measured, virtualization for tables, image optimization.

# Security

Sanitize HTML, validate server input, never trust client, CSRF/XSS awareness.

# AI Instructions

Always follow this document as the single source of truth for architecture and UI. For any new or updated screen:
- Follow **Visual Language (Institutional Mint)** and token rules before inventing styles.
- Reuse `components/ui`, layout, and feedback primitives.
- Never change business logic, API wiring, or query invalidation unless the task explicitly requires it.
- Prefer elevating shared primitives over feature-local one-offs.
- Explain new architecture or visual-system decisions briefly when they diverge from this doc.

# Skill Catalog

Keep the skill set small. DESIGN.md is the contract; skills are task playbooks with project-specific steps.

Active skills in `.cursor/skills`:
- `design-system` — premium SaaS UI language, primitives, motion, a11y
- `design-tokens-governance` — tokens in `globals.css`, shadows, spacing
- `folder-architecture` — feature-first placement and imports
- `api-conventions` — axios services, errors, mutation toasts
- `query-key-conventions` — TanStack Query keys and invalidation
- `form-conventions` — React Hook Form + Zod
- `datatable` — tables, filters/search, bulk actions, list states
- `admin-layout-patterns` — shell, list/dashboard/tab page structure
- `authentication` — JWT + RBAC (when building auth)

Do not add a new skill for every UI crumb. Fold loading/empty/toast/animation into `design-system` or the relevant feature skill. Add deferred domain skills (media, publishing, audit, i18n) only when that feature is actively built.

# Engineering Checklist

- [ ] Feature follows the existing folder architecture.
- [ ] Business logic lives in hooks/services, not UI components.
- [ ] API calls go through the service layer.
- [ ] Query keys and invalidation follow project conventions.
- [ ] Forms use React Hook Form and Zod.
- [ ] User-facing text comes from constants or translations.
- [ ] Loading, empty, error, and permission states are handled.
- [ ] Components are responsive and keyboard accessible.
- [ ] Design tokens / surface utilities are used instead of one-off values.
- [ ] Typography hierarchy and 8px spacing rhythm are followed.
- [ ] Light and dark modes both look correct.
- [ ] Motion is tasteful and respects reduced motion.
- [ ] Destructive actions require confirmation.
- [ ] Permissions are checked for protected actions.
