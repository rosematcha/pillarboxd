# Agent guide

Instructions for AI agents working on pillarboxd.

## Design system

pillarboxd has a dialed-in visual system. **Read these before any UI work:**

| Artifact         | Path                          | Purpose                                                                                 |
| ---------------- | ----------------------------- | --------------------------------------------------------------------------------------- |
| Product context  | `PRODUCT.md`                  | Users, personality, principles, anti-references, a11y (register: `product`)             |
| Design spec      | `DESIGN.md`                   | OKLCH tokens, typography, spacing, components, motion, bans                             |
| Visual reference | `.scratch/design-system.html` | Self-contained HTML preview: open in a browser to see real components and page sketches |

`PRODUCT.md`, `DESIGN.md`, and `.scratch/` are gitignored (local context only). `AGENTS.md` is committed so agents know where to look.

**Source of truth:** `DESIGN.md` for token names and rules; `.scratch/design-system.html` for how things should look. If they disagree, match the HTML preview and update `DESIGN.md`.

### Selected decisions (do not re-litigate)

- **Theme:** dark-first; light via `prefers-color-scheme`
- **Font:** Schibsted Grotesk (Google Fonts)
- **Accent trio:** pink (brand/actions/links), gold (stars only), sage (watched/watchlist)
- **Nav:** plain lowercase `pillarboxd` text, weight 650. No logo or pillarbox motif
- **Spacing:** semantic gap tokens (`gap-tight` through `gap-step`); prefer flex/grid `gap` over one-off margins
- **Texture:** subtle film grain + ambient color wash on page background (see HTML preview)

### Bans

No cards, shadows, eyebrow labels, side-stripe borders, gradient text, glassmorphism, hero-metric blocks, pill buttons, em dashes in copy, or Letterboxd palette mimicry. Posters are the color; chrome stays quiet.

### Implementing tokens in the app

Stack: React Router 8, Tailwind CSS v4 (`@theme` in `app/app.css`), TypeScript.

1. **Encode tokens** in `app/app.css` inside `@theme { }`:
   - Colors as `--color-*` (e.g. `--color-bg`, `--color-accent`) mapped from DESIGN.md OKLCH values
   - Font: `--font-sans: "Schibsted Grotesk", ...`
   - Spacing: expose `gap-tight` … `gap-step` as `--spacing-*` or use Tailwind spacing scale consistently
   - Radius: `--radius-control` (4px), `--radius-poster` (2px)
2. **Load Schibsted Grotesk** in `app/root.tsx` `links()` (replace Inter)
3. **Base styles** on `html`/`body`: theme backgrounds, grain/wash (CSS or pseudo-element), `color-scheme`, focus-visible rings
4. **Dark/light:** use Tailwind `dark:` with `prefers-color-scheme` (current pattern in `app.css`) or CSS custom properties that flip per theme

Use semantic Tailwind classes (`bg-bg`, `text-muted`, `border-border`, `text-accent`) rather than raw gray/pink utilities.

### Shared components

Build under `app/components/`. Match `.scratch/design-system.html` behavior and states (default, hover, focus-visible, active, disabled, loading).

| Component                      | Notes                                                                    |
| ------------------------------ | ------------------------------------------------------------------------ |
| `Nav`                          | Refactor existing `nav.tsx`; search field, auth links, pink active state |
| `Button`                       | primary / secondary / destructive + loading                              |
| `Input`, `Field`, `FieldError` | hairline borders, inline validation                                      |
| `Dropzone`                     | dashed border, accent on dragover                                        |
| `StarRating`                   | gold, half-stars, accessible text equivalent                             |
| `PosterTile`                   | 2:3, 2px radius, hover title reveal                                      |
| `DiaryTable`                   | table semantics, tabular nums                                            |
| `ActivityItem`                 | avatar, verb sentence, poster thumb                                      |
| `ImportFlow`                   | numbered inline steps; extract from `letterboxd-import.tsx`              |
| `SiteFooter`                   | federation line + TMDB attribution                                       |
| `EmptyState`                   | one sentence + one CTA                                                   |

Prefer composing pages from these instead of inline Tailwind soup.

### Layout conventions

- Prose/forms: `max-w-[42rem]` (~672px)
- Poster grids / diary tables: `max-w-[64rem]`
- Body copy: `max-w-[70ch]`
- Import flow: numbered steps with `gap-step` between steps, `gap-tight` within result groups (see HTML preview Results section)

### Copy

Plain words, no marketing voice. Federation explained simply. No em dashes. Run new user-facing copy through the stop-slop skill if available.

### Verification

After UI changes:

1. `pnpm check` (typecheck, lint, format, knip, test)
2. Visual check in browser: dark and light
3. Confirm bans list (no cards/shadows/eyebrows)
4. Spot-check focus rings and contrast on accent-on-surface pairs

Work in small PR-sized units; do not restyle the entire app in one commit unless explicitly asked.

## Repo commands

```bash
pnpm dev          # local dev server
pnpm check        # typecheck + lint + format + knip + test
pnpm test         # vitest
```

## React Router

See `.agents/skills/react-router/SKILL.md` for route modules, loaders, actions, and forms.
