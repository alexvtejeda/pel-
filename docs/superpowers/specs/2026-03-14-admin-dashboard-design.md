# Admin Dashboard Design

## Overview

Internal admin dashboard for managing rescue center registrations and the master adoption form template. Accessible at `/dashboard/admin` by any authenticated user whose ID is in the backend's `ADMIN_USER_IDS` env var. Mirrors the RC dashboard sidebar pattern (logo header, nav items, profile footer).

## Route & Guard

**Route:** `/dashboard/admin`

**Layout:** `app/dashboard/admin/layout.tsx` wraps children in `<ProtectedRoute>` (auth required, any role) + `<AdminGuard>`.

**AdminGuard:** Calls `GET /api/v1/auth/me` on mount. Parses `is_admin` from the raw JSON response (not from the `AuthUser` type — `is_admin` is intentionally NOT added to `AuthUser` or localStorage to avoid client-side spoofing). If `is_admin` is false or missing, silently redirects to `/`. If true, renders children.

**Navigation:** For now, admins navigate to `/dashboard/admin` directly. A sidebar link in other dashboards can be added later if needed.

## Sidebar & Shell

**Sidebar** — mirrors RC sidebar pattern using shadcn `SidebarProvider`:
- **Header:** Pelú logo + "Admin" subtitle label
- **Nav items (3):**
  - `faShieldCat` — "Centros de rescate" (tab: `rescue-centers`)
  - `faFileLines` — "Formulario" (tab: `form-template`)
  - `faGear` — "Configuración" (tab: `settings`)
- **Footer:** User profile card — avatar initial circle, name derived from email, email text

**Shell** — `AdminDashboardShell` manages `activeTab: 'rescue-centers' | 'form-template' | 'settings'`. Passes `activeTab` + `onTabChange` to `AdminSidebar`. Conditionally renders tab content in main area.

**Mobile nav** — `AdminMobileNav` with 3 tabs at bottom, same `md:hidden` pattern as RC dashboard.

## Tab 1: Rescue Centers

**Data source:** `GET /api/v1/admin/rescue-centers` — returns all centers regardless of status.

**Status filter tabs** at top of content area: Todos (default) | Pendientes | Activos | Rechazados. Client-side filtering on the fetched list.

**Card grid layout** — each rescue center as a card showing:
- Center name + email (from the user who created it)
- Address + phone
- Status badge: yellow "Pendiente", green "Activo", red "Rechazado"
- For rejected centers: show `reject_reason` if present

**Actions per status:**
- **Pending:** "Aprobar" button (green) + "Rechazar" button (red) + delete trash icon
- **Active:** Delete trash icon only
- **Rejected:** Delete trash icon only

**Approve flow:** Calls `PATCH /api/v1/admin/rescue-centers/:id/approve`. On success, update card status to "Activo" in place.

**Reject flow:** Clicking "Rechazar" shows an inline input on the card for the reason, with "Confirmar" (disabled when empty) and "Cancelar" buttons. The reason is required — the backend returns 400 if missing. Sends `{ reason }` to `PATCH /api/v1/admin/rescue-centers/:id/reject`. On success, update card to "Rechazado".

**Delete flow:** Opens an alert dialog: "¿Eliminar centro de rescate?" / "Esta acción no se puede deshacer. Se eliminará el centro de rescate y todos sus datos." / "Eliminar" (destructive red) + "Cancelar". Calls `DELETE /api/v1/admin/rescue-centers/:id` (returns 204 — skip JSON parsing). On success, remove card from list.

**Loading/empty/error states:**
- Loading spinner while `GET /admin/rescue-centers` is in flight
- Empty state message when no centers exist or when a filter yields no results
- Error text if API call fails
- Optimistic card removal on delete, status update on approve/reject

## Tab 2: Form Template

**Data source:** `GET /api/v1/admin/forms/default` — returns the master adoption form template.

Reuses the existing form builder UI from the RC dashboard. The admin edits the master template that gets copied to newly approved RCs.

**Key differences from RC form builder:**
- Header shows "Plantilla de adopción" (not RC form name)
- Save calls `PUT /api/v1/admin/forms/default` instead of `PUT /forms/:id`
- No form list/selector — single master template only
- No special-needs form toggle

**Implementation:** Extract shared form editor logic or duplicate into `admin-form-tab.tsx` depending on how coupled the existing `forms-tab.tsx` is to RC-specific state. Decision made during implementation.

## Tab 3: Settings

Minimal — internal use only:
- Email display
- Logout button

No avatar upload, no danger zone, no profile editing.

## New Files

| File | Purpose |
|---|---|
| `app/dashboard/admin/layout.tsx` | ProtectedRoute + AdminGuard wrapper |
| `app/dashboard/admin/page.tsx` | Renders `<AdminDashboardShell />` |
| `components/dashboard/admin/admin-guard.tsx` | Fetches `/auth/me`, checks `is_admin`, redirects if false |
| `components/dashboard/admin/admin-dashboard-shell.tsx` | Shell with activeTab state, renders sidebar + tab content |
| `components/dashboard/admin/admin-sidebar.tsx` | Sidebar: logo header, 3 nav items, profile footer |
| `components/dashboard/admin/admin-mobile-nav.tsx` | Bottom nav for mobile (3 tabs) |
| `components/dashboard/admin/rescue-centers-tab.tsx` | Card grid with status filters, approve/reject/delete actions |
| `components/dashboard/admin/admin-form-tab.tsx` | Master form template editor |
| `components/dashboard/admin/admin-settings-tab.tsx` | Simple settings: email + logout |
| `lib/api/admin.ts` | Admin API module |

## Modified Files

| File | Change |
|---|---|
| `lib/api/rescue-centers.ts` | Add `reject_reason?: string` to the `RescueCenter` interface (backend already returns this field for rejected centers) |

All other changes are additive — no existing components are modified.

## API Module: `lib/api/admin.ts`

All functions follow the `{ data, error }` pattern using `apiClient()`.

### Rescue Centers
- `listAllRescueCenters()` → `GET /api/v1/admin/rescue-centers`
- `approveRescueCenter(id)` → `PATCH /api/v1/admin/rescue-centers/:id/approve`
- `rejectRescueCenter(id, reason)` → `PATCH /api/v1/admin/rescue-centers/:id/reject`
- `deleteRescueCenter(id)` → `DELETE /api/v1/admin/rescue-centers/:id` — returns 204, skip JSON parsing

### Form Template
- `getFormTemplate()` → `GET /api/v1/admin/forms/default`
- `updateFormTemplate(data)` → `PUT /api/v1/admin/forms/default`

## Decisions Made

- Admin is not a role — it's an env var overlay checked via `is_admin` from `/auth/me`
- `is_admin` fetched fresh in AdminGuard (not from localStorage) for security
- Non-admins silently redirected to `/` (no error page)
- Card grid layout for rescue centers (shows address, phone, contact info per card)
- Client-side status filtering (all data fetched once)
- Reject requires a reason (inline input on card)
- Delete uses alert dialog with destructive confirmation
- Form template tab reuses existing form builder pattern
- Settings tab is minimal (email + logout only)
- No i18n for admin dashboard — Spanish only, internal use
- Client-side filtering is fine for expected data volume (internal tool, low RC count)
- `is_admin` intentionally NOT added to `AuthUser` — AdminGuard parses raw `/auth/me` response
- `reject_reason` added to existing `RescueCenter` interface (backend already returns it)
- Sidebar icon `faShieldCat` — verify availability in `@fortawesome/free-solid-svg-icons`, fallback to `faHouseChimney` if not in free set
