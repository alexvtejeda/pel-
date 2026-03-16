# Spec D: Pet Metrics — RC Dashboard Tab

## Overview

Add a "Métricas" tab to the RC dashboard that tracks pet views and adoption clicks, displaying summary cards, a time-series area chart, and a per-pet breakdown table. Uses `recharts` for charting (same library shadcn charts are built on) and shadcn `Card`/`Table` components.

## New Tab: Métricas

**New file:** `components/dashboard/rescue-center/metrics-tab.tsx`

### Sidebar/Mobile Nav

Add "Métricas" tab to the RC dashboard navigation:
- **Sidebar:** `components/dashboard/rescue-center/rescue-center-sidebar.tsx` — add `faChartLine` icon, label "Métricas", positioned after "Notificaciones" and before "Configuración"
- **Mobile nav:** `components/dashboard/rescue-center/mobile-bottom-nav.tsx` — add corresponding tab
- **Dashboard shell:** `components/dashboard/rescue-center/dashboard-shell.tsx` — add `'metrics'` to the `Tab` type union and render `MetricsTab` when active

## Tab Layout

### Time Range Filter

Row of three toggle buttons at the top:
- "7 días" / "30 días" / "Todo"
- Default: "30 días"
- Active style: `bg-pop-550 text-white`, inactive: `bg-muted text-muted-foreground`
- Changing the range re-fetches metrics from the API

### Summary Cards (Row of 3)

Use shadcn `Card` component. Three cards in a responsive grid (`grid-cols-1 sm:grid-cols-3 gap-4`):

1. **Total vistas**
   - Large number (e.g., "1,247")
   - Subtitle: "vistas en los últimos 30 días"
   - Icon: `faEye`

2. **Clics en adoptar**
   - Large number in `text-pop-550` (e.g., "89")
   - Subtitle: "clics en adoptar"
   - Icon: `faHandPointer`

3. **Tasa de conversión**
   - Percentage in green/red depending on threshold (e.g., "7.1%")
   - Calculated: `(adopt_clicks / views) * 100`
   - Green if >= 5%, red if < 5%
   - Icon: `faArrowTrendUp`

### Area Chart — Views Over Time

Use `recharts` (`AreaChart`, `Area`, `XAxis`, `YAxis`, `Tooltip`, `ResponsiveContainer`):
- Shows daily view count as a filled area chart
- X-axis: dates (formatted as "12 Mar", "13 Mar", etc.)
- Y-axis: view count
- Area fill: `fill-pop-550/20`, stroke: `stroke-pop-550`
- Second line (always shown): adoption clicks as a dashed line in lighter pop color (`stroke-pop-550/50`)
- Wrapped in a shadcn `Card` with header "Vistas en el tiempo"
- Responsive: `ResponsiveContainer width="100%" height={300}`

### Per-Pet Breakdown Table

Use shadcn `Table` component:

| Column | Content |
|--------|---------|
| Mascota | Pet photo (36x36 rounded-lg) + name + species/gender subtitle |
| Vistas | View count (right-aligned, font-semibold) |
| Adoptar | Adopt click count (right-aligned, text-pop-550) |
| Conversión | Percentage (green if >= 5%, red if < 5%) |
| Tendencia | Relative horizontal bar showing views proportion vs top pet |

- Sorted by views descending (most popular first)
- Rows are not clickable (read-only data)
- If a pet has high views but low conversion (< 3%), show a subtle `faLightbulb` tooltip: "Considera mejorar las fotos o descripción". Note: this 3% threshold is intentionally lower than the summary card's 5% threshold — the summary shows overall health while the per-pet tip targets outliers that need attention
- **Tendencia bar:** a simple inline `<div>` with `bg-pop-550/20` background. Width is calculated as `(pet.views / maxViews) * 100%` where `maxViews` is the highest view count across all pets. Height: 24px, `rounded-md`.

### Empty State

When the RC has no pets yet or no events have been recorded:
- Show a centered empty state with `faChartLine` icon (muted), heading "Sin datos aún", and subtext "Las métricas aparecerán cuando tus mascotas reciban visitas"
- Same empty-state pattern used in other RC dashboard tabs

