# Services Route — Aliados

**Date:** 2026-03-24
**Status:** approved
**Brief:** `docs/superpowers/transcriptions/2026-03-24-services-route-business-discovery.md`
**Depends on:** `2026-03-24-business-dashboard-design.md` (ProviderPicker card component)

## Goal

Create a public route (`/aliados`) where anyone can browse registered businesses and member service providers. Accessible to all users — authenticated or not.

## Architecture

Mirrors the `/pets` page layout: grid + 360px fixed right detail panel.

### Route & Header

- Route: `/aliados`
- Header link: "Aliados" — added alongside "Mascotas" and "Acerca de" (or whatever the current header labels are)
- Public route: no auth required, visible to all roles and unauthenticated visitors

### Files to create

```
app/aliados/
  page.tsx              — renders <AliadosPage />

components/aliados/
  aliados-page.tsx      — main page: grid + detail panel
  provider-card.tsx     — shared with ProviderPicker (spec #2)
  provider-detail.tsx   — 360px right panel content
```

### Shared component: `ProviderCard`

The same card component used in the ProviderPicker modal (spec #2). In the ProviderPicker it triggers selection; on `/aliados` it triggers the detail panel.

Each card shows:
- Business/provider name
- Cover photo (businesses) or initials avatar placeholder (members)
- Services offered (badges)
- Price (e.g., "RD$500") or "Precio no disponible" if null
- Trust badge: "Empresa verificada" (business) or "Proveedor verificado" (member)

---

## Grid Layout

Same geometry as `/pets`:
- 3-column grid
- `gap: 8px`, `padding: 8px`
- `rounded-xl` cards (matching dashboard card style)
- Responsive: 1 col on mobile, 2 on tablet, 3 on desktop

### Data source

`GET /providers` (public, no auth) — returns unified list of businesses + member service providers.

### Filters (display only for demo)

Service type filter bar at the top (transport, grooming, walking, pet sitting, training, etc.). Visually present but **non-functional for demo** — all providers shown regardless of filter selection. Wire up post-demo.

---

## Detail Panel (360px Fixed Right)

Opens when a card is clicked. Scrolls independently from the grid.

### Content

- Cover photo (full width of panel) or gradient fallback
- Provider name (large)
- Trust badge
- Services list (badges)
- Price
- Description (from provider profile)
- **Operating hours** — 7-day grid showing open/closed + hours for each day
- Address
- Instagram link (if exists)
- Contact button: "Contactar" (future: opens chat or shows contact info)

### Operating hours display

Reuse the same visual pattern as the business wizard's 7-day toggle grid, but in read-only mode. Each day shows:
- Day name (Lun, Mar, Mié, Jue, Vie, Sáb, Dom)
- Hours (e.g., "8:00 AM - 5:00 PM") or "Cerrado"

### Backend consideration

`GET /providers` currently does not return `operating_hours` or `description`. The `UnifiedProvider` struct needs these fields added:
- `OperatingHours` (JSONB, from businesses) / NULL for members
- `Description` (string, from both businesses and service providers)

---

## Backend Changes

| Change | Domain | Priority |
|--------|--------|----------|
| Add `operating_hours` to `UnifiedProvider` UNION query | serviceproviders | required |
| Add `description` to `UnifiedProvider` UNION query (both businesses and service providers have this field) | serviceproviders | required |
| Add `instagram` to `UnifiedProvider` UNION query (businesses only) | serviceproviders | nice-to-have |

**Note:** These are additions to the `UnifiedProvider` UNION query already being modified in spec #2 (adding `user_id`, `price`, `cover_photo_url`). Bundle them together.

---

## i18n

Add to `common` namespace (both `es` and `en`):
- Header: "Aliados"
- Filter labels: "Transporte", "Paseo", "Baño y corte", "Cuidado", "Entrenamiento"
- Detail panel: "Horario de atención", "Cerrado", "Contactar", "Dirección"
- Trust badges: reuse from spec #2 ("Empresa verificada", "Proveedor verificado")
- Empty state: "No hay aliados registrados aún"

---

## What This Spec Does NOT Cover

- Functional filters (display only for demo)
- Location-based sorting / distance display
- Contact/chat initiation from the detail panel
- Provider ratings or reviews
- Map view of providers
- SEO / meta tags for public discovery
