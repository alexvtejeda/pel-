# Spec A: `/pets` Page Overhaul

**Date**: 2026-03-12
**Status**: Approved
**Scope**: Frontend only — `components/pets/`, `components/Carousel.tsx`, `components/ui/sheet.tsx`, `components/ui/drawer.tsx`

## Overview

Replace the current split-panel layout on `/pets` (fixed grid + 360px detail sidebar) with a full-width grid. Pet details open in a slide-in Sheet (desktop: right side) or Drawer (mobile: bottom). Unify carousel behavior across the app, add special condition card styling, add contextual dropdown menus on grid cards, and add skeleton loading.

## 1. Grid Layout Changes

### Current
- Grid: ~2/3 width, 3 columns (`grid-cols-2 lg:grid-cols-3`), constrained by 360px detail panel (`w-90`)
- Detail panel: fixed right sidebar, always visible on md+
- `selectedId` state in `PetsPage` highlights the active card in the grid

### New
- Grid expands to **full container width** (respects nav margins)
- **4 columns** on desktop (`lg:grid-cols-4`), 3 on md, 2 on mobile
- Detail panel removed entirely — replaced by Sheet/Drawer
- `selectedId` state preserved — used to highlight the active card while the Sheet/Drawer is open
- Cards remain `rounded-2xl`, `aspect-square`
- Grid gap and padding stay the same (`gap-2`, `p-2`)

### Files affected
- `components/pets/pets-page.tsx` — remove split layout, expand grid, wire Sheet/Drawer open state
- `components/pets/pet-detail.tsx` — move content into Sheet/Drawer wrapper
- `components/pets/pet-grid.tsx` — update grid columns from `lg:grid-cols-3` to `lg:grid-cols-4`

## 2. Sheet (Desktop) / Drawer (Mobile)

### Trigger
- User clicks a pet card in the grid → Sheet/Drawer opens with that pet's details

### Responsive switching
- Use a `useMediaQuery` hook (or Tailwind `md` breakpoint check) to determine viewport size
- **md+ (≥768px)**: render `Sheet` (from `components/ui/sheet.tsx`, Radix-based) — slides in from the **right**
- **below md**: render `Drawer` (from `components/ui/drawer.tsx`, Vaul-based) — slides up from the **bottom**
- Both share the same inner content component — only the wrapper differs

### Desktop — Sheet (right side)
- Slides in from the **right** (`side="right"`)
- Width: keep existing `sm:max-w-sm` (384px)
- Slide animation preserved (500ms open, 300ms close)
- Close via X button, clicking overlay, or pressing Escape
- **Fix**: replace `lucide-react` `X` icon import in `sheet.tsx` with Font Awesome `faXmark` (project rule: Font Awesome only)

### Mobile — Drawer (bottom)
- Slides up from the **bottom**
- Drag handle at top for pull-to-dismiss
- Sliding animation applied (Vaul handles this by default)

### Sheet/Drawer Content Layout
Top to bottom:
1. **Carousel** — CardCarousel with pet photos (see Section 3)
2. **Pet name** — h2
3. **Badges** — species, gender, age (existing badge style)
4. **Description** — paragraph text
5. **Condition alert** (if applicable) — amber background box with condition details
6. **Divider** — horizontal rule
7. **Rescue Center section**:
   - RC logo (40px, `rounded-xl`) + RC name + "Centro de rescate" subtitle
   - Website link (`faGlobe` icon, sized via `text-sm`/`text-base` etc.) — opens in new tab
   - Instagram link (`faInstagram` icon from `free-brands-svg-icons`, sized via `text-sm`/`text-base` etc.) — opens in new tab
8. **Action buttons**:
   - **Adoptar** button (primary, full width minus share button)
   - **Share** button (`faLink` icon) — copies `/p/{slug}` URL to clipboard, native share on mobile if available

### Rescue Center Data — Hard Blocker
The `Pet` interface currently only has `rescue_center_id` (string). It does **not** include RC name, logo, website, or Instagram. The public pet listing API must be updated to return a nested RC object:

```typescript
interface Pet {
  // ...existing fields...
  rescue_center?: {
    id: string
    name: string
    logo_url?: string
    website?: string
    instagram?: string
  }
}
```

**Note**: The `getPetForm` endpoint in `pets-public.ts` already returns `rc: { id, name, logo_url, city }` — this is a partial precedent. The public pet listing endpoint needs similar treatment, adding `website` and `instagram`.

This is a **backend change** that must be completed before Sections 2 and 5 can fully work. Tracked in Spec D.

### Files affected
- `components/ui/sheet.tsx` — replace lucide-react `X` with `faXmark`
- `components/pets/pets-page.tsx` — add Sheet/Drawer wrapper with responsive switching
- `components/pets/pet-detail.tsx` — refactor as inner content component for Sheet/Drawer
- `lib/api/pets.ts` — extend `Pet` interface with nested `rescue_center` object

## 3. Carousel Unification

### Current state
- **Dashboard (`pets-tab.tsx`)**: `CardCarousel` — auto-rotates every 3s, dot indicators, no prev/next arrows
- **Pet detail (`pet-detail.tsx`)**: Manual carousel with prev/next arrow buttons on hover, dot indicators, no auto-rotate

