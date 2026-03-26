# Services Route (/aliados) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a public `/aliados` route where anyone can browse registered businesses and member service providers.

**Architecture:** Mirrors the `/pets` page layout — responsive grid with Sheet (desktop) / Drawer (mobile) detail panel. Uses the shared ProviderCard component from the business dashboard plan. Public route, no auth required.

**Tech Stack:** Next.js 16 (App Router), React 19, TailwindCSS v4, Font Awesome, react-i18next

**Spec:** `docs/superpowers/specs/2026-03-24-services-route-design.md`

**Depends on:** `docs/superpowers/plans/2026-03-25-business-dashboard.md` (ProviderCard, providers API, business i18n namespace)

---

## File Structure

| Action | File | Responsibility |
|---|---|---|
| Modify | `public/locales/es/business.json` | Add aliados i18n keys (Spanish) |
| Modify | `public/locales/en/business.json` | Add aliados i18n keys (English) |
| Modify | `lib/i18n/index.ts` | Register `business` namespace (if not already registered by business dashboard plan) |
| Modify | `lib/i18n/config.ts` | Add `'business'` to Namespace type (if not already added) |
| Create | `app/aliados/page.tsx` | Route entry — renders `<AliadosPage />` |
| Create | `components/aliados/aliados-page.tsx` | Main page: header, grid + Sheet/Drawer detail panel |
| Create | `components/aliados/provider-grid.tsx` | Grid with filter pills, loading skeleton, empty state |
| Create | `components/aliados/provider-detail.tsx` | Detail panel: cover photo, info, operating hours, contact |
| Modify | `components/pets/pets-header.tsx` | Add "Aliados" nav link (desktop) |
| Modify | `components/pets/public-mobile-nav.tsx` | Add "Aliados" nav item (mobile) |

---

## Task 1: i18n — Add aliados keys to business namespace

**Files:**
- Modify: `public/locales/es/business.json`
- Modify: `public/locales/en/business.json`
- Modify: `lib/i18n/index.ts` (if `business` namespace not yet registered)
- Modify: `lib/i18n/config.ts` (if `'business'` not yet in Namespace type)

- [ ] **Step 1: Add Spanish aliados keys to `public/locales/es/business.json`**

Add the following keys under an `"aliados"` section in the existing file:

```json
{
  "aliados": {
    "title": "Aliados",
    "filters": {
      "all": "Todos",
      "transport": "Transporte",
      "walking": "Paseo",
      "grooming": "Baño y corte",
      "sitting": "Cuidado",
      "training": "Entrenamiento"
    },
    "detail": {
      "hours": "Horario de atención",
      "closed": "Cerrado",
      "contact": "Contactar",
      "address": "Dirección",
      "description": "Descripción"
    },
    "days": {
      "monday": "Lun",
      "tuesday": "Mar",
      "wednesday": "Mié",
      "thursday": "Jue",
      "friday": "Vie",
      "saturday": "Sáb",
      "sunday": "Dom"
    },
    "empty": "No hay aliados registrados aún",
    "error": "Error al cargar aliados",
    "price_unavailable": "Precio no disponible",
    "verified_business": "Empresa verificada",
    "verified_provider": "Proveedor verificado"
  }
}
```

Merge these keys into the existing JSON — do not overwrite keys already present from the business dashboard plan.

- [ ] **Step 2: Add English aliados keys to `public/locales/en/business.json`**

```json
{
  "aliados": {
    "title": "Partners",
    "filters": {
      "all": "All",
      "transport": "Transport",
      "walking": "Walking",
      "grooming": "Grooming",
      "sitting": "Pet Sitting",
      "training": "Training"
    },
    "detail": {
      "hours": "Business hours",
      "closed": "Closed",
      "contact": "Contact",
      "address": "Address",
      "description": "Description"
    },
    "days": {
      "monday": "Mon",
      "tuesday": "Tue",
      "wednesday": "Wed",
      "thursday": "Thu",
      "friday": "Fri",
      "saturday": "Sat",
      "sunday": "Sun"
    },
    "empty": "No partners registered yet",
    "error": "Error loading partners",
    "price_unavailable": "Price unavailable",
    "verified_business": "Verified business",
    "verified_provider": "Verified provider"
  }
}
```

- [ ] **Step 3: Register business namespace in i18n (if not already done)**

Check `lib/i18n/index.ts` — if the business dashboard plan already added `business` imports and registered the namespace, skip this step. Otherwise:

