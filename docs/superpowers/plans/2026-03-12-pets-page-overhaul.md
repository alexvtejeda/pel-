# Pets Page Overhaul — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the split-panel `/pets` layout with a full-width 4-column grid where pet details open in a Sheet (desktop) or Drawer (mobile), unify carousel behavior, add condition styling, dropdown menus, and skeleton loading.

**Architecture:** Remove the fixed 360px detail sidebar from `PetsPage`. Pet selection opens a responsive Sheet/Drawer containing the detail content. A `useMediaQuery` hook switches between Sheet (md+) and Drawer (below md). The `Carousel` component gets a pause/play toggle. Grid cards get amber condition styling and a three-dots dropdown menu.

**Tech Stack:** Next.js 16 (App Router), React 19, TailwindCSS v4, shadcn/ui (Sheet, Drawer, DropdownMenu), motion/react, Font Awesome 6

**Spec:** `docs/superpowers/specs/2026-03-12-pets-page-overhaul-design.md`

**Note:** Sections 2 (RC info in Sheet) and 5 (RC links in dropdown) depend on a backend change (Spec D) to return nested rescue center data on the Pet object. This plan stubs the RC section with available data and marks RC-dependent items. They will render properly once the backend is updated.

---

## File Map

| Action | File | Responsibility |
|--------|------|---------------|
| Create | `lib/hooks/use-media-query.ts` | `useMediaQuery` hook for responsive Sheet/Drawer switching |
| Modify | `components/ui/sheet.tsx` | Replace lucide-react `X` with FA `faXmark` |
| Modify | `lib/api/pets.ts` | Add optional `rescue_center` nested object to `Pet` interface |
| Modify | `components/Carousel.tsx` | Add `showPauseButton` prop with play/pause toggle |
| Modify | `components/pets/pet-grid.tsx` | 4-col grid, skeleton loading, condition styling, three-dots dropdown |
| Modify | `components/pets/pet-detail.tsx` | Refactor as Sheet/Drawer inner content (remove arrow carousel, use CardCarousel, add RC section, share button) |
| Modify | `components/pets/pets-page.tsx` | Remove split layout, add responsive Sheet/Drawer wrapper |
| Modify | `components/dashboard/rescue-center/pets-tab.tsx` | Add condition card styling (amber tint), pass `showPauseButton` to CardCarousel |
| Modify | `public/locales/es/pets.json` | Add new i18n keys |
| Modify | `public/locales/en/pets.json` | Add new i18n keys |

---

## Chunk 1: Foundation (Sheet fix, hook, Pet interface, i18n)

### Task 1: Fix lucide-react import in Sheet

**Files:**
- Modify: `components/ui/sheet.tsx:6-7, 68`

- [ ] **Step 1: Replace lucide-react X with FA faXmark**

In `components/ui/sheet.tsx`:
- Remove: `import { X } from "lucide-react"` (line 6)
- Add: `import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'` and `import { faXmark } from '@fortawesome/free-solid-svg-icons'`
- Replace the `<X className="h-4 w-4" />` (line 68) with `<FontAwesomeIcon icon={faXmark} className="text-base" />`

- [ ] **Step 2: Verify no other lucide-react imports remain**

Run: `grep -r "lucide-react" components/ui/sheet.tsx`
Expected: no matches

- [ ] **Step 3: Commit**

```bash
git add components/ui/sheet.tsx
git commit -m "fix: replace lucide-react X with FA faXmark in Sheet component"
```

---

### Task 2: Create useMediaQuery hook

**Files:**
- Create: `lib/hooks/use-media-query.ts`

- [ ] **Step 1: Create the hook**

```typescript
import { useState, useEffect } from 'react'

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    const mql = window.matchMedia(query)
    setMatches(mql.matches)
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [query])

  return matches
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/hooks/use-media-query.ts
git commit -m "feat: add useMediaQuery hook for responsive component switching"
```

---

### Task 3: Extend Pet interface with optional rescue_center

**Files:**
- Modify: `lib/api/pets.ts:11-24`

