# Lean Canvas — Expandable Scene 6 Design

**Date:** 2026-04-13
**Scope:** About page, Scene 06 (Lean Canvas)
**Reference behavior:** https://www.worldquantfoundry.com/ (Foundations section)
**Target layout:** Facebook lean canvas reference (5-col top block with stacked middle columns + 2-col bottom block)

## Goal

Replace the current grid-based scene 6 with a gapless, hover/focus-expandable lean canvas. Cells "glue" together with no gaps; hovering, focusing, or clicking a cell expands it in place while neighbors shrink. Clicking a cell locks it expanded for focused reading (presentation mode).

## Layout

Two stacked flex rows inside the scene container:

```
┌────────┬────────┬────────┬────────┬────────┐
│        │ Actv.  │        │ Rel.   │        │
│ Socios │────────│  VP    │────────│ Segm.  │   (top row — 5 cols, middle cols stacked 1:1)
│        │ Rec.   │        │ Canal. │        │
├────────┴────────┼────────┴────────┴────────┤
│   Costos (2fr)  │      Ingresos (3fr)      │   (bottom row — 2 cols, 2:3)
└─────────────────┴──────────────────────────┘
```

- All cells share borders via `margin: -0.5px` (true gapless — borders collapse into a single 1px line).
- Top row fixed height (e.g. `60vh` capped at `32rem`); bottom row shorter (e.g. `20vh`).

## Data model

Replace the flat `LeanCanvasBlock[]` in `lib/about/lean-canvas-content.ts` with a nested structure:

```ts
export type LeanCanvasBlock = {
  id: string
  title: string
  shortText: string
  fullText: string
}

export type LeanCanvasColumn = {
  id: string
  cells: LeanCanvasBlock[]   // length 1 (single) or 2 (stacked)
  weight?: number            // flex-grow baseline (default 1) — used for bottom row 2:3
}

export type LeanCanvas = {
  top: LeanCanvasColumn[]    // 5 columns
  bottom: LeanCanvasColumn[] // 2 columns with weights 2 and 3
}

export const LEAN_CANVAS: LeanCanvas = { /* populated with existing content */ }
```

The existing `col`/`row` fields are removed. All 9 blocks (socios, actividades, recursos, propuesta, relacion, canales, segmentos, costos, ingresos) are repositioned into the nested shape.

## Hover, focus, and lock behavior

**Base transition layer (pure CSS):**
- Columns: `flex: 1 1 0` baseline. Bottom row overrides with `flex: <weight> 1 0`.
- Cells within a stacked column: `flex: 1 1 0`.
- Column widens on `:hover` OR `:has(.lc-cell:hover)` OR `:has(.lc-cell:focus-visible)` OR `:has(.lc-cell[data-locked="true"])` → `flex-grow: var(--lc-expand-ratio, 3)`.
- Cell widens within its column on `:hover` OR `:focus-visible` OR `[data-locked="true"]` → `flex-grow: var(--lc-expand-ratio, 3)`.
- Text swap: `.short` fades out; `.full` fades in + expands max-height.

**Click-to-lock (JS state):**
- Component holds `lockedId: string | null`.
- Click a cell → `setLockedId(id)`. Click the same cell again → `setLockedId(null)`.
- Click a different cell → `setLockedId(newId)` (only one lock at a time).
- Escape key → clear lock.
- Click outside the grid → clear lock.
- Scene leaves the viewport (IntersectionObserver) → clear lock.
- The locked cell gets `data-locked="true"` and `aria-pressed="true"`. Hovering other cells still visually overrides (hover wins for the hovered cell while the mouse is over it).

**Keyboard & a11y:**
- Each cell is a real `<button type="button">` with `aria-pressed` reflecting lock state and an accessible name derived from the cell title.
- Tab order follows DOM order (top row left→right, then bottom row).
- `:focus-visible` triggers the same expansion as `:hover`.
- `.full` text is always rendered in the DOM; visual hiding is via `opacity`/`max-height`, not `display: none` or conditional render. Screen readers get everything regardless of hover state.

**Tunable knobs (CSS custom properties on `[data-scene="06-lean-canvas"]`):**