```ts
// Add imports
import esBusiness from '@/public/locales/es/business.json'
import enBusiness from '@/public/locales/en/business.json'

// Add to resources
resources: {
  es: { ..., business: esBusiness },
  en: { ..., business: enBusiness },
}
```

Also check `lib/i18n/config.ts` — add `'business'` to the `Namespace` type if not already present:

```ts
export type Namespace = 'common' | 'landing' | 'auth' | 'pets' | 'chat' | 'transport' | 'business'
```

- [ ] **Step 4: Commit**

```bash
git add public/locales/es/business.json public/locales/en/business.json lib/i18n/index.ts lib/i18n/config.ts
git commit -m "feat(i18n): add aliados keys to business namespace"
```

---

## Task 2: Route + page

**Files:**
- Create: `app/aliados/page.tsx`

- [ ] **Step 1: Create the route page**

```tsx
import { AliadosPage } from '@/components/aliados/aliados-page'

export default function Page() {
  return <AliadosPage />
}
```

- [ ] **Step 2: Commit**

```bash
git add app/aliados/page.tsx
git commit -m "feat: add /aliados route page"
```

---

## Task 3: AliadosPage component

**Files:**
- Create: `components/aliados/aliados-page.tsx`

- [ ] **Step 1: Create AliadosPage**

Mirror `components/pets/pets-page.tsx` exactly — same full-screen layout, header, grid + Sheet/Drawer pattern:

```tsx
'use client'

import { useEffect, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { UnifiedProvider, listProviders } from '@/lib/api/providers'
import { PetsHeader } from '@/components/pets/pets-header'
import { ProviderGrid } from './provider-grid'
import { ProviderDetail } from './provider-detail'
import { useMediaQuery } from '@/lib/hooks/use-media-query'
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Drawer, DrawerContent, DrawerTitle, DrawerDescription } from '@/components/ui/drawer'

export function AliadosPage() {
  const { t } = useTranslation('business')
  const [providers, setProviders] = useState<UnifiedProvider[]>([])
  const [selected, setSelected] = useState<UnifiedProvider | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const useSheet = useMediaQuery('(min-width: 640px)')
  const [open, setOpen] = useState(false)

  const fetchProviders = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error: err } = await listProviders()
    if (err) {
      setError(err)
      setProviders([])
    } else {
      setProviders(data || [])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchProviders()
  }, [fetchProviders])

  const handleSelect = useCallback((provider: UnifiedProvider) => {
    setSelected(provider)
    setOpen(true)
  }, [])

  return (
    <div className="flex flex-col h-screen bg-muted">
      <PetsHeader />

      <div className="container mx-auto flex-1 min-h-0 px-4 pb-16 sm:pb-0">
        <ProviderGrid
          providers={providers}
          loading={loading}
          error={error}
          selectedId={selected?.id ?? null}
          onSelect={handleSelect}
        />
      </div>

      {/* Desktop: Sheet from right */}
      {useSheet ? (
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent side="right" className="p-0 overflow-y-auto">
            <SheetTitle className="sr-only">{selected?.name ?? ''}</SheetTitle>
            <SheetDescription className="sr-only">{selected?.description ?? ''}</SheetDescription>
            {selected && <ProviderDetail provider={selected} />}
          </SheetContent>
        </Sheet>
      ) : (
        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerContent className="max-h-[85vh]">
            <DrawerTitle className="sr-only">{selected?.name ?? ''}</DrawerTitle>
            <DrawerDescription className="sr-only">{selected?.description ?? ''}</DrawerDescription>
            <div className="overflow-y-auto">
              {selected && <ProviderDetail provider={selected} />}
            </div>
          </DrawerContent>
        </Drawer>
      )}
    </div>
  )
}
```

Key decisions:
- Reuses `PetsHeader` (which will have the "Aliados" link added in Task 6)
- Same Sheet/Drawer breakpoint as pets page (`min-width: 640px`)
- `pb-16 sm:pb-0` for mobile bottom nav clearance (same as pets page)

- [ ] **Step 2: Commit**

```bash
git add components/aliados/aliados-page.tsx
git commit -m "feat: create AliadosPage component with Sheet/Drawer detail"
```

---

## Task 4: ProviderGrid component

**Files:**
- Create: `components/aliados/provider-grid.tsx`

- [ ] **Step 1: Create ProviderGrid**

Mirror `components/pets/pet-grid.tsx` structure — filter pills at top, responsive grid, loading skeleton, empty state. Import `ProviderCard` from the shared location:

