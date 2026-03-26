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