- [ ] **Step 1: Add RescueCenter type to Pet interface**

After the `Photo` interface, add:

```typescript
export interface PetRescueCenter {
  id: string
  name: string
  logo_url?: string
  website?: string
  instagram?: string
}
```

Then add to the `Pet` interface:

```typescript
rescue_center?: PetRescueCenter
```

This is optional — it won't break existing code. Once the backend returns the nested object, it will be automatically available.

- [ ] **Step 2: Commit**

```bash
git add lib/api/pets.ts
git commit -m "feat: add optional rescue_center to Pet interface (pending backend)"
```

---

### Task 4: Add i18n keys

**Files:**
- Modify: `public/locales/es/pets.json`
- Modify: `public/locales/en/pets.json`

**Note:** `detail.share` and `detail.link_copied` already exist in both locale files. Only add the truly new keys listed below.

- [ ] **Step 1: Add new keys to Spanish locale**

Add these keys to `public/locales/es/pets.json`:

In the `card` section, add:
```json
"share": "Compartir enlace",
"visitWebsite": "Visitar sitio web de {{name}}",
"visitInstagram": "Visitar Instagram de {{name}}"
```

In the `detail` section, add:
```json
"rescueCenter": "Centro de rescate",
"specialCondition": "Condición especial"
```

- [ ] **Step 2: Add new keys to English locale**

Add matching keys to `public/locales/en/pets.json`:

In the `card` section, add:
```json
"share": "Share link",
"visitWebsite": "Visit {{name}}'s website",
"visitInstagram": "Visit {{name}}'s Instagram"
```

In the `detail` section, add:
```json
"rescueCenter": "Rescue center",
"specialCondition": "Special condition"
```

- [ ] **Step 3: Commit**

```bash
git add public/locales/es/pets.json public/locales/en/pets.json
git commit -m "feat: add i18n keys for pet card dropdown and detail sheet"
```

---

## Chunk 2: Carousel Pause/Play Toggle

### Task 5: Add showPauseButton prop to Carousel

**Files:**
- Modify: `components/Carousel.tsx:15-26, 128-139, 168-178`

- [ ] **Step 1: Add showPauseButton to CarouselProps**

In `CarouselProps` interface, add:
```typescript
showPauseButton?: boolean
```

- [ ] **Step 2: Add internal paused state and toggle to Carousel component**

Inside the `Carousel` default export function:
1. Add state: `const [paused, setPaused] = useState(false)`
2. Modify the autoplay effect (around line 169): add `if (paused) return undefined;` as the first check after `if (!autoplay || itemsForRender.length <= 1) return undefined;`
3. Add `paused` to the effect's dependency array

- [ ] **Step 3: Render pause/play button**

After the dots `<div>` section (around line 303-325), inside the container but before the closing `</div>`, add:

```tsx
{showPauseButton && items.length > 1 && (
  <button
    type="button"
    onClick={() => setPaused(p => !p)}
    className="absolute top-2 right-2 z-10 w-7 h-7 rounded-full bg-black/50 flex items-center justify-center hover:bg-black/70 transition-colors"
  >
    <FontAwesomeIcon
      icon={paused ? faPlay : faPause}
      className="text-white text-xs"
    />
  </button>
)}
```

Add imports at the top:
```typescript
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPause, faPlay } from '@fortawesome/free-solid-svg-icons'
```

- [ ] **Step 4: Verify it compiles**

Check the dev server for errors on any page using the Carousel.

- [ ] **Step 5: Commit**

```bash
git add components/Carousel.tsx
git commit -m "feat: add pause/play toggle button to Carousel component"
```

---

### Task 6: Pass showPauseButton in dashboard CardCarousel

**Files:**
- Modify: `components/dashboard/rescue-center/pets-tab.tsx:46-79`

- [ ] **Step 1: Update CardCarousel to accept and forward showPauseButton**

In the `CardCarousel` function (line 46), change the props to:
```typescript
function CardCarousel({ urls, showPauseButton }: { urls: string[]; showPauseButton?: boolean })
```

