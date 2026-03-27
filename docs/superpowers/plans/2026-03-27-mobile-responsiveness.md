# Mobile Responsiveness Fixes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix mobile responsiveness bugs — carousel overflow, grid-footer gap, and modal z-index conflicts.

**Architecture:** Five targeted edits across six files. No new files, no new dependencies. Each task is independent and can be committed separately.

**Tech Stack:** Next.js (React), TailwindCSS v4, Framer Motion, Radix UI Dialog

---

### Task 1: Landing hero — responsive right column

**Files:**
- Modify: `components/landing/landing-page.tsx:42` (hero section) and `:75-86` (right column)

- [ ] **Step 1: Add overflow-hidden to hero section**

In `components/landing/landing-page.tsx`, change line 42 from:

```tsx
<section className="px-4 pt-12 pb-16">
```

to:

```tsx
<section className="px-4 pt-12 pb-16 overflow-hidden">
```

- [ ] **Step 2: Make right column card styling md-only**

Change line 75 from:

```tsx
<div className="flex-1 flex flex-col items-center w-full max-w-150 bg-muted rounded-2xl p-8 inset-shadow-[0_0_5px_1px_var(--color-input)] gap-4">
```

to:

```tsx
<div className="flex-1 flex flex-col items-center w-full md:max-w-150 md:bg-muted md:rounded-2xl md:p-8 md:inset-shadow-[0_0_5px_1px_var(--color-input)] gap-4">
```

- [ ] **Step 3: Make LogoLoop bleed wrapper md-only**

Change line 76 from:

```tsx
<div className="opacity-48 mb-4 -mx-8 w-[calc(100%+4rem)]">
```

to:

```tsx
<div className="opacity-48 mb-4 md:-mx-8 md:w-[calc(100%+4rem)]">
```

- [ ] **Step 4: Verify on dev server**

Open `http://localhost:3000/` and check:
- Desktop (`md+`): right column still has `bg-muted` card with padding and inset shadow
- Mobile (`<md`): right column has no card background, LogoLoop and carousel fill available width, no horizontal scroll

- [ ] **Step 5: Commit**

```bash
git add components/landing/landing-page.tsx
git commit -m "fix: make landing hero right column responsive for mobile"
```

---

### Task 2: Carousel — dynamic container width

**Files:**
- Modify: `components/landing/testimonial-carousel.tsx:88-99` (width calculation) and `:190-195` (container div)

- [ ] **Step 1: Add measured width state and derive dimensions from it**

In `components/landing/testimonial-carousel.tsx`, replace lines 95-99 (the static dimension calculations at the top of the component body):

```tsx
const containerPadding = 16
const itemWidth = Math.round((baseWidth - containerPadding * 2) / 2.4)
const trackItemOffset = itemWidth + GAP
// Offset so the active card sits centered in the container
const centerOffset = Math.round((baseWidth - itemWidth) / 2)
```

with:

```tsx
const containerRef = useRef<HTMLDivElement>(null)
const [measuredWidth, setMeasuredWidth] = useState(0)

useEffect(() => {
  if (!containerRef.current) return
  const observer = new ResizeObserver(([entry]) => {
    setMeasuredWidth(entry.contentRect.width)
  })
  observer.observe(containerRef.current)
  return () => observer.disconnect()
}, [])

const effectiveWidth = measuredWidth || baseWidth
const containerPadding = 16
const itemWidth = Math.round((effectiveWidth - containerPadding * 2) / 2.4)
const trackItemOffset = itemWidth + GAP
// Offset so the active card sits centered in the container
const centerOffset = Math.round((effectiveWidth - itemWidth) / 2)
```

Then remove the old `containerRef` declaration at line 118 (`const containerRef = useRef<HTMLDivElement>(null)`) since it's now declared above.

- [ ] **Step 2: Replace fixed container width with 100%**

Change the container div style (line 195) from:

```tsx
style={{ width: `${baseWidth}px`, height: CENTER_HEIGHT + 32, perspective: 1000, perspectiveOrigin: '50% 50%' }}
```

to:

```tsx
style={{ width: '100%', height: CENTER_HEIGHT + 32, perspective: 1000, perspectiveOrigin: '50% 50%' }}
```

- [ ] **Step 3: Verify on dev server**

Open `http://localhost:3000/` and check:
- Desktop: carousel looks identical to before (cards centered, coverflow effect works)
- Resize browser to phone width (~375px): carousel cards scale down proportionally, still centered, still animate, no overflow
- Drag/swipe still works at all widths

- [ ] **Step 4: Commit**