| Property              | Default                       | Controls                                 |
| --------------------- | ----------------------------- | ---------------------------------------- |
| `--lc-expand-ratio`   | `3`                           | flex-grow multiplier for expanded cell   |
| `--lc-expand-duration`| `500ms`                       | flex-grow transition                     |
| `--lc-expand-easing`  | `cubic-bezier(.2,.8,.2,1)`    | motion curve                             |
| `--lc-color-duration` | `300ms`                       | background/border/shadow fade            |
| `--lc-text-fade-in`   | `300ms`                       | `.full` opacity fade-in                  |
| `--lc-text-fade-out`  | `150ms`                       | `.short` opacity fade-out                |
| `--lc-text-expand`    | `400ms`                       | `.full` max-height expand                |

## Files

**New:**
- `components/about/lean-canvas-grid.tsx` — interactive grid. Renders the nested `row → col → cell` structure, holds `lockedId` state, wires Escape/click-outside/IntersectionObserver listeners.
- `components/about/lean-canvas-grid.module.css` — plain CSS module with the `:has()`, `:hover`, `:focus-visible`, `[data-locked]`, and `@media (prefers-reduced-motion: reduce)` rules. Using a CSS module rather than Tailwind because `:has()` and the text-swap logic are painful as Tailwind arbitrary variants.

**Modified:**
- `lib/about/lean-canvas-content.ts` — restructure to `LeanCanvas` nested shape; drop flat `col`/`row` fields. Content strings unchanged.
- `components/about/scenes/scene-06-lean-canvas.tsx` — becomes thin. Provides scene heading + overline, mounts `<LeanCanvasGrid />` on desktop, stacked fallback list on mobile. Drops `useState`, `framer-motion`, and the current grid rendering.

**Deleted:**
- framer-motion import in scene 6.
- `useState<string | null>(hoveredId)` and associated `onMouseEnter`/`onMouseLeave` props.
- Flat `col: 1..5 / row: 1..2` positioning logic.

## Mobile fallback

Below the `md` breakpoint (detected via existing `useIsDesktop` hook), render a vertical stacked list — each card always shows `fullText`, no hover, no lock, no `:has()`. `LeanCanvasGrid` component simply isn't mounted on mobile. This matches the current scene 6 mobile behavior.

## Reduced motion

Within `@media (prefers-reduced-motion: reduce)`:
- All transitions on `flex-grow`, `opacity`, `max-height`, `background-color`, `border-color`, `box-shadow` are set to `none` or `0ms`.
- `.full` text is always visible, `.short` always hidden — no fade swap.
- Click-to-lock still functions (instant toggle, not an animation).
- The expansion ratio still applies on hover/focus/lock — just without tweening.

## Scrollytelling coupling

Scene 6 is a static section (no GSAP pin). The lean canvas grid does not register a ScrollTrigger. The only scroll-related hook is an `IntersectionObserver` that clears `lockedId` when the scene exits the viewport, so returning to the scene starts fresh.

## Browser support

- `:has()` required for the column-widens-when-child-hovered behavior. Available in Chrome 105+, Safari 15.4+, Firefox 121+. Fallback: cells still grow individually within their column; only the parent-column widen is lost.
- CSS modules already used elsewhere (`components.json`, shadcn pattern).

## Testing

New test file: `components/__tests__/about/lean-canvas-grid.test.tsx`

Cases:
1. Renders all 9 lean canvas cells, each with its title and `fullText` present in the DOM.
2. Each cell is a `<button type="button">` with an accessible name.
3. Clicking a cell sets `aria-pressed="true"` on that cell and clears it from any other.
4. Clicking the same locked cell a second time clears `aria-pressed`.
5. Pressing `Escape` while a cell is locked clears the lock.
6. Clicking outside the grid (e.g. on the scene heading) clears the lock.

Existing `scene-06-lean-canvas.test.tsx` smoke test (if present) is updated to read from the new data shape and verify the component still mounts without errors.

## Out of scope

- No server-side data — `LEAN_CANVAS` stays as a local const.
- No i18n for this iteration — content stays Spanish-only, same as current scene 6.
- No animation on initial scroll-in (unlike scene 4). The grid renders static; the hover/lock behavior is the interactive layer.
- No URL sync of `lockedId` — ephemeral state only.