Pass `showPauseButton` to the `<Carousel>` component:
```tsx
<Carousel
  items={items}
  baseWidth={width}
  autoplay={urls.length > 1}
  autoplayDelay={3000}
  pauseOnHover
  loop={urls.length > 1}
  containerPadding={0}
  dotsOverlay
  showPauseButton={showPauseButton}
  className="relative overflow-hidden w-full h-full"
/>
```

- [ ] **Step 2: Pass showPauseButton in pet card usage**

In the grid card where `<CardCarousel>` is rendered (around line 485):
```tsx
<CardCarousel urls={pet.photos.map((p) => p.url)} showPauseButton />
```

- [ ] **Step 3: Commit**

```bash
git add components/dashboard/rescue-center/pets-tab.tsx
git commit -m "feat: enable pause/play toggle on dashboard pet card carousels"
```

---

## Chunk 3: Grid Layout, Skeleton, and Condition Styling

### Task 7: Update pet-grid.tsx — 4-column grid + skeleton loading + condition styling + dropdown

**Files:**
- Modify: `components/pets/pet-grid.tsx`

This is the largest single task. It touches the grid columns, loading state, card styling, and adds the dropdown menu.

- [ ] **Step 1: Update grid columns**

Change `grid-cols-2 lg:grid-cols-3` to `grid-cols-2 md:grid-cols-3 lg:grid-cols-4` (line 107).

Also update the `sizes` attribute on the `<Image>` component from `sizes="(max-width: 768px) 50vw, 33vw"` to `sizes="(max-width: 768px) 50vw, 25vw"` to match the new 4-column layout.

- [ ] **Step 2: Replace loading indicator with skeleton cards**

Replace the loading block (lines 86-91) with skeleton cards:

```tsx
{loading && (
  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
    {Array.from({ length: 8 }).map((_, i) => (
      <div key={i} className="rounded-2xl overflow-hidden bg-secondary animate-pulse">
        <div className="aspect-square bg-muted" />
        <div className="p-2 space-y-1.5">
          <div className="h-3.5 bg-muted rounded w-2/3" />
          <div className="h-3 bg-muted rounded w-1/3" />
        </div>
      </div>
    ))}
  </div>
)}
```

- [ ] **Step 3: Add condition amber tint styling to cards**

On the card `<button>` (line 112), add amber styling when `pet.conditions?.length > 0`:

```tsx
className={`relative group rounded-2xl overflow-hidden aspect-square transition-all ${
  pet.conditions?.length > 0
    ? 'bg-amber-50 border-2 border-amber-400'
    : 'bg-secondary'
} ${
  selectedId === pet.id
    ? 'outline outline-[2.5px] outline-pop-550'
    : 'hover:outline hover:outline-2 hover:outline-border'
}`}
```

Also add a condition badge inside the card, below the name overlay:

```tsx
{pet.conditions?.length > 0 && (
  <div className="absolute top-2 left-2">
    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
      {t('detail.specialCondition')}
    </span>
  </div>
)}
```

- [ ] **Step 4: Add three-dots dropdown menu**

Add imports at the top of the file:
```typescript
import { faEllipsis, faLink, faGlobe } from '@fortawesome/free-solid-svg-icons'
import { faInstagram } from '@fortawesome/free-brands-svg-icons'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
```

