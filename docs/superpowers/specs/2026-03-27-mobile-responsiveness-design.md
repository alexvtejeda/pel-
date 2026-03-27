# Mobile Responsiveness Fixes

**Date:** 2026-03-27
**Briefs:** #7 (carousel overflow), #8 (grid footer gap), #9 (modal scroll conflict)
**Domain:** frontend

## Tasks

### Task 1: Landing hero — responsive right column

**File:** `components/landing/landing-page.tsx`

- Move `bg-muted`, `rounded-2xl`, `p-8`, `inset-shadow-[...]` behind `md:` prefixes so the card wrapper only renders on desktop
- Change `max-w-150` → `md:max-w-150` so the column fills available width on mobile
- Change LogoLoop bleed wrapper from `-mx-8 w-[calc(100%+4rem)]` to `md:-mx-8 md:w-[calc(100%+4rem)]`
- Add `overflow-hidden` on the hero `<section>` to prevent horizontal scroll

### Task 2: Carousel — dynamic container width

**File:** `components/landing/testimonial-carousel.tsx`

- Add a `ref` on the carousel's outer container div
- Use `ResizeObserver` in a `useEffect` to measure `clientWidth` and store in state
- Replace `style={{ width: '600px' }}` with `width: '100%'`
- Derive `itemWidth`, `trackItemOffset`, `centerOffset` from the measured width instead of `baseWidth`
- Keep `baseWidth` prop as initial fallback before first measurement
- Coverflow transforms stay unchanged — `useTransform` ranges recalculate automatically

### Task 3: Pet grid / Partners grid — remove footer gap

**Files:** `components/pets/pet-grid.tsx`, `components/aliados/provider-grid.tsx`

- Remove `min-h-screen` from the white card container div in both files
- `flex-1` on the grid + `min-h-screen` on the page wrapper is sufficient — the grid fills the viewport without forcing extra height

### Task 4: Modals — z-index above bottom nav

**File:** `components/ui/dialog.tsx`

- Bump `DialogOverlay` z-index: `z-50` → `z-60`
- Bump `DialogContent` z-index: `z-50` → `z-60`
- This fixes all Radix-based dialogs app-wide

### Task 5: Member add-pet modal — z-index and safe area

**File:** `components/pets/member-add-pet-modal.tsx`

- Bump overlay and modal container z-index above `z-50` (this is a custom modal, not Radix)
- Add mobile bottom padding (`pb-20 sm:pb-0`) or reduce `max-h` to `max-h-[calc(90vh-4rem)]` on mobile to clear the 64px bottom nav
- If mobile Safari still bleeds scroll, add `overscroll-behavior: contain` on the modal content

## No code changes needed

- **LogoLoop**: uses its own `ResizeObserver`; once the right column flows at full width on mobile it will animate normally
- **"How it works" section**: already responsive via `grid-cols-1 md:grid-cols-3`
- **MobileBottomNav**: stays at `z-50`; modals go above it
