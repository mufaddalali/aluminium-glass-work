---
name: design-tokens-governance
description: Govern design tokens for a CMS design system: semantic colors, typography, spacing, radius, shadow, density, state colors, dark mode, Tailwind theme usage, and arbitrary-value rules. Use when adding or changing tokens, theme config, component variants, or visual standards.
---

# Design Tokens Governance Skill

## Purpose
Keep visual decisions tokenized, semantic, accessible, and stable across the CMS.

## Core Rules
- Follow DESIGN.md before anything else. Token source of truth is `src/app/globals.css`.
- Prefer semantic tokens over raw colors and arbitrary values.
- Use an 8px spacing rhythm (4/8 multiples). Prefer breathable admin spacing over cramped layouts.
- Keep radius choices consistent: controls/buttons `rounded-md` (4–6px), cards `rounded-xl` (16px). Prefer square Mintlify geometry over pills.
- Shadows: `--shadow-xs/sm/md/lg` and `--shadow-primary` only — whispered elevation; prefer 1px borders when enough.
- Define light and dark values together.
- Primary green is for actions/active states only; accent red for badges/destructive; neutrals carry the UI.
- Check contrast for text, icons, borders, focus rings, and status badges.
- Add tokens only when multiple components need the value or a semantic state requires it.
- Prefer shared utilities (`surface-card`, `surface-glass`, `interactive-lift`) over duplicating recipes.

## Token Categories
- Color: background, foreground, card, muted, border, ring, primary (`#0B7A45`), secondary, accent (`#D62027`), destructive, success, warning, info, glass.
- Typography: family (Plus Jakarta), size, weight, heading/body/caption roles per DESIGN.md hierarchy.
- Spacing: page, section, stack, inline, control, table density (8px rhythm); card padding 20–24px.
- Radius: sm/md for controls/tags; xl (16px) for cards.
- Shadow: xs/sm/md/lg + primary glow for elevated CTAs.
- Motion: ~150–180ms ease for controls; GSAP for page/section enters; reduced-motion alternatives.

## Checklist
- [ ] Token name describes meaning, not appearance
- [ ] Light and dark mode values exist
- [ ] Contrast is AA or better for text
- [ ] Arbitrary Tailwind values avoided or justified
- [ ] Token is reused by component variants
- [ ] Existing palette does not become one-note or over-accented