Inside each card `<button>` (which needs to become a `<div>` since we'll have nested buttons), add the dropdown in the top-right corner:

**Important:** Change the outer `<button>` to a `<div>` with `role="button"` and `tabIndex={0}` and an `onClick` handler, to avoid nested `<button>` elements.

Then add inside the card, after the name overlay:

```tsx
{/* Three-dots dropdown */}
<div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 md:opacity-0 md:group-hover:opacity-100 max-md:opacity-100 transition-opacity"
  onClick={(e) => e.stopPropagation()}
>
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <button className="w-7 h-7 rounded-full bg-black/50 flex items-center justify-center hover:bg-black/70 transition-colors">
        <FontAwesomeIcon icon={faEllipsis} className="text-white text-sm" />
      </button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      {pet.short_slug && (
        <DropdownMenuItem onClick={() => handleShare(pet)}>
          <FontAwesomeIcon icon={faLink} className="text-sm" />
          {t('card.share')}
        </DropdownMenuItem>
      )}
      {pet.rescue_center?.website && (
        <DropdownMenuItem onClick={() => window.open(pet.rescue_center!.website!, '_blank')}>
          <FontAwesomeIcon icon={faGlobe} className="text-sm" />
          {t('card.visitWebsite', { name: pet.rescue_center.name })}
        </DropdownMenuItem>
      )}
      {pet.rescue_center?.instagram && (
        <DropdownMenuItem onClick={() => window.open(pet.rescue_center!.instagram!, '_blank')}>
          <FontAwesomeIcon icon={faInstagram} className="text-sm" />
          {t('card.visitInstagram', { name: pet.rescue_center.name })}
        </DropdownMenuItem>
      )}
    </DropdownMenuContent>
  </DropdownMenu>
</div>
```

Add a `handleShare` function inside `PetGrid`:

```typescript
const handleShare = async (pet: Pet) => {
  if (!pet.short_slug) return
  const url = `${window.location.origin}/p/${pet.short_slug}`
  if (navigator.share) {
    try { await navigator.share({ url }) } catch { /* cancelled */ }
  } else {
    try { await navigator.clipboard.writeText(url) } catch { /* fallback */ }
  }
}
```

- [ ] **Step 5: Verify the grid renders correctly in the browser**

Check `/pets` page — should show 4 columns on lg, 3 on md, 2 on mobile. Skeleton cards should appear during loading. Cards with conditions should have amber tint. Dropdown should appear on hover.

- [ ] **Step 6: Commit**

```bash
git add components/pets/pet-grid.tsx
git commit -m "feat: 4-col grid, skeleton loading, amber condition cards, three-dots dropdown"
```

---

### Task 8: Add condition amber tint to dashboard cards

**Files:**
- Modify: `components/dashboard/rescue-center/pets-tab.tsx:480-481`

- [ ] **Step 1: Add amber styling to dashboard pet cards**

On the card `<motion.div>` (line 480), change:
```tsx
className="rounded-2xl border bg-card overflow-hidden shadow-xs"
```
to:
```tsx
className={`rounded-2xl overflow-hidden shadow-xs ${
  pet.conditions?.length > 0
    ? 'bg-amber-50 border-2 border-amber-400'
    : 'border bg-card'
}`}
```

- [ ] **Step 2: Commit**

```bash
git add components/dashboard/rescue-center/pets-tab.tsx
git commit -m "feat: amber tint styling for dashboard cards with conditions"
```

---

## Chunk 4: Sheet/Drawer Detail View

### Task 9: Refactor PetDetail as Sheet/Drawer content

**Files:**
- Modify: `components/pets/pet-detail.tsx`

- [ ] **Step 1: Replace arrow carousel with CardCarousel**

Remove the manual carousel (prev/next/photoIndex state) and replace with CardCarousel.

Import the `CardCarousel` pattern: since `CardCarousel` currently lives inside `pets-tab.tsx`, we need to either extract it or duplicate the pattern. **Extract it**: move `CardCarousel` from `pets-tab.tsx` to a shared location or just inline the pattern in `pet-detail.tsx`.

The simplest approach: inline a local `DetailCarousel` in `pet-detail.tsx` that wraps the `Carousel` component with `showPauseButton`:

```tsx
function DetailCarousel({ urls }: { urls: string[] }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)

  const items = urls.map((url, i) => ({
    id: i,
    image: url,
    title: '',
    description: '',
    icon: null as unknown as React.ReactNode,
  }))

  useEffect(() => {
    if (containerRef.current) setWidth(containerRef.current.offsetWidth)
  }, [])

  return (
    <div ref={containerRef} className="w-full aspect-square">
      {width > 0 && (
        <Carousel
          items={items}
          baseWidth={width}
          autoplay={urls.length > 1}
          autoplayDelay={3000}
          pauseOnHover
          loop={urls.length > 1}
          containerPadding={0}
          dotsOverlay
          showPauseButton
          className="relative overflow-hidden w-full h-full"
        />
      )}
    </div>
  )
}
```

Remove `faChevronLeft`, `faChevronRight` from imports. Add `import Carousel from '@/components/Carousel'`.

Replace the entire hero photo section with:
```tsx
<div className="relative shrink-0 bg-secondary">
  {hasPhotos ? (
    <DetailCarousel urls={photos.map(p => p.url)} />
  ) : (
    <div className="aspect-square flex items-center justify-center">
      <FontAwesomeIcon icon={faPaw} className="text-4xl text-muted-foreground/30" />
    </div>
  )}
</div>
```

Remove `photoIndex` state and `prev`/`next` functions.

- [ ] **Step 2: Add condition alert section**

After the description paragraph, add:

```tsx
{pet.conditions?.length > 0 && (
  <div className="bg-amber-50 border border-amber-300 rounded-xl p-3 space-y-1">
    <p className="text-sm font-medium text-amber-800">{t('detail.specialCondition')}</p>
    {pet.condition_notes && (
      <p className="text-sm text-amber-700">{pet.condition_notes}</p>
    )}
  </div>
)}
```

- [ ] **Step 3: Add rescue center section**

After the condition section (or after description if no conditions), add a divider and RC section:

```tsx
<hr className="border-border" />

{/* Rescue Center */}
{pet.rescue_center && (
  <div className="space-y-2">
    <p className="text-xs text-muted-foreground uppercase tracking-wide">{t('detail.rescueCenter')}</p>
    <div className="flex items-center gap-3">
      {pet.rescue_center.logo_url ? (
        <Image
          src={pet.rescue_center.logo_url}
          alt={pet.rescue_center.name}
          width={40}
          height={40}
          className="rounded-xl object-cover"
        />
      ) : (
        <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
          <FontAwesomeIcon icon={faPaw} className="text-sm text-muted-foreground" />
        </div>
      )}
      <span className="font-medium text-sm">{pet.rescue_center.name}</span>
    </div>
    <div className="flex items-center gap-4">
      {pet.rescue_center.website && (
        <a href={pet.rescue_center.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <FontAwesomeIcon icon={faGlobe} className="text-sm" />
          Website
        </a>
      )}
      {pet.rescue_center.instagram && (
        <a href={pet.rescue_center.instagram} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <FontAwesomeIcon icon={faInstagram} className="text-sm" />
          Instagram
        </a>
      )}
    </div>
  </div>
)}
```

Add imports: `import { faGlobe } from '@fortawesome/free-solid-svg-icons'` and `import { faInstagram } from '@fortawesome/free-brands-svg-icons'`.

- [ ] **Step 4: Update share to use native share on mobile**

Update `handleShare`:

```typescript
const handleShare = async () => {
  if (!pet.short_slug) return
  const url = `${window.location.origin}/p/${pet.short_slug}`
  if (navigator.share) {
    try { await navigator.share({ url }) } catch { /* cancelled */ }
    return
  }
  try {
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  } catch { /* Clipboard API not available */ }
}
```

- [ ] **Step 5: Commit**

```bash
git add components/pets/pet-detail.tsx
git commit -m "feat: refactor PetDetail — CardCarousel, conditions, RC section, native share"
```

---

### Task 10: Wire Sheet/Drawer in PetsPage

**Files:**
- Modify: `components/pets/pets-page.tsx`

- [ ] **Step 1: Remove split layout, add Sheet/Drawer**

Replace the entire `return` JSX. The new structure:
1. Remove the `hidden md:flex w-90` detail panel
2. Expand grid to full width
3. Add Sheet (md+) and Drawer (below md) wrappers
4. Remove auto-selection of first pet (`if (!initialSelected && list.length > 0) setSelected(list[0])` — line 35-37)

New imports:
```typescript
import { useMediaQuery } from '@/lib/hooks/use-media-query'
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Drawer, DrawerContent, DrawerTitle, DrawerDescription } from '@/components/ui/drawer'
```

**Note:** `DrawerTitle` and `DrawerDescription` are exported from `drawer.tsx` (verified). No `@radix-ui/react-visually-hidden` is needed — use Tailwind's `sr-only` class for hidden accessibility labels.

Add state:
```typescript
const isDesktop = useMediaQuery('(min-width: 768px)')
const [open, setOpen] = useState(false)
```

Update `handleSelect`:
```typescript
const handleSelect = useCallback((pet: Pet) => {
  setSelected(pet)
  setOpen(true)
}, [])
```

Remove the auto-select logic in `fetchPets` (lines 35-37 — the `if (!initialSelected && list.length > 0)` block).

New return JSX:
```tsx
return (
  <div className="flex flex-col h-screen">
    <PetsHeader />

    <div className="container mx-auto flex-1 min-h-0 px-4">
      <PetGrid
        pets={pets}
        loading={loading}
        error={error}
        selectedId={selected?.id ?? null}
        activeFilter={activeFilter}
        onSelect={handleSelect}
        onFilterChange={handleFilterChange}
      />
    </div>

    {/* Desktop: Sheet from right */}
    {isDesktop ? (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="p-0 overflow-y-auto">
          <SheetTitle className="sr-only">{selected?.name ?? ''}</SheetTitle>
          <SheetDescription className="sr-only">{selected?.description ?? ''}</SheetDescription>
          {selected && <PetDetail pet={selected} />}
        </SheetContent>
      </Sheet>
    ) : (
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerTitle className="sr-only">{selected?.name ?? ''}</DrawerTitle>
          <DrawerDescription className="sr-only">{selected?.description ?? ''}</DrawerDescription>
          <div className="overflow-y-auto">
            {selected && <PetDetail pet={selected} />}
          </div>
        </DrawerContent>
      </Drawer>
    )}
  </div>
)
```

**Note:** `@radix-ui/react-visually-hidden` is needed for accessibility — Sheet/Drawer require Title and Description. If not installed, use `<SheetTitle className="sr-only">` instead.

- [ ] **Step 2: Verify Drawer exports**

Run: `grep "export" components/ui/drawer.tsx` to confirm `DrawerTitle` and `DrawerDescription` are exported. Both are needed for accessibility (hidden via `sr-only`).

- [ ] **Step 3: Remove unused faPaw import if no longer needed**

Check if `faPaw` is still used after removing the empty detail panel placeholder. If not, remove the import.

- [ ] **Step 4: Verify in browser**

- Click a pet → Sheet slides in from right on desktop
- Resize to mobile → pet opens in bottom Drawer
- Grid is full width, 4 columns on lg
- Close via X, overlay click, or Escape
- Pet card stays highlighted while Sheet/Drawer is open

- [ ] **Step 5: Commit**

```bash
git add components/pets/pets-page.tsx
git commit -m "feat: replace split layout with full-width grid + Sheet/Drawer detail"
```

---

## Chunk 5: Final Polish

### Task 11: Visual QA and cleanup

- [ ] **Step 1: Check all pages using Carousel still work**

- Dashboard pets tab: carousel auto-rotates, pause button visible
- `/pets` page: pet detail in Sheet shows carousel with pause/play

- [ ] **Step 2: Check condition styling**

- Dashboard: cards with conditions have amber tint + border
- `/pets`: cards with conditions have amber tint + border + badge

- [ ] **Step 3: Check skeleton loading**

- Navigate to `/pets` — skeleton grid should show briefly during fetch

- [ ] **Step 4: Check dropdown menu**

- Hover over a pet card on `/pets` — three-dots button appears
- Click it — dropdown shows "Compartir enlace"
- If RC data available: website/Instagram links appear

- [ ] **Step 5: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix: pets page overhaul QA fixes"
```