```bash
git add components/landing/testimonial-carousel.tsx
git commit -m "fix: make testimonial carousel width responsive via ResizeObserver"
```

---

### Task 3: Pet grid / Partners grid — remove footer gap

**Files:**
- Modify: `components/pets/pet-grid.tsx:244`
- Modify: `components/aliados/provider-grid.tsx:53`

- [ ] **Step 1: Remove min-h-screen from pet-grid.tsx**

In `components/pets/pet-grid.tsx`, change line 244 from:

```tsx
<div className="flex-1 overflow-y-auto p-4 inset-shadow-2xl rounded-t-2xl shadow-2xl bg-background min-h-screen">
```

to:

```tsx
<div className="flex-1 overflow-y-auto p-4 inset-shadow-2xl rounded-t-2xl shadow-2xl bg-background">
```

- [ ] **Step 2: Remove min-h-screen from provider-grid.tsx**

In `components/aliados/provider-grid.tsx`, change line 53 from:

```tsx
<div className="flex-1 overflow-y-auto p-4 inset-shadow-2xl rounded-t-2xl min-h-screen shadow-2xl bg-background">
```

to:

```tsx
<div className="flex-1 overflow-y-auto p-4 inset-shadow-2xl rounded-t-2xl shadow-2xl bg-background">
```

- [ ] **Step 3: Verify on dev server**

Open `http://localhost:3000/pets` and `http://localhost:3000/aliados`:
- Grid content connects directly to footer with no large empty gap
- Grid still fills the viewport when there are enough items
- Desktop layout unchanged

- [ ] **Step 4: Commit**

```bash
git add components/pets/pet-grid.tsx components/aliados/provider-grid.tsx
git commit -m "fix: remove min-h-screen from grids to close footer gap on mobile"
```

---

### Task 4: Dialogs — z-index above bottom nav

**Files:**
- Modify: `components/ui/dialog.tsx:23` (overlay) and `:40` (content)

- [ ] **Step 1: Bump DialogOverlay z-index**

In `components/ui/dialog.tsx`, change line 23 from:

```tsx
"fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
```

to:

```tsx
"fixed inset-0 z-60 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
```

- [ ] **Step 2: Bump DialogContent z-index**

In `components/ui/dialog.tsx`, change line 40 from:

```tsx
"fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-2xl",
```

to:

```tsx
"fixed left-[50%] top-[50%] z-60 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-2xl",
```

- [ ] **Step 3: Commit**

```bash
git add components/ui/dialog.tsx
git commit -m "fix: bump dialog z-index above mobile bottom nav"
```

---

### Task 5: Member add-pet modal — z-index and safe area

**Files:**
- Modify: `components/pets/member-add-pet-modal.tsx:213-222`

- [ ] **Step 1: Bump overlay z-index and add overscroll containment**

In `components/pets/member-add-pet-modal.tsx`, change line 213 from:

```tsx
className="fixed inset-0 z-50 flex items-center justify-center"
```

to:

```tsx
className="fixed inset-0 z-60 flex items-center justify-center"
```

- [ ] **Step 2: Bump backdrop z-index**

Change line 216 — the backdrop div currently has no z-index:

```tsx
<div className="fixed inset-0 bg-black/50" />
```

Leave this as-is — it's inside the `z-60` parent, so it inherits stacking. No change needed.

- [ ] **Step 3: Bump modal container z-index and add mobile safe area**

Change line 222 from:

```tsx
className="relative z-50 bg-card border rounded-2xl w-[90%] md:max-w-3xl flex flex-col overflow-hidden max-h-[90vh]"
```

to:

```tsx
className="relative z-60 bg-card border rounded-2xl w-[90%] md:max-w-3xl flex flex-col overflow-hidden max-h-[calc(90vh-4rem)] sm:max-h-[90vh] overscroll-contain"
```

This does three things:
- `z-60`: renders above the `MobileBottomNav` (z-50)
- `max-h-[calc(90vh-4rem)] sm:max-h-[90vh]`: on mobile, subtracts 4rem (64px) from max height to clear the bottom nav; desktop keeps full 90vh
- `overscroll-contain`: prevents scroll chaining to the page behind the modal

- [ ] **Step 4: Verify on dev server**

Log in as a member, open the add-pet modal on a phone-width viewport:
- Modal renders above the bottom nav bar
- Scrolling inside the modal does not scroll the page behind
- "Publish" button is fully visible and tappable
- Desktop layout unchanged

- [ ] **Step 5: Commit**

```bash
git add components/pets/member-add-pet-modal.tsx
git commit -m "fix: member add-pet modal z-index and safe area for mobile"
```
