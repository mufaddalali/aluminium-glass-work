---
name: design-system
description: Build and maintain the CMS design system: tokens, primitives, component variants, dark mode, motion, responsive behavior, accessibility states, and reusable UI composition. Use when creating or changing shared UI, theme rules, layout primitives, or visual conventions.
---

# Design System Skill

## Purpose
Design tokens, primitives, typography, colors, radii, shadows, motion, responsive breakpoints, dark mode, and reusable CMS UI.

## Core Rules
- Follow DESIGN.md **Visual Language (Institutional Mint)** before anything else.
- Target feel: Mintlify-style monochrome + BGTP logo green/red — calm, institutional CMS (not marketing showcase UI).
- Use semantic tokens and globals utilities (`surface-card`, `surface-glass`, `interactive-lift`, `skeleton-shimmer`) before raw Tailwind values.
- Keep shared components unopinionated about feature data.
- Define component APIs with explicit variants, sizes, states, and slots.
- Include focus, hover, active, disabled, loading, error, empty, and destructive states where relevant.
- Support mobile layouts, dense admin screens, dark mode, and keyboard navigation.
- Prefer composition over large prop-driven components when behavior varies.
- Keep visual language restrained, scannable, and suited to repeated admin work.
- Preserve functionality/API/business logic when polishing UI.

## Component Requirements
- Expose predictable `className` escape hatches.
- Use accessible labels, roles, aria attributes, and visible focus rings.
- Avoid arbitrary spacing/color values unless a token does not exist and the reason is clear.
- Prefer hairline borders + soft elevation; avoid nested card clutter and pill geometry.
- Buttons: `rounded-md`, short transitions; primary brand green + soft shadow; use `loading` prop for API submits (`components/ui/button`).
- Badges: square tags (`rounded-sm`), uppercase micro labels; tones include default/success/warning/info/accent/destructive/muted/outline.
- Tables: sticky header, row hover, elevated container, skeleton/empty/error support.
- Icons: Lucide only, consistent sizing.
- Use icons for common actions and pair destructive actions with confirmation patterns.
- Shell: fixed header; desktop sidebar always open; mobile drawer only.

## Checklist
- [ ] Tokens / surface utilities used instead of one-off values
- [ ] Typography hierarchy matches DESIGN.md
- [ ] Light and dark modes covered
- [ ] Variants and states clear through props
- [ ] Keyboard and screen reader behavior handled
- [ ] Mobile and large-desktop layouts considered
- [ ] Motion respects reduced motion
- [ ] No feature-specific business logic inside shared UI
