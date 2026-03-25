# Services Route — Aliados

**Date:** 2026-03-24
**Status:** approved
**Brief:** `docs/superpowers/transcriptions/2026-03-24-services-route-business-discovery.md`
**Depends on:** `2026-03-24-business-dashboard-design.md` (ProviderCard component, `user_id`/`price`/`cover_photo_url` in UnifiedProvider)

## Goal

Create a public route (`/aliados`) where anyone can browse registered businesses and member service providers. Accessible to all users — authenticated or not.

## Architecture

Mirrors the `/pets` page layout: grid + Sheet/Drawer detail panel.

### Route & Header

- Route: `/aliados`
- Header link: "Aliados" — added to both desktop nav in `pets-header.tsx` and `PublicMobileNav` (with appropriate icon, e.g., `faHandshake`)
- Public route: no auth required, visible to all roles and unauthenticated visitors

### Files to create

```
app/aliados/
  page.tsx                    — renders <AliadosPage />

components/providers/
  provider-card.tsx           — shared between /aliados grid and ProviderPicker (spec #2)

components/aliados/
  aliados-page.tsx            — main page: grid + Sheet/Drawer detail
  provider-detail.tsx         — detail panel content
  provider-grid.tsx           — grid with loading skeleton

lib/api/
  providers.ts                — public API client (raw fetch, no apiClient — same pattern as pets-public.ts)
```

`ProviderCard` lives in `components/providers/` (shared location) so both `components/aliados/` and `components/transport/provider-picker.tsx` can import it without cross-feature coupling.

### Shared component: `ProviderCard`

Same card used in the ProviderPicker modal (spec #2). In the ProviderPicker it triggers selection; on `/aliados` it opens the detail panel.

Each card shows:
- Business/provider name
- Cover photo (businesses) or initials avatar placeholder (members)
- Services offered (badges)
- Price (e.g., "RD$500") or "Precio no disponible" if null
- Trust badge: "Empresa verificada" (business) or "Proveedor verificado" (member)

---

## Grid Layout

Match the `/pets` grid responsive breakpoints:
- `grid-cols-2 md:grid-cols-3 lg:grid-cols-4`
- `gap-2` (8px), `p-4` (16px)
- `rounded-xl` cards
- Loading skeleton (shimmer cards) while fetching — same pattern as pet grid

### Data source

`GET /providers` (public, no auth) via `lib/api/providers.ts` (raw `fetch`, `{ data, error }` pattern).

### Filters (display only for demo)

Service type filter bar at the top (transport, grooming, walking, pet sitting, training, etc.). Visually present but **non-functional for demo** — all providers shown regardless of filter selection. Wire up post-demo.

---

## Detail Panel

Uses Sheet (desktop) / Drawer (mobile) — same pattern as `/pets` page, not a fixed column.

Opens when a card is clicked.

### Content

- Cover photo (full width of panel) or gradient fallback
- Provider name (large)
- Trust badge
- Services list (badges)
- Price
- Description (from provider profile)
- **Operating hours** — 7-day grid showing open/closed + hours for each day (businesses only; hidden for member providers)
- Address
- Instagram link (if exists, businesses only)
- Contact button: "Contactar" (disabled for demo — future: opens chat or shows contact info)

### Operating hours display

Reuse the same visual pattern as the business wizard's 7-day toggle grid, but in read-only mode. Each day shows:
- Day name (Lun, Mar, Mié, Jue, Vie, Sáb, Dom)
- Hours (e.g., "8:00 AM - 5:00 PM") or "Cerrado"

---

## Backend Changes

`description` already exists in `UnifiedProvider` — no change needed for that field.

| Change | Domain | Priority |
|--------|--------|----------|
| Add `operating_hours` (JSONB, NULL for members) to `UnifiedProvider` UNION query | serviceproviders | required |
| Add `instagram` (NULL for members) to `UnifiedProvider` UNION query | serviceproviders | nice-to-have |

**Hard dependencies from spec #2** (must be completed first): `user_id`, `price`, `cover_photo_url` in `UnifiedProvider`.

**Note:** Bundle these with the spec #2 UNION query changes.

---

## i18n

Add to `business` namespace (shared with spec #2, both `es` and `en`):
- Header: "Aliados"
- Filter labels: "Transporte", "Paseo", "Baño y corte", "Cuidado", "Entrenamiento"
- Detail panel: "Horario de atención", "Cerrado", "Contactar", "Dirección", "Descripción"
- Day abbreviations: "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"
- Price: "Precio no disponible"
- Trust badges: "Empresa verificada", "Proveedor verificado" (shared with ProviderPicker)
- Empty state: "No hay aliados registrados aún"

---

## What This Spec Does NOT Cover

- Functional filters (display only for demo)
- Location-based sorting / distance display
- Contact/chat initiation from the detail panel (button disabled for demo)
- Provider ratings or reviews
- Map view of providers
- SEO / meta tags for public discovery
- `phone` field in UnifiedProvider (add when "Contactar" becomes functional)
