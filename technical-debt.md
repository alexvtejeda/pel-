# Technical Debt Journal

A running self-education log of everything solved during coding sessions that I may not fully understand yet.

---

## 2026-03-25

### Task: Business dashboard, services route, adoption-transport flow
**Tags:** `[New Library]` `[New Pattern]` `[Agent Decision]`

This session implemented three full plans (24+ commits) using subagent-driven development — Claude dispatched fresh subagents per task group, each with isolated context and specific instructions. The subagents made autonomous decisions: one created `components/ui/dialog.tsx` from scratch when it didn't exist (mirroring the Radix UI + shadcn pattern from `alert-dialog.tsx`), another chose to cast `TripStatus` via `as unknown as ExtendedStatus` in the requests tab because the shared type only had 4 values but the driver-role API returns 6 statuses (`requested`, `accepted`, `picking_up`, `in_transit`, `completed`, `cancelled`). I need to understand the Radix UI Dialog primitive and why the shadcn wrapper is structured the way it is.

**Sonner** was installed as the toast library (`bun add sonner`). It's wired into the root layout as `<Toaster position="top-right" richColors />`. Toasts are fired via `toast.success(message, { duration })` from any component. The welcome toast uses `router.replace('/chat', { scroll: false })` to clean the `?welcome=1` query param after consuming it — this avoids a full navigation/re-render while removing the param from the URL bar.

The `SidebarProvider` + `SidebarInset` pattern from shadcn/ui was mirrored for the business dashboard. The sidebar uses `collapsible="icon"` mode and `useSidebar()` to read `state === 'expanded' | 'collapsed'`. Each dashboard role (rescue_center, business) gets its own shell/sidebar/mobile-nav components that follow the same structure but with different tabs and icons.

**Debt level:** 2 — I followed along and it worked, but I'd struggle to reproduce the Dialog component from scratch or explain the SidebarProvider internals.
**Follow-up:** Read the Radix UI Dialog docs and the shadcn/ui sidebar source to understand the compound component pattern and context threading. Also read sonner's API docs to understand toast customization beyond `success()`.

---

## 2026-03-26

### Task: Landing page hero with testimonial carousel
**Tags:** `[New Pattern]` `[First-Time Concept]`

Built a coverflow-style testimonial carousel forked from the existing `Carousel.tsx` using Framer Motion's `useTransform`. The key insight is `clamp: true` vs `clamp: false` — with `clamp: false`, values extrapolate linearly beyond the defined input range, which made cards 2+ positions away fade to opacity 0 and disappear. Switching to `clamp: true` kept distant cards at the side-card values (0.5 opacity, 0.88 scale). The carousel needed a `centerOffset` added to all `useTransform` ranges so the active card's x position maps to the "center" output values — without this, the glow border appeared on the wrong card.

Seamless looping required cloning 2 items on each side (not 1) because 3 cards are visible simultaneously. With only 1 clone, the last card had an empty slot on the right before the jump-reset. The loop jump logic checks if `position > lastReal` or `position < CLONES` and instantly teleports to the corresponding real item.

Two CSS patterns were new: targeting child elements inside a third-party component via `[&_img]:grayscale` to apply filters to LogoLoop images without affecting its fade overlays, and the negative margin bleed pattern (`-mx-8 w-[calc(100%+4rem)]`) to make the LogoLoop span edge-to-edge despite the parent's `p-8` padding.

**Debt level:** 2 — I understand the useTransform API now but would need to think carefully about the clone/jump math if building another carousel from scratch. The CSS bleed pattern is simple but I hadn't used it before.
**Follow-up:** Read Framer Motion's `useTransform` and `useMotionValue` docs to understand the full interpolation API. Practice the negative margin bleed pattern on other padded containers.