### New behavior — consistent everywhere
- Use `CardCarousel` pattern in both dashboard cards and the pet detail Sheet
- **Auto-rotate**: ON by default, 3-second interval
- **Pause/play toggle**: Add a `showPauseButton` prop to the `Carousel` component. When enabled, render a small play/pause icon button (e.g., `faPlay`/`faPause`) in the top-right corner of the carousel. Clicking toggles internal `autoplay` state.
- **Dot indicators**: Overlaid at bottom, clickable to jump to specific photo
- **No prev/next arrow buttons**
- Same component used in dashboard grid cards and Sheet/Drawer

### Files affected
- `components/Carousel.tsx` — add `showPauseButton` prop, internal pause state, play/pause icon button
- `components/pets/pet-detail.tsx` — replace arrow-based carousel with CardCarousel
- `components/dashboard/rescue-center/pets-tab.tsx` — pass `showPauseButton` to existing CardCarousel

## 4. Special Condition Card Styling (Option A — Amber Tint)

### Current
- Dashboard: amber badge text "Condición especial" (`bg-amber-100 text-amber-700`)
- `/pets` grid: no condition indicator on cards

### New — applied to BOTH dashboard and `/pets` grid
- Cards for pets with `conditions.length > 0`:
  - **Background**: light amber tint (`bg-amber-50` or similar)
  - **Border**: `border-2 border-amber-400`
  - **Badge**: existing "Condición especial" text badge preserved
- Normal cards remain unchanged
- Dashboard grid uses `grid-cols-2 md:grid-cols-3 lg:grid-cols-4`; `/pets` grid uses `grid-cols-2 md:grid-cols-3 lg:grid-cols-4` — same responsive behavior after this change

### Files affected
- `components/dashboard/rescue-center/pets-tab.tsx` — add conditional card classes
- `components/pets/pet-grid.tsx` — add conditional card classes + condition badge (same style)

## 5. Three-Dots Dropdown on Grid Cards

### Trigger
- Three-dots button (`faEllipsis`) in **top-right corner** of each pet card
- **Desktop**: visible on card hover
- **Mobile**: always visible

### Dropdown Items (using shadcn `DropdownMenu`)
All icons from Font Awesome, sized via `text-*` classes (Font Awesome icons are fonts — use `text-sm`, `text-base`, `text-lg` etc. for sizing):

1. **`faLink`** — "Compartir enlace" — copies `/p/{slug}` to clipboard (or native share on mobile)
2. **`faGlobe`** — "Visitar sitio web de {RC name}" — opens RC website in new tab (only if RC has website)
3. **`faInstagram`** — "Visitar Instagram de {RC name}" — opens RC Instagram in new tab (only if RC has Instagram)

### Notes
- Items 2 and 3 only appear if the RC has a website/Instagram URL respectively
- `faInstagram` imported from `@fortawesome/free-brands-svg-icons`
- Depends on RC data being available on the `Pet` object (Section 2 blocker)

### Files affected
- `components/pets/pet-grid.tsx` — add DropdownMenu to each card

## 6. Skeleton Loading

### When
- While pet data is being fetched on `/pets` page load or filter change

### Current loading state
- `pet-grid.tsx` currently shows a simple pulsing paw icon with "Cargando mascotas..." text
- This will be **replaced** by skeleton cards

### Appearance
- **Card-shaped skeletons** in the full 4-column grid layout
- Each skeleton card: `rounded-2xl`, `aspect-square`, pulsing/shimmer animation
- Below image area: small skeleton bars for name and metadata text
- Show 8-12 skeleton cards (fills viewport)

### Implementation
- Use Tailwind's `animate-pulse` on placeholder `div` elements with `bg-muted` backgrounds
- Replace skeletons with real cards once data arrives
- No progressive loading — all cards appear together

### Files affected
- `components/pets/pet-grid.tsx` — replace existing loading indicator with skeleton grid

## 7. Share for All Users

### Current state
- Share button exists in `pet-detail.tsx`, already works without auth
- Copies `/p/{slug}` URL to clipboard

### Confirmation
- No changes needed to the share logic itself
- Share button will be present in the new Sheet (Section 2) and in the dropdown menu (Section 5)
- No authentication check for sharing

## 8. i18n Keys

New UI text needed in `public/locales/{es,en}/pets.json`:

| Key | Spanish | English |
|-----|---------|---------|
| `card.share` | Compartir enlace | Share link |
| `card.visitWebsite` | Visitar sitio web de {{name}} | Visit {{name}}'s website |
| `card.visitInstagram` | Visitar Instagram de {{name}} | Visit {{name}}'s Instagram |
| `detail.rescueCenter` | Centro de rescate | Rescue center |
| `detail.specialCondition` | Condición especial | Special condition |

Existing keys for adopt, share feedback ("Enlace copiado"), and filter pills remain unchanged.

## Dependencies

- **Backend (hard blocker for Sections 2, 5)**: Public pet listing API must return nested rescue center data (name, logo_url, website, instagram). The `getPetForm` endpoint already returns partial RC data — the listing endpoint needs the same treatment. Tracked in Spec D.
- **shadcn Drawer**: Already imported (`components/ui/drawer.tsx`, `vaul` package installed).
- **Sheet lucide-react fix**: `components/ui/sheet.tsx` imports `X` from `lucide-react` — must be replaced with `faXmark` from Font Awesome.

## Out of Scope
- Backend field additions (castrated, vaccinated, size, age logic) — Spec D
- Dashboard search/filters — Spec C
- Onboarding/role changes — Spec B