```tsx
'use client'

import { useTranslation } from 'react-i18next'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTruckFast, faDog, faScissors, faHouseChimney, faDumbbell, faHandshake } from '@fortawesome/free-solid-svg-icons'
import { UnifiedProvider } from '@/lib/api/providers'
import { ProviderCard } from '@/components/providers/provider-card'

type ServiceFilter = 'all' | 'transport' | 'walking' | 'grooming' | 'sitting' | 'training'

const SERVICE_FILTERS: { key: ServiceFilter; icon: typeof faTruckFast }[] = [
  { key: 'all', icon: faHandshake },
  { key: 'transport', icon: faTruckFast },
  { key: 'walking', icon: faDog },
  { key: 'grooming', icon: faScissors },
  { key: 'sitting', icon: faHouseChimney },
  { key: 'training', icon: faDumbbell },
]

interface ProviderGridProps {
  providers: UnifiedProvider[]
  loading: boolean
  error: string | null
  selectedId: string | null
  onSelect: (provider: UnifiedProvider) => void
}

export function ProviderGrid({ providers, loading, error, selectedId, onSelect }: ProviderGridProps) {
  const { t } = useTranslation('business')

  return (
    <div className="flex flex-col h-full">
      {/* Filter pills — display only for demo (non-functional) */}
      <div className="flex items-center gap-2 px-2 py-3 overflow-x-auto shrink-0 flex-wrap">
        {SERVICE_FILTERS.map((f) => (
          <button
            key={f.key}
            className={`shadow-xl flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-xl whitespace-nowrap transition-colors ${
              f.key === 'all'
                ? 'bg-pop-550 text-white'
                : 'bg-background text-foreground hover:bg-secondary/80'
            }`}
          >
            <FontAwesomeIcon icon={f.icon} className="text-xs" />
            {t(`aliados.filters.${f.key}`)}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-4 inset-shadow-2xl rounded-t-2xl shadow-2xl bg-background">
        {/* Loading skeleton */}
        {loading && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded-xl overflow-hidden bg-secondary animate-pulse">
                <div className="aspect-[4/3] bg-muted" />
                <div className="p-3 space-y-2">
                  <div className="h-4 bg-muted rounded w-2/3" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                  <div className="flex gap-1.5">
                    <div className="h-5 bg-muted rounded-full w-16" />
                    <div className="h-5 bg-muted rounded-full w-14" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error state */}
        {error && !loading && (
          <div className="flex items-center justify-center h-48 text-destructive">
            {t('aliados.error')}
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && providers.length === 0 && (
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-3">
            <FontAwesomeIcon icon={faHandshake} className="text-4xl opacity-30" />
            <p className="text-sm">{t('aliados.empty')}</p>
          </div>
        )}

        {/* Provider cards */}
        {!loading && !error && providers.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {providers.map((provider) => (
              <ProviderCard
                key={provider.id}
                provider={provider}
                selected={selectedId === provider.id}
                onClick={() => onSelect(provider)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
```

Key decisions:
- Same grid breakpoints as pet grid: `grid-cols-2 md:grid-cols-3 lg:grid-cols-4`, `gap-2`
- Same container styling: `inset-shadow-2xl rounded-t-2xl shadow-2xl bg-background`
- Filter pills are present but "all" is always active (non-functional for demo)
- Skeleton aspect ratio is `4/3` instead of `square` since provider cards show more info below the image
- Empty state uses `faHandshake` icon instead of `faPaw`
- `ProviderCard` is imported from `components/providers/provider-card.tsx` (created by business dashboard plan)

- [ ] **Step 2: Commit**

```bash
git add components/aliados/provider-grid.tsx
git commit -m "feat: create ProviderGrid with filter pills and loading skeleton"
```

---

## Task 5: ProviderDetail component

**Files:**
- Create: `components/aliados/provider-detail.tsx`

- [ ] **Step 1: Create ProviderDetail**

Mirror `components/pets/pet-detail.tsx` structure — cover photo/fallback at top, info section below, action button pinned at bottom:

```tsx
'use client'

import { useTranslation } from 'react-i18next'
import Image from 'next/image'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faCertificate,
  faCheck,
  faLocationDot,
  faEnvelope,
  faClock,
} from '@fortawesome/free-solid-svg-icons'
import { faInstagram } from '@fortawesome/free-brands-svg-icons'
import { UnifiedProvider } from '@/lib/api/providers'
import { OperatingHours } from '@/lib/api/businesses'
import { instagramUrl } from '@/lib/utils'

interface ProviderDetailProps {
  provider: UnifiedProvider
}

const DAY_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const

function formatTime(time: string): string {
  // "09:00" -> "9:00 AM", "14:00" -> "2:00 PM"
  const [h, m] = time.split(':').map(Number)
  const suffix = h >= 12 ? 'PM' : 'AM'
  const hour12 = h % 12 || 12
  return `${hour12}:${m.toString().padStart(2, '0')} ${suffix}`
}

export function ProviderDetail({ provider }: ProviderDetailProps) {
  const { t } = useTranslation('business')

  const isBusinessType = provider.type === 'business'
  const hours = provider.operating_hours as OperatingHours | undefined

  return (
    <div className="flex flex-col h-full">
      {/* Cover photo or gradient fallback */}
      <div className="relative shrink-0 bg-secondary">
        {provider.cover_photo_url ? (
          <div className="relative aspect-video">
            <Image
              src={provider.cover_photo_url}
              alt={provider.name}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 400px"
            />
          </div>
        ) : (
          <div className="aspect-video bg-gradient-to-br from-pop-550/20 to-pop-450/10 flex items-center justify-center">
            <span className="text-4xl font-bold text-muted-foreground/20">
              {provider.name.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Name + badge */}
        <div className="space-y-1">
          <h2 className="text-xl font-bold">{provider.name}</h2>
          <span className="inline-flex items-center gap-1.5 text-xs text-pop-550 font-medium">
            <span className="relative">
              <FontAwesomeIcon icon={faCertificate} className="text-sm text-pop-550" />
              <FontAwesomeIcon icon={faCheck} className="text-[7px] text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            </span>
            {isBusinessType ? t('aliados.verified_business') : t('aliados.verified_provider')}
          </span>
        </div>

        {/* Service badges */}
        {provider.services && provider.services.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {provider.services.map((service) => (
              <span
                key={service}
                className="inline-flex items-center px-2.5 py-1 bg-secondary text-secondary-foreground text-xs font-medium rounded-xl"
              >
                {service}
              </span>
            ))}
          </div>
        )}

        {/* Price */}
        {provider.price != null ? (
          <p className="text-lg font-semibold">RD${provider.price.toLocaleString()}</p>
        ) : (
          <p className="text-sm text-muted-foreground">{t('aliados.price_unavailable')}</p>
        )}

        {/* Description */}
        {provider.description && (
          <>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">{t('aliados.detail.description')}</p>
            <p className="text-sm text-muted-foreground leading-relaxed">{provider.description}</p>
          </>
        )}

        <hr className="border-border" />

        {/* Operating hours — businesses only */}
        {isBusinessType && hours && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
              <FontAwesomeIcon icon={faClock} className="text-xs" />
              {t('aliados.detail.hours')}
            </p>
            <div className="space-y-1">
              {DAY_KEYS.map((day) => {
                const dayData = hours[day]
                const isOpen = dayData?.open === true
                return (
                  <div key={day} className="flex items-center justify-between text-sm py-1">
                    <span className="font-medium text-foreground w-10">{t(`aliados.days.${day}`)}</span>
                    {isOpen && dayData ? (
                      <span className="text-muted-foreground">{formatTime(dayData.from)} - {formatTime(dayData.to)}</span>
                    ) : (
                      <span className="text-muted-foreground/50">{t('aliados.detail.closed')}</span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Address */}
        {provider.address && (
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
              <FontAwesomeIcon icon={faLocationDot} className="text-xs" />
              {t('aliados.detail.address')}
            </p>
            <p className="text-sm text-foreground">{provider.address}</p>
          </div>
        )}

        {/* Instagram — businesses only */}
        {isBusinessType && provider.instagram && (
          <a
            href={instagramUrl(provider.instagram)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <FontAwesomeIcon icon={faInstagram} className="text-sm" />
            @{provider.instagram.replace(/^@/, '')}
          </a>
        )}
      </div>

      {/* Contact button — disabled for demo */}
      <div className="p-4 border-t border-border shrink-0">
        <button
          disabled
          className="w-full py-2.5 bg-pop-550 text-white font-semibold rounded-xl opacity-50 cursor-not-allowed flex items-center justify-center gap-2"
        >
          <FontAwesomeIcon icon={faEnvelope} className="text-sm" />
          {t('aliados.detail.contact')}
        </button>
      </div>
    </div>
  )
}
```

Key decisions:
- Cover photo uses `aspect-video` (16:9) instead of `aspect-square` since business cover photos are wider
- Gradient fallback with provider initial letter when no cover photo
- Operating hours only render for `type === 'business'` — hidden for member providers
- `formatTime` helper converts 24h to 12h AM/PM format
- Trust badge reuses the same `faCertificate` + `faCheck` overlay pattern from the pet grid
- Contact button disabled with `opacity-50 cursor-not-allowed` — future: opens chat
- Instagram link uses shared `instagramUrl()` utility from `lib/utils`
- `provider.operating_hours` is cast to `OperatingHours` type from `lib/api/businesses.ts`