## Event Tracking (Frontend)

### View Event

**File:** `components/pets/pet-detail.tsx`

When a pet's detail panel opens (user selects pet in grid), fire a view event:
```ts
// Fire-and-forget, no await needed
trackPetEvent(pet.id, 'view')
```

Debounce: don't fire again if the same pet was viewed in the last 30 seconds. Use a module-level `Set<string>` — on track, add `petId` to the set and schedule `setTimeout(() => set.delete(petId), 30000)` for cleanup.

### Adopt Click Event

**File:** `components/pets/pet-detail.tsx`

When the user clicks the "Adoptar" button, fire an adopt_click event before navigating:
```ts
trackPetEvent(pet.id, 'adopt_click')
router.push(`/adopt/${pet.id}`)
```

### API Helper

**New file:** `lib/api/metrics.ts`

```ts
import { apiClient } from './client'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

export function trackPetEvent(petId: string, eventType: 'view' | 'adopt_click') {
  // Fire-and-forget POST, public endpoint (no auth needed), raw fetch — intentionally not async
  fetch(`${BASE_URL}/api/v1/pets/${petId}/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event_type: eventType }),
  }).catch(() => {}) // silently ignore failures
}

export async function getMetrics(period: '7d' | '30d' | 'all'): Promise<{ data: MetricsResponse | null; error: string | null }> {
  try {
    const res = await apiClient(`/api/v1/pets/metrics?period=${period}`)
    const json = await res.json()
    if (!res.ok) return { data: null, error: json.error || 'Error al obtener métricas' }
    return { data: json, error: null }
  } catch {
    return { data: null, error: 'Error de conexión' }
  }
}
```

## Types

```ts
interface MetricsResponse {
  summary: {
    total_views: number
    total_adopt_clicks: number
    conversion_rate: number // percentage
  }
  daily: Array<{
    date: string // "2026-03-16"
    views: number
    adopt_clicks: number
  }>
  pets: Array<{
    pet_id: string
    pet_name: string
    pet_photo_url: string | null
    species: 'dog' | 'cat'
    gender: 'male' | 'female'
    views: number
    adopt_clicks: number
    conversion_rate: number
  }>
}
```

## Dependencies

- **npm:** `recharts` (add via `bun add recharts`)
- **shadcn:** `Card` and `Table` components (likely already installed; if not: `npx shadcn@latest add card table`)

## Backend Dependencies

1. **New table `pet_events`:**
   - `id UUID PRIMARY KEY`
   - `pet_id UUID REFERENCES pets(id) ON DELETE CASCADE`
   - `event_type VARCHAR(20) NOT NULL` — `'view'` or `'adopt_click'`
   - `created_at TIMESTAMPTZ DEFAULT NOW()`
   - Index on `(pet_id, event_type, created_at)` for fast aggregation

2. **New endpoint `POST /api/v1/pets/:id/events`:**
   - Public (no auth required — anonymous tracking)
   - Body: `{ "event_type": "view" | "adopt_click" }`
   - Response: `204` (no body)
   - Rate limiting recommended (optional for MVP)

3. **New endpoint `GET /api/v1/pets/metrics`:**
   - Auth required (RC role only)
   - Query param: `period=7d|30d|all`
   - Returns: `MetricsResponse` (see Types section)
   - Aggregates events for all pets belonging to the authenticated RC
   - `daily` array: one entry per day in the period
   - `pets` array: one entry per pet, sorted by views descending

## i18n Keys

Add to `pets` namespace (no `dashboard` namespace exists — RC dashboard strings already use `pets`):
- `metrics.title`, `metrics.subtitle`
- `metrics.total_views`, `metrics.adopt_clicks`, `metrics.conversion_rate`
- `metrics.chart_title`, `metrics.table_pet`, `metrics.table_views`, `metrics.table_adopt`, `metrics.table_conversion`
- `metrics.period_7d`, `metrics.period_30d`, `metrics.period_all`
- `metrics.tip_low_conversion`