- [ ] **Step 2: Commit**

```bash
git add components/aliados/provider-detail.tsx
git commit -m "feat: create ProviderDetail with operating hours and contact"
```

---

## Task 6: Header link + mobile nav

**Files:**
- Modify: `components/pets/pets-header.tsx`
- Modify: `components/pets/public-mobile-nav.tsx`

- [ ] **Step 1: Add "Aliados" link to desktop nav in pets-header.tsx**

Import `faHandshake`:

```tsx
import { faCircleUser, faTableColumns, faArrowRightFromBracket, faPaw, faComments, faTruckFast, faHandshake } from '@fortawesome/free-solid-svg-icons'
```

Add a third `<Link>` in the `<nav>` element, after the "about" link:

```tsx
<nav className="hidden sm:flex items-center gap-20">
  <Link
    href="/pets"
    className={`text-xl text-foreground hover:text-pop-550 transition-colors ${pathname === '/pets' ? 'font-medium' : 'font-light'}`}
  >
    {t('header.pets')}
  </Link>
  <Link
    href="/aliados"
    className={`text-xl text-foreground hover:text-pop-550 transition-colors ${pathname === '/aliados' ? 'font-medium' : 'font-light'}`}
  >
    {t('header.aliados', { defaultValue: 'Aliados' })}
  </Link>
  <Link
    href="/about"
    className={`text-xl text-foreground hover:text-pop-550 transition-colors ${pathname === '/about' ? 'font-medium' : 'font-light'}`}
  >
    {t('header.about')}
  </Link>
</nav>
```

Also add `header.aliados` key to pet namespace translations (or use `defaultValue` as shown above to avoid adding keys to the wrong namespace). Using `defaultValue` is simpler since the business namespace already has the proper translation.

- [ ] **Step 2: Add "Aliados" item to PublicMobileNav**

In `components/pets/public-mobile-nav.tsx`, import `faHandshake` and add to items array:

```tsx
import { faPaw, faCircleInfo, faHandshake } from '@fortawesome/free-solid-svg-icons'

const items = [
  { href: '/pets', icon: faPaw, labelKey: 'header.pets' },
  { href: '/aliados', icon: faHandshake, labelKey: 'header.aliados', defaultLabel: 'Aliados' },
  { href: '/about', icon: faCircleInfo, labelKey: 'header.about' },
] as const
```

Update the rendering to handle the `defaultLabel` fallback:

```tsx
{t(labelKey, { defaultValue: ('defaultLabel' in item ? item.defaultLabel : undefined) })}
```

Alternatively, add `header.aliados` key to `public/locales/{es,en}/pets.json` to keep it simple and consistent with the existing pattern:

- `es/pets.json`: `"header": { ..., "aliados": "Aliados" }`
- `en/pets.json`: `"header": { ..., "aliados": "Partners" }`

This is the cleaner approach since all header keys live in the `pets` namespace.

- [ ] **Step 3: Add header.aliados to pets namespace translations**

In `public/locales/es/pets.json`, add to the `"header"` object:

```json
"aliados": "Aliados"
```

In `public/locales/en/pets.json`, add to the `"header"` object:

```json
"aliados": "Partners"
```

- [ ] **Step 4: Visual test**

Open `http://localhost:3000/pets` and verify:
- Desktop: "Aliados" link appears between "Mascotas" and "Nosotros" in the nav
- Mobile: "Aliados" tab appears in the bottom nav bar with handshake icon
- Clicking "Aliados" navigates to `/aliados`
- Active state highlights correctly on both desktop and mobile

- [ ] **Step 5: Commit**

```bash
git add components/pets/pets-header.tsx components/pets/public-mobile-nav.tsx public/locales/es/pets.json public/locales/en/pets.json
git commit -m "feat: add Aliados link to header and mobile nav"
```

---

## Review

After all tasks are complete, verify:

1. `/aliados` loads and shows the provider grid (or empty state if no providers in DB)
2. Desktop: clicking a card opens a Sheet from the right with provider detail
3. Mobile: clicking a card opens a Drawer from the bottom
4. Operating hours display correctly for business-type providers
5. Header nav shows Aliados on both desktop and mobile
6. Navigating between `/pets` and `/aliados` works — active state updates correctly
7. Loading skeleton appears briefly while data fetches
8. All text uses i18n keys from the `business` namespace (aliados section)
