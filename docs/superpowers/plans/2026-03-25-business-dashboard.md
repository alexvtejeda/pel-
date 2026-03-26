# Business Dashboard & Provider Picker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give businesses a dashboard to manage service requests, and create shared ProviderCard + ProviderPicker components for transport provider selection.

**Architecture:** Mirrors the rescue center dashboard exactly — same SidebarProvider pattern, same tab state management, same mobile nav. The ProviderCard is a shared component used by both `/aliados` grid and the ProviderPicker modal. The ProviderPicker is used in chat and transport creation form.

**Tech Stack:** Next.js 16 (App Router), React 19, TailwindCSS v4, Font Awesome, react-i18next, shadcn/ui

**Spec:** `docs/superpowers/specs/2026-03-24-business-dashboard-design.md`

---

## File Structure

| Action | File | Responsibility |
|---|---|---|
| Create | `public/locales/es/business.json` | Spanish translations for business namespace |
| Create | `public/locales/en/business.json` | English translations for business namespace |
| Modify | `lib/i18n/index.ts` | Register business namespace |
| Modify | `lib/i18n/config.ts` | Add `'business'` to Namespace type |
| Create | `lib/api/providers.ts` | Public providers API (raw fetch, no apiClient) |
| Modify | `lib/api/admin.ts` | Add admin business endpoints |
| Modify | `lib/api/businesses.ts` | Add `updateBusiness`, add `price` to Business interface |
| Modify | `lib/api/transport.ts` | Add `role` param to `listTrips` |
| Create | `components/providers/provider-card.tsx` | Shared ProviderCard component |
| Create | `components/transport/provider-picker.tsx` | ProviderPicker modal |
| Create | `app/dashboard/business/layout.tsx` | ProtectedRoute wrapper for business role |
| Create | `app/dashboard/business/page.tsx` | Renders BusinessDashboardShell |
| Create | `components/dashboard/business/dashboard-shell.tsx` | Sidebar + header + tab content + mobile nav |
| Create | `components/dashboard/business/business-sidebar.tsx` | Sidebar nav items with icons |
| Create | `components/dashboard/business/mobile-bottom-nav.tsx` | Mobile bottom nav |
| Create | `components/dashboard/business/requests-tab.tsx` | Incoming trip requests list/detail |
| Create | `components/dashboard/business/settings-tab.tsx` | Business profile + MFA + account management |
| Modify | `components/dashboard/admin/rescue-centers-tab.tsx` | Add businesses with type badge + filter |

---

## Task 1: i18n — Create business namespace

**Files:**
- Create: `public/locales/es/business.json`
- Create: `public/locales/en/business.json`
- Modify: `lib/i18n/index.ts`
- Modify: `lib/i18n/config.ts`

- [ ] **Step 1: Create Spanish locale file**

Create `public/locales/es/business.json`:

```json
{
  "tabs": {
    "requests": "Solicitudes",
    "chat": "Chat",
    "agenda": "Agenda",
    "settings": "Configuración"
  },
  "request_status": {
    "pending": "Pendiente",
    "accepted": "Aceptado",
    "in_progress": "En curso",
    "completed": "Completado",
    "cancelled": "Cancelado"
  },
  "requests": {
    "empty": "No hay solicitudes",
    "empty_filtered": "No hay solicitudes con estado {{status}}",
    "filter_all": "Todas",
    "accept": "Aceptar",
    "reject": "Rechazar",
    "pickup": "Recogida",
    "dropoff": "Entrega",
    "requester": "Solicitante",
    "pet": "Mascota",
    "date": "Fecha",
    "status_update": {
      "picking_up": "En camino a recoger",
      "in_transit": "En tránsito",
      "completed": "Completado"
    },
    "open_in_waze": "Abrir en Waze",
    "open_in_maps": "Abrir en Google Maps",
    "conversation": "Ir a conversación"
  },
  "provider": {
    "select_title": "Selecciona un proveedor de transporte",
    "business_verified": "Empresa verificada",
    "member_verified": "Proveedor verificado",
    "price_unavailable": "Precio no disponible",
    "no_providers": "No hay proveedores disponibles"
  },
  "settings": {
    "profile": "Perfil del negocio",
    "display_name": "Nombre para mostrar",
    "business_name": "Nombre del negocio",
    "cover_photo": "Foto de portada",
    "phone": "Teléfono",
    "address": "Dirección",
    "instagram": "Instagram",
    "rnc": "RNC",
    "services_title": "Servicios",
    "price_label": "Precio por servicio",
    "price_placeholder": "¿Cuánto cobras por servicio?",
    "operating_hours": "Horario de operación",
    "other_service": "Otro servicio",
    "security": "Seguridad",
    "danger_zone": "Zona de peligro",
    "logout": "Cerrar sesión",
    "delete_account": "Eliminar cuenta",
    "save": "Guardar cambios",
    "saved": "Cambios guardados"
  },
  "admin": {
    "type_rescue_center": "Centro de Rescate",
    "type_business": "Empresa",
    "filter_all": "Todos",
    "filter_rescue_centers": "Centros de Rescate",
    "filter_businesses": "Empresas"
  }
}
```

- [ ] **Step 2: Create English locale file**

Create `public/locales/en/business.json`:

```json
{
  "tabs": {
    "requests": "Requests",
    "chat": "Chat",
    "agenda": "Agenda",
    "settings": "Settings"
  },
  "request_status": {
    "pending": "Pending",
    "accepted": "Accepted",
    "in_progress": "In Progress",
    "completed": "Completed",
    "cancelled": "Cancelled"
  },
  "requests": {
    "empty": "No requests",
    "empty_filtered": "No requests with status {{status}}",
    "filter_all": "All",
    "accept": "Accept",
    "reject": "Reject",
    "pickup": "Pickup",
    "dropoff": "Dropoff",
    "requester": "Requester",
    "pet": "Pet",
    "date": "Date",
    "status_update": {
      "picking_up": "On the way to pick up",
      "in_transit": "In transit",
      "completed": "Completed"
    },
    "open_in_waze": "Open in Waze",
    "open_in_maps": "Open in Google Maps",
    "conversation": "Go to conversation"
  },
  "provider": {
    "select_title": "Select a transport provider",
    "business_verified": "Verified business",
    "member_verified": "Verified provider",
    "price_unavailable": "Price unavailable",
    "no_providers": "No providers available"
  },
  "settings": {
    "profile": "Business profile",
    "display_name": "Display name",
    "business_name": "Business name",
    "cover_photo": "Cover photo",
    "phone": "Phone",
    "address": "Address",
    "instagram": "Instagram",
    "rnc": "RNC",
    "services_title": "Services",
    "price_label": "Price per service",
    "price_placeholder": "How much do you charge per service?",
    "operating_hours": "Operating hours",
    "other_service": "Other service",
    "security": "Security",
    "danger_zone": "Danger zone",
    "logout": "Log out",
    "delete_account": "Delete account",
    "save": "Save changes",
    "saved": "Changes saved"
  },
  "admin": {
    "type_rescue_center": "Rescue Center",
    "type_business": "Business",
    "filter_all": "All",
    "filter_rescue_centers": "Rescue Centers",
    "filter_businesses": "Businesses"
  }
}
```

- [ ] **Step 3: Register namespace in i18n index**

In `lib/i18n/index.ts`, add imports and register in resources:

```ts
import esBusiness from '@/public/locales/es/business.json'
import enBusiness from '@/public/locales/en/business.json'

// In resources:
es: { common: esCommon, landing: esLanding, auth: esAuth, pets: esPets, transport: esTransport, business: esBusiness },
en: { common: enCommon, landing: enLanding, auth: enAuth, pets: enPets, transport: enTransport, business: enBusiness },
```

- [ ] **Step 4: Update i18n config type**

In `lib/i18n/config.ts`, add `'business'` to the Namespace type:

```ts
export type Namespace = 'common' | 'landing' | 'auth' | 'pets' | 'chat' | 'transport' | 'business'
```

- [ ] **Step 5: Commit**

```bash
git add public/locales/es/business.json public/locales/en/business.json lib/i18n/index.ts lib/i18n/config.ts
git commit -m "feat(i18n): create business namespace with all dashboard translations"
```

---

## Task 2: API — Public providers module

**Files:**
- Create: `lib/api/providers.ts`

- [ ] **Step 1: Create providers API module**

Create `lib/api/providers.ts` — uses raw `fetch` (same pattern as `pets-public.ts`), no `apiClient`:

```ts
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

export interface UnifiedProvider {
  id: string
  user_id: string
  name: string
  type: 'business' | 'member'
  services: string[]
  description?: string
  price?: number | null
  cover_photo_url?: string | null
  operating_hours?: Record<string, { open: boolean; from: string; to: string }>
  instagram?: string
  address?: string
}

export interface ProviderFilters {
  service?: string
}

export async function listProviders(
  params?: ProviderFilters
): Promise<{ data: UnifiedProvider[] | null; error: string | null }> {
  try {
    const query = new URLSearchParams()
    if (params?.service) query.set('service', params.service)

    const qs = query.toString()
    const url = `${BASE_URL}/api/v1/providers${qs ? '?' + qs : ''}`
    const res = await fetch(url)
    const json = await res.json()
    if (!res.ok) return { data: null, error: json.error || 'Error al cargar proveedores' }
    return { data: json, error: null }
  } catch {
    return { data: null, error: 'Error de conexión' }
  }
}

export async function getProvider(
  id: string
): Promise<{ data: UnifiedProvider | null; error: string | null }> {
  try {
    const res = await fetch(`${BASE_URL}/api/v1/providers/${encodeURIComponent(id)}`)
    if (res.status === 404) return { data: null, error: null }
    const json = await res.json()
    if (!res.ok) return { data: null, error: json.error || 'Error al cargar proveedor' }
    return { data: json, error: null }
  } catch {
    return { data: null, error: 'Error de conexión' }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/api/providers.ts
git commit -m "feat(api): create public providers module with listProviders and getProvider"
```

---

## Task 3: API — Admin business endpoints

**Files:**
- Modify: `lib/api/admin.ts`

- [ ] **Step 1: Add AdminBusiness interface and functions**

Add to the bottom of `lib/api/admin.ts`:

```ts
import { Business } from './businesses'

// --- Businesses ---

export async function listAllBusinesses(): Promise<{ data: Business[] | null; error: string | null }> {
  try {
    const res = await apiClient('/api/v1/admin/businesses')
    const json = await res.json()
    if (!res.ok) return { data: null, error: json.error || 'Error al cargar negocios' }
    return { data: json, error: null }
  } catch {
    return { data: null, error: 'Error de conexión' }
  }
}

export async function approveBusiness(id: string): Promise<{ data: Business | null; error: string | null }> {
  try {
    const res = await apiClient(`/api/v1/admin/businesses/${id}/review`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'active' }),
    })
    const json = await res.json()
    if (!res.ok) return { data: null, error: json.error || 'Error al aprobar negocio' }
    return { data: json, error: null }
  } catch {
    return { data: null, error: 'Error de conexión' }
  }
}

export async function rejectBusiness(id: string, reason: string): Promise<{ data: Business | null; error: string | null }> {
  try {
    const res = await apiClient(`/api/v1/admin/businesses/${id}/review`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'rejected', reason }),
    })
    const json = await res.json()
    if (!res.ok) return { data: null, error: json.error || 'Error al rechazar negocio' }
    return { data: json, error: null }
  } catch {
    return { data: null, error: 'Error de conexión' }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/api/admin.ts
git commit -m "feat(api): add admin business list, approve, and reject endpoints"
```

---

## Task 4: API — Add price to businesses + update function

**Files:**
- Modify: `lib/api/businesses.ts`

- [ ] **Step 1: Add `price` to Business interface**

Add `price?: number | null` to the `Business` interface (after `status`):

```ts
export interface Business {
  // ... existing fields ...
  status: string
  price?: number | null
}
```

- [ ] **Step 2: Add `updateBusiness` function**

Add to the bottom of `lib/api/businesses.ts`:

```ts
export async function updateBusiness(
  data: Partial<CreateBusinessInput & { price?: number | null }>
): Promise<{ data: Business | null; error: string | null }> {
  try {
    const res = await apiClient('/api/v1/businesses/me', {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
    const json = await res.json()
    if (!res.ok) return { data: null, error: json.error || 'Error al actualizar negocio' }
    return { data: json, error: null }
  } catch {
    return { data: null, error: 'Error de conexión' }
  }
}
```

- [ ] **Step 3: Add `role` param to `listTrips` in transport.ts**

In `lib/api/transport.ts`, update `listTrips` to accept an optional `role` parameter:

```ts
export async function listTrips(role?: 'driver' | 'requester'): Promise<{ data: Trip[] | null; error: string | null }> {
  try {
    const query = role ? `?role=${role}` : ''
    const res = await apiClient(`/api/v1/transport${query}`)
    const json = await res.json()
    if (!res.ok) return { data: null, error: json.error || 'Error al cargar viajes' }
    return { data: json, error: null }
  } catch {
    return { data: null, error: 'Error de conexión' }
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add lib/api/businesses.ts lib/api/transport.ts
git commit -m "feat(api): add price to Business, updateBusiness function, role param to listTrips"
```

---

## Task 5: Shared ProviderCard component

**Files:**
- Create: `components/providers/provider-card.tsx`

- [ ] **Step 1: Create ProviderCard component**

Create `components/providers/provider-card.tsx`:

```tsx
'use client'

import { useTranslation } from 'react-i18next'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faShieldHalved, faBriefcase } from '@fortawesome/free-solid-svg-icons'
import { UnifiedProvider } from '@/lib/api/providers'
import Image from 'next/image'

interface ProviderCardProps {
  provider: UnifiedProvider
  onClick: () => void
}

export function ProviderCard({ provider, onClick }: ProviderCardProps) {
  const { t } = useTranslation('business')

  const initials = provider.name
    .split(' ')
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-xl border bg-card p-4 space-y-3 hover:bg-muted/50 transition-colors cursor-pointer"
    >
      {/* Header: photo/initials + name + trust badge */}
      <div className="flex items-center gap-3">
        {provider.cover_photo_url ? (
          <Image
            src={provider.cover_photo_url}
            alt={provider.name}
            width={48}
            height={48}
            className="rounded-full object-cover w-12 h-12"
          />
        ) : (
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-background">
            {initials}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm truncate">{provider.name}</h3>
          <div className="flex items-center gap-1.5 mt-0.5">
            <FontAwesomeIcon icon={faShieldHalved} className="text-xs text-green-500" />
            <span className="text-xs text-green-500">
              {provider.type === 'business'
                ? t('provider.business_verified')
                : t('provider.member_verified')}
            </span>
          </div>
        </div>
      </div>

      {/* Service badges */}
      {provider.services.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {provider.services.map(service => (
            <span
              key={service}
              className="text-xs px-2 py-0.5 rounded-xl bg-primary/10 text-primary font-medium"
            >
              {service}
            </span>
          ))}
        </div>
      )}

      {/* Price */}
      <div className="flex items-center gap-1.5">
        <FontAwesomeIcon icon={faBriefcase} className="text-xs text-muted-foreground" />
        <span className="text-sm font-medium">
          {provider.price != null
            ? `RD$${provider.price.toLocaleString()}`
            : t('provider.price_unavailable')}
        </span>
      </div>
    </button>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/providers/provider-card.tsx
git commit -m "feat: create shared ProviderCard component for provider grids and picker"
```

---

## Task 6: ProviderPicker component

**Files:**
- Create: `components/transport/provider-picker.tsx`

- [ ] **Step 1: Create ProviderPicker modal**

Create `components/transport/provider-picker.tsx`:

```tsx
'use client'

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ProviderCard } from '@/components/providers/provider-card'
import { listProviders, UnifiedProvider } from '@/lib/api/providers'

interface ProviderPickerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (userId: string) => void
  lat?: number
  lng?: number
}

export function ProviderPicker({ open, onOpenChange, onSelect, lat, lng }: ProviderPickerProps) {
  const { t } = useTranslation('business')
  const [providers, setProviders] = useState<UnifiedProvider[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    setError(null)
    listProviders({ service: 'transport' }).then(({ data, error: err }) => {
      if (err || !data) {
        setError(err || 'Error')
        setLoading(false)
        return
      }
      setProviders(data)
      setLoading(false)
    })
  }, [open])

  const handleSelect = (provider: UnifiedProvider) => {
    onSelect(provider.user_id)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('provider.select_title')}</DialogTitle>
        </DialogHeader>

        {loading && (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        )}

        {error && (
          <p className="text-destructive text-sm py-8 text-center">{error}</p>
        )}

        {!loading && !error && providers.length === 0 && (
          <p className="text-muted-foreground text-sm py-8 text-center">
            {t('provider.no_providers')}
          </p>
        )}

        {!loading && !error && providers.length > 0 && (
          <div className="grid grid-cols-1 gap-3">
            {providers.map(provider => (
              <ProviderCard
                key={provider.id}
                provider={provider}
                onClick={() => handleSelect(provider)}
              />
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/transport/provider-picker.tsx
git commit -m "feat: create ProviderPicker modal for transport provider selection"
```

---

## Task 7: Dashboard route + layout

**Files:**
- Create: `app/dashboard/business/layout.tsx`
- Create: `app/dashboard/business/page.tsx`

- [ ] **Step 1: Create layout with ProtectedRoute**

Create `app/dashboard/business/layout.tsx` (mirrors RC layout):

```tsx
import { ProtectedRoute } from '@/components/auth/protected-route'

export default function BusinessDashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute requireRole={['business']}>
      {children}
    </ProtectedRoute>
  )
}
```

Note: No `BusinessGuard` equivalent for now — the business wizard already gates access. If a guard is needed later, add it here.

- [ ] **Step 2: Create page**

Create `app/dashboard/business/page.tsx`:

```tsx
import { BusinessDashboardShell } from '@/components/dashboard/business/dashboard-shell'

export default function BusinessDashboardPage() {
  return <BusinessDashboardShell />
}
```

- [ ] **Step 3: Commit**

```bash
git add app/dashboard/business/layout.tsx app/dashboard/business/page.tsx
git commit -m "feat: create business dashboard route with ProtectedRoute layout"
```

---

## Task 8: Dashboard shell + sidebar + mobile nav

**Files:**
- Create: `components/dashboard/business/dashboard-shell.tsx`
- Create: `components/dashboard/business/business-sidebar.tsx`
- Create: `components/dashboard/business/mobile-bottom-nav.tsx`

- [ ] **Step 1: Create BusinessSidebar**

Create `components/dashboard/business/business-sidebar.tsx` — mirrors `rescue-center-sidebar.tsx`:

```tsx
'use client'

import React from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faClipboardList, faComments, faCalendarDays, faGear } from '@fortawesome/free-solid-svg-icons'
import { IconDefinition } from '@fortawesome/fontawesome-svg-core'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'
import { Logo } from '@/components/logo'
import { useAuth } from '@/lib/contexts/auth-context'
import { useTranslation } from 'react-i18next'

type Tab = 'requests' | 'chat' | 'agenda' | 'settings'

interface BusinessSidebarProps {
  activeTab: Tab
  onTabChange: (tab: Tab) => void
}

function nameFromEmail(email: string): string {
  return email.split('@')[0].split(/[._+]/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

export function BusinessSidebar({ activeTab, onTabChange }: BusinessSidebarProps) {
  const { state } = useSidebar()
  const { user } = useAuth()
  const { t } = useTranslation('business')

  const email = user?.email ?? ''
  const displayName = user?.display_name || (email ? nameFromEmail(email) : '')
  const initial = (displayName || email).charAt(0).toUpperCase()

  const navItems: { tab: Tab; label: string; icon: IconDefinition }[] = [
    { tab: 'requests', label: t('tabs.requests'), icon: faClipboardList },
    { tab: 'chat',     label: t('tabs.chat'),     icon: faComments },
    { tab: 'agenda',   label: t('tabs.agenda'),   icon: faCalendarDays },
    { tab: 'settings', label: t('tabs.settings'), icon: faGear },
  ]

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-3">
        <Logo showText={state === 'expanded'} width={32} height={32} />
      </SidebarHeader>

      <SidebarContent>
        <SidebarMenu className={`my-5 gap-8 ${state === 'collapsed' ? 'items-center gap-8' : ''}`}>
          {navItems.map(({ tab, label, icon }) => (
            <SidebarMenuItem key={tab}>
              <SidebarMenuButton
                isActive={activeTab === tab}
                onClick={() => onTabChange(tab)}
                tooltip={label}
                className={state === 'collapsed' ? 'p-3' : ''}
              >
                <FontAwesomeIcon icon={icon} className="text-md" />
                <span>{label}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="p-3">
        <div
          className={`flex items-center gap-3 cursor-pointer ${state === 'collapsed' ? 'justify-center' : ''}`}
          onClick={() => onTabChange('settings')}
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-background">
            {initial}
          </div>
          {state === 'expanded' && (
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-semibold text-background">{displayName}</span>
              <span className="truncate text-xs text-muted-foreground">{email}</span>
            </div>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
```

- [ ] **Step 2: Create MobileBottomNav**

Create `components/dashboard/business/mobile-bottom-nav.tsx` — mirrors RC mobile nav:

```tsx
'use client'

import { useTranslation } from 'react-i18next'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faClipboardList, faComments, faCalendarDays, faGear } from '@fortawesome/free-solid-svg-icons'
import { IconDefinition } from '@fortawesome/fontawesome-svg-core'

type Tab = 'requests' | 'chat' | 'agenda' | 'settings'

interface MobileBottomNavProps {
  activeTab: Tab
  onTabChange: (tab: Tab) => void
}

export function MobileBottomNav({ activeTab, onTabChange }: MobileBottomNavProps) {
  const { t } = useTranslation('business')

  const navItems: { tab: Tab; label: string; icon: IconDefinition }[] = [
    { tab: 'requests', label: t('tabs.requests'), icon: faClipboardList },
    { tab: 'chat',     label: t('tabs.chat'),     icon: faComments },
    { tab: 'agenda',   label: t('tabs.agenda'),   icon: faCalendarDays },
    { tab: 'settings', label: t('tabs.settings'), icon: faGear },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 md:hidden border-t bg-background z-50">
      <div className="flex items-center justify-around h-16">
        {navItems.map(({ tab, label, icon }) => (
          <button
            key={tab}
            onClick={() => onTabChange(tab)}
            className="flex flex-col items-center gap-1 flex-1 h-full justify-center"
          >
            <FontAwesomeIcon
              icon={icon}
              className={`text-lg ${activeTab === tab ? 'text-primary' : 'text-muted-foreground'}`}
            />
            <span
              className={`text-[10px] ${activeTab === tab ? 'text-primary font-medium' : 'text-muted-foreground'}`}
            >
              {label}
            </span>
          </button>
        ))}
      </div>
    </nav>
  )
}
```

- [ ] **Step 3: Create BusinessDashboardShell**

Create `components/dashboard/business/dashboard-shell.tsx` — mirrors RC dashboard-shell.tsx:

```tsx
'use client'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar'
import { BusinessSidebar } from './business-sidebar'
import { RequestsTab } from './requests-tab'
import { SettingsTab } from './settings-tab'
import { MobileBottomNav } from './mobile-bottom-nav'
import { ChatTab } from '@/components/dashboard/rescue-center/chat-tab'
import { AgendaTab, AgendaItem } from '@/components/dashboard/rescue-center/agenda-tab'
import { NotificationBell } from '@/components/dashboard/rescue-center/notification-bell'

type Tab = 'requests' | 'chat' | 'agenda' | 'settings'

const tabTitleKeys: Record<Tab, string> = {
  requests: 'tabs.requests',
  chat:     'tabs.chat',
  agenda:   'tabs.agenda',
  settings: 'tabs.settings',
}

export function BusinessDashboardShell() {
  const { t } = useTranslation('business')
  const [activeTab, setActiveTab] = useState<Tab>('requests')
  const [agendaItems, setAgendaItems] = useState<AgendaItem[]>([])

  return (
    <SidebarProvider>
      <BusinessSidebar activeTab={activeTab} onTabChange={setActiveTab} />
      <SidebarInset className="bg-sidebar h-screen overflow-hidden">
        <header className="bg-sidebar flex h-14 shrink-0 items-center gap-2 px-4 text-sidebar-foreground">
          <SidebarTrigger className="md:hidden" />
          <h1 className="text-lg font-semibold flex-1 text-sidebar-primary">{t(tabTitleKeys[activeTab])}</h1>
          <NotificationBell />
        </header>
        <main className={`bg-background md:rounded-tl-2xl flex-1 min-h-0 ${activeTab === 'chat' ? 'overflow-hidden pb-16 md:pb-0' : 'p-4 pb-20 md:pb-4 overflow-y-auto'}`}>
          {activeTab === 'requests' && <RequestsTab />}
          {activeTab === 'chat' && <ChatTab />}
          {activeTab === 'agenda' && <AgendaTab items={agendaItems} />}
          {activeTab === 'settings' && <SettingsTab />}
        </main>
        <MobileBottomNav activeTab={activeTab} onTabChange={setActiveTab} />
      </SidebarInset>
    </SidebarProvider>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add components/dashboard/business/dashboard-shell.tsx components/dashboard/business/business-sidebar.tsx components/dashboard/business/mobile-bottom-nav.tsx
git commit -m "feat: create business dashboard shell, sidebar, and mobile nav"
```

---

## Task 9: Requests tab

**Files:**
- Create: `components/dashboard/business/requests-tab.tsx`

- [ ] **Step 1: Create RequestsTab**

Create `components/dashboard/business/requests-tab.tsx` — mirrors interested-tab.tsx list/detail pattern with Trip data:

```tsx
'use client'

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faArrowLeft,
  faCheck,
  faTimes,
  faSpinner,
  faLocationDot,
  faComments,
  faMapLocationDot,
} from '@fortawesome/free-solid-svg-icons'
import { Trip, listTrips, acceptTrip, cancelTrip, updateTripStatus } from '@/lib/api/transport'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import Image from 'next/image'

type StatusFilter = 'all' | 'requested' | 'accepted' | 'active' | 'completed' | 'cancelled'

// Map backend statuses to display status keys
const STATUS_KEY_MAP: Record<string, string> = {
  requested: 'request_status.pending',
  accepted: 'request_status.accepted',
  picking_up: 'request_status.in_progress',
  in_transit: 'request_status.in_progress',
  completed: 'request_status.completed',
  cancelled: 'request_status.cancelled',
}

const STATUS_CLASSES: Record<string, string> = {
  requested: 'bg-amber-100 text-amber-700',
  accepted: 'bg-blue-100 text-blue-700',
  picking_up: 'bg-purple-100 text-purple-700',
  in_transit: 'bg-purple-100 text-purple-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-destructive/10 text-destructive',
}

export function RequestsTab() {
  const { t } = useTranslation('business')
  const [trips, setTrips] = useState<Trip[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<StatusFilter>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    listTrips('driver').then(({ data }) => {
      if (data) setTrips(data)
      setLoading(false)
    })
  }, [])

  const filtered = filter === 'all'
    ? trips
    : filter === 'active'
      ? trips.filter(t => t.status === 'picking_up' || t.status === 'in_transit')
      : trips.filter(t => t.status === filter)

  const selected = trips.find(t => t.id === selectedId)

  const handleAccept = async (id: string) => {
    setActionLoading(true)
    const { data } = await acceptTrip(id)
    if (data) setTrips(prev => prev.map(t => t.id === id ? data : t))
    setActionLoading(false)
  }

  const handleReject = async (id: string) => {
    setActionLoading(true)
    const { data } = await cancelTrip(id)
    if (data) setTrips(prev => prev.map(t => t.id === id ? data : t))
    setActionLoading(false)
  }

  const handleStatusUpdate = async (id: string, status: string) => {
    setActionLoading(true)
    const { data } = await updateTripStatus(id, status)
    if (data) setTrips(prev => prev.map(t => t.id === id ? data : t))
    setActionLoading(false)
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  // Detail view
  if (selected) {
    const pickup = selected.stops[0]
    const dropoff = selected.stops[selected.stops.length - 1]

    return (
      <div className="space-y-4">
        <button onClick={() => setSelectedId(null)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <FontAwesomeIcon icon={faArrowLeft} className="text-sm" />
          {t('requests.filter_all')}
        </button>

        <div className="rounded-2xl border bg-card p-5 space-y-4">
          {/* Addresses */}
          <div className="space-y-2">
            {pickup && (
              <div className="flex items-start gap-2">
                <FontAwesomeIcon icon={faLocationDot} className="text-sm text-green-500 mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">{t('requests.pickup')}</p>
                  <p className="text-sm">{pickup.address}</p>
                </div>
              </div>
            )}
            {dropoff && (
              <div className="flex items-start gap-2">
                <FontAwesomeIcon icon={faLocationDot} className="text-sm text-destructive mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">{t('requests.dropoff')}</p>
                  <p className="text-sm">{dropoff.address}</p>
                </div>
              </div>
            )}
          </div>

          {/* Status badge */}
          <span className={`inline-block text-xs px-2 py-1 rounded-xl font-medium ${STATUS_CLASSES[selected.status] || ''}`}>
            {t(STATUS_KEY_MAP[selected.status] || selected.status)}
          </span>

          {/* Map deep links for accepted/active trips */}
          {['accepted', 'picking_up', 'in_transit'].includes(selected.status) && pickup && (
            <div className="flex gap-2">
              <a
                href={`https://waze.com/ul?ll=${pickup.lat},${pickup.lng}&navigate=yes`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-2 px-3 border border-input rounded-xl text-sm text-center hover:bg-muted transition-colors"
              >
                <FontAwesomeIcon icon={faMapLocationDot} className="text-sm mr-1.5" />
                {t('requests.open_in_waze')}
              </a>
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${pickup.lat},${pickup.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-2 px-3 border border-input rounded-xl text-sm text-center hover:bg-muted transition-colors"
              >
                <FontAwesomeIcon icon={faMapLocationDot} className="text-sm mr-1.5" />
                {t('requests.open_in_maps')}
              </a>
            </div>
          )}

          {/* Action buttons for pending */}
          {selected.status === 'requested' && (
            <div className="flex gap-2">
              <button
                onClick={() => handleAccept(selected.id)}
                disabled={actionLoading}
                className="flex-1 py-2 px-3 bg-green-500/20 border border-green-500/40 rounded-xl text-sm font-medium text-green-500 hover:bg-green-500/30 transition-colors disabled:opacity-50"
              >
                <FontAwesomeIcon icon={faCheck} className="text-sm mr-1.5" />
                {t('requests.accept')}
              </button>
              <button
                onClick={() => handleReject(selected.id)}
                disabled={actionLoading}
                className="flex-1 py-2 px-3 bg-destructive/20 border border-destructive/40 rounded-xl text-sm font-medium text-destructive hover:bg-destructive/30 transition-colors disabled:opacity-50"
              >
                <FontAwesomeIcon icon={faTimes} className="text-sm mr-1.5" />
                {t('requests.reject')}
              </button>
            </div>
          )}

          {/* Status update buttons for active trips */}
          {selected.status === 'accepted' && (
            <button
              onClick={() => handleStatusUpdate(selected.id, 'picking_up')}
              disabled={actionLoading}
              className="w-full py-2 px-3 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {t('requests.status_update.picking_up')}
            </button>
          )}
          {selected.status === 'picking_up' && (
            <button
              onClick={() => handleStatusUpdate(selected.id, 'in_transit')}
              disabled={actionLoading}
              className="w-full py-2 px-3 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {t('requests.status_update.in_transit')}
            </button>
          )}
          {selected.status === 'in_transit' && (
            <button
              onClick={() => handleStatusUpdate(selected.id, 'completed')}
              disabled={actionLoading}
              className="w-full py-2 px-3 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {t('requests.status_update.completed')}
            </button>
          )}
        </div>
      </div>
    )
  }

  // List view
  const filters: StatusFilter[] = ['all', 'requested', 'accepted', 'active', 'completed', 'cancelled']
  const filterLabels: Record<StatusFilter, string> = {
    all: t('requests.filter_all'),
    requested: t('request_status.pending'),
    accepted: t('request_status.accepted'),
    active: t('request_status.in_progress'),
    completed: t('request_status.completed'),
    cancelled: t('request_status.cancelled'),
  }

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex gap-1 bg-muted rounded-xl p-1 w-fit overflow-x-auto">
        {filters.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
              filter === f ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {filterLabels[f]}
          </button>
        ))}
      </div>

      {/* Trip list */}
      {filtered.length === 0 ? (
        <p className="text-muted-foreground text-sm py-8 text-center">
          {filter === 'all' ? t('requests.empty') : t('requests.empty_filtered', { status: filterLabels[filter].toLowerCase() })}
        </p>
      ) : (
        <div className="space-y-3">
          {filtered.map(trip => {
            const pickup = trip.stops[0]
            const dropoff = trip.stops[trip.stops.length - 1]

            return (
              <button
                key={trip.id}
                onClick={() => setSelectedId(trip.id)}
                className="w-full text-left rounded-2xl border bg-card p-4 space-y-2 hover:bg-muted/50 transition-colors cursor-pointer"
              >
                <div className="flex justify-between items-start">
                  <div className="space-y-1 min-w-0 flex-1">
                    {pickup && (
                      <p className="text-sm truncate">
                        <FontAwesomeIcon icon={faLocationDot} className="text-xs text-green-500 mr-1" />
                        {pickup.address}
                      </p>
                    )}
                    {dropoff && (
                      <p className="text-sm truncate">
                        <FontAwesomeIcon icon={faLocationDot} className="text-xs text-destructive mr-1" />
                        {dropoff.address}
                      </p>
                    )}
                  </div>
                  <span className={`shrink-0 ml-2 text-xs px-2 py-1 rounded-xl font-medium ${STATUS_CLASSES[trip.status] || ''}`}>
                    {t(STATUS_KEY_MAP[trip.status] || trip.status)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(trip.created_at), { addSuffix: true, locale: es })}
                </p>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
```

Note: The Trip interface currently only has IDs for requester/pet. Once the backend enriches the response with requester name and pet details (per spec backend changes), update this component to display that data. For now, the list shows addresses and status only.

- [ ] **Step 2: Commit**

```bash
git add components/dashboard/business/requests-tab.tsx
git commit -m "feat: create business requests tab with list/detail view and trip actions"
```

---

## Task 10: Settings tab

**Files:**
- Create: `components/dashboard/business/settings-tab.tsx`

- [ ] **Step 1: Create SettingsTab**

Create `components/dashboard/business/settings-tab.tsx` — mirrors RC settings tab with business-specific fields:

```tsx
'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/contexts/auth-context'
import { useTranslation } from 'react-i18next'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faKey, faMobileScreen, faEnvelope, faPlus, faArrowUpFromBracket } from '@fortawesome/free-solid-svg-icons'
import { getMyBusiness, updateBusiness, uploadBusinessPhoto, Business, DayHours, OperatingHours } from '@/lib/api/businesses'
import { apiClient } from '@/lib/api/client'
import * as mfaApi from '@/lib/api/mfa'
import { MfaMethodInfo } from '@/lib/types/user'
import { MfaPasswordConfirm } from '@/components/auth/mfa/mfa-password-confirm'
import { MfaRecoveryModal } from '@/components/auth/mfa/mfa-recovery-modal'
import { MfaEnrollment } from '@/components/auth/mfa/mfa-enrollment'
import Image from 'next/image'

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const
const DAY_LABELS: Record<string, string> = {
  monday: 'Lunes', tuesday: 'Martes', wednesday: 'Miércoles', thursday: 'Jueves',
  friday: 'Viernes', saturday: 'Sábado', sunday: 'Domingo',
}

const SERVICES = ['transport', 'grooming', 'walking', 'sitting', 'training', 'veterinary']

export function SettingsTab() {
  const { user, logout } = useAuth()
  const router = useRouter()
  const { t } = useTranslation('business')

  // Business state
  const [business, setBusiness] = useState<Business | null>(null)
  const [displayName, setDisplayName] = useState(user?.display_name || '')
  const [businessName, setBusinessName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [instagram, setInstagram] = useState('')
  const [rnc, setRnc] = useState('')
  const [description, setDescription] = useState('')
  const [services, setServices] = useState<string[]>([])
  const [otherService, setOtherService] = useState('')
  const [price, setPrice] = useState<string>('')
  const [operatingHours, setOperatingHours] = useState<OperatingHours>({})
  const [coverPhotoUrl, setCoverPhotoUrl] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // MFA state (reuse RC pattern)
  const [mfaMethods, setMfaMethods] = useState<MfaMethodInfo[]>([])
  const [mfaEnabled, setMfaEnabled] = useState(false)
  const [recoveryRemaining, setRecoveryRemaining] = useState(0)
  const [deleteTarget, setDeleteTarget] = useState<MfaMethodInfo | null>(null)
  const [mfaDeleteError, setMfaDeleteError] = useState<string | null>(null)
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null)
  const [showAddMethod, setShowAddMethod] = useState(false)

  // Account state
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    getMyBusiness().then(({ data }) => {
      if (data) {
        setBusiness(data)
        setBusinessName(data.name)
        setPhone(data.phone)
        setAddress(data.address)
        setInstagram(data.instagram || '')
        setRnc(data.rnc || '')
        setDescription(data.description || '')
        setServices(data.services || [])
        setOtherService(data.other_service || '')
        setPrice(data.price != null ? String(data.price) : '')
        setOperatingHours(data.operating_hours || {})
        setCoverPhotoUrl(data.cover_photo_url || null)
      }
    })
  }, [])

  useEffect(() => {
    mfaApi.getMethods().then(({ data }) => {
      if (data) {
        setMfaMethods(Array.isArray(data.methods) ? data.methods : [])
        setMfaEnabled(data.mfa_enabled)
        setRecoveryRemaining(data.recovery_codes_remaining)
      }
    })
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    // Save display name
    await apiClient('/api/v1/auth/profile', {
      method: 'PATCH',
      body: JSON.stringify({ display_name: displayName }),
    })
    // Save business fields
    await updateBusiness({
      name: businessName,
      phone,
      address,
      instagram: instagram || undefined,
      rnc: rnc || undefined,
      description: description || undefined,
      services,
      other_service: otherService || undefined,
      operating_hours: operatingHours,
      price: price ? Number(price) : null,
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const { data } = await uploadBusinessPhoto(file)
    if (data) setCoverPhotoUrl(data.url)
  }

  const toggleService = (service: string) => {
    setServices(prev => prev.includes(service) ? prev.filter(s => s !== service) : [...prev, service])
  }

  const updateDayHours = (day: string, field: keyof DayHours, value: string | boolean) => {
    setOperatingHours(prev => ({
      ...prev,
      [day]: { ...(prev as Record<string, DayHours>)[day] || { open: false, from: '09:00', to: '18:00' }, [field]: value },
    }))
  }

  const handleDeleteMethod = async (password: string) => {
    if (!deleteTarget) return
    setMfaDeleteError(null)
    let result
    if (deleteTarget.type === 'totp') result = await mfaApi.deleteTotp(password)
    else if (deleteTarget.type === 'webauthn') result = await mfaApi.deleteWebauthn(deleteTarget.id!, password)
    else if (deleteTarget.type === 'email') result = await mfaApi.deleteEmail(password)
    else return
    if (result?.error) { setMfaDeleteError(result.error); return }
    setDeleteTarget(null)
    const refreshed = await mfaApi.getMethods()
    if (refreshed.data) {
      setMfaMethods(Array.isArray(refreshed.data.methods) ? refreshed.data.methods : [])
      setMfaEnabled(refreshed.data.mfa_enabled)
      setRecoveryRemaining(refreshed.data.recovery_codes_remaining)
    }
  }

  if (showAddMethod) {
    return (
      <MfaEnrollment
        onComplete={() => {
          setShowAddMethod(false)
          mfaApi.getMethods().then(({ data }) => {
            if (data) {
              setMfaMethods(Array.isArray(data.methods) ? data.methods : [])
              setMfaEnabled(data.mfa_enabled)
              setRecoveryRemaining(data.recovery_codes_remaining)
            }
          })
        }}
        onSkip={() => setShowAddMethod(false)}
      />
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Profile Section */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">{t('settings.profile')}</h2>

        <div className="space-y-3">
          <div>
            <label className="text-sm text-muted-foreground">{t('settings.display_name')}</label>
            <input type="text" value={displayName} onChange={e => setDisplayName(e.target.value)}
              className="w-full mt-1 px-3 py-2 border border-input rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-ring" />
          </div>
          <div>
            <label className="text-sm text-muted-foreground">{t('settings.business_name')}</label>
            <input type="text" value={businessName} onChange={e => setBusinessName(e.target.value)}
              className="w-full mt-1 px-3 py-2 border border-input rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-ring" />
          </div>

          {/* Cover photo */}
          <div>
            <label className="text-sm text-muted-foreground">{t('settings.cover_photo')}</label>
            <div className="mt-1">
              {coverPhotoUrl ? (
                <div className="relative w-full h-32 rounded-xl overflow-hidden cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                  <Image src={coverPhotoUrl} alt="Cover" fill className="object-cover" />
                </div>
              ) : (
                <button onClick={() => fileInputRef.current?.click()}
                  className="w-full h-32 border-2 border-dashed border-input rounded-xl flex flex-col items-center justify-center gap-2 text-muted-foreground hover:bg-muted/50 transition-colors">
                  <FontAwesomeIcon icon={faArrowUpFromBracket} className="text-lg" />
                  <span className="text-sm">{t('settings.cover_photo')}</span>
                </button>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
            </div>
          </div>

          <div>
            <label className="text-sm text-muted-foreground">{t('settings.phone')}</label>
            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
              className="w-full mt-1 px-3 py-2 border border-input rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-ring" />
          </div>
          <div>
            <label className="text-sm text-muted-foreground">{t('settings.address')}</label>
            <input type="text" value={address} onChange={e => setAddress(e.target.value)}
              className="w-full mt-1 px-3 py-2 border border-input rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-ring" />
          </div>
          <div>
            <label className="text-sm text-muted-foreground">{t('settings.instagram')}</label>
            <input type="text" value={instagram} onChange={e => setInstagram(e.target.value)}
              className="w-full mt-1 px-3 py-2 border border-input rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-ring" />
          </div>
          <div>
            <label className="text-sm text-muted-foreground">{t('settings.rnc')}</label>
            <input type="text" value={rnc} onChange={e => setRnc(e.target.value)}
              className="w-full mt-1 px-3 py-2 border border-input rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-ring" />
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">{t('settings.services_title')}</h2>

        <div className="flex flex-wrap gap-2">
          {SERVICES.map(service => (
            <button key={service} onClick={() => toggleService(service)}
              className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-colors ${
                services.includes(service)
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}>
              {service}
            </button>
          ))}
        </div>

        <div>
          <label className="text-sm text-muted-foreground">{t('settings.other_service')}</label>
          <input type="text" value={otherService} onChange={e => setOtherService(e.target.value)}
            className="w-full mt-1 px-3 py-2 border border-input rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-ring" />
        </div>

        <div>
          <label className="text-sm text-muted-foreground">{t('settings.price_label')}</label>
          <input type="number" value={price} onChange={e => setPrice(e.target.value)}
            placeholder={t('settings.price_placeholder')}
            className="w-full mt-1 px-3 py-2 border border-input rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-ring" />
        </div>

        {/* Operating hours */}
        <div>
          <label className="text-sm text-muted-foreground mb-2 block">{t('settings.operating_hours')}</label>
          <div className="space-y-2">
            {DAYS.map(day => {
              const dh = (operatingHours as Record<string, DayHours>)[day] || { open: false, from: '09:00', to: '18:00' }
              return (
                <div key={day} className="flex items-center gap-3">
                  <label className="flex items-center gap-2 w-28">
                    <input type="checkbox" checked={dh.open} onChange={e => updateDayHours(day, 'open', e.target.checked)}
                      className="rounded" />
                    <span className="text-sm">{DAY_LABELS[day]}</span>
                  </label>
                  {dh.open && (
                    <>
                      <input type="time" value={dh.from} onChange={e => updateDayHours(day, 'from', e.target.value)}
                        className="px-2 py-1 border border-input rounded-xl text-sm" />
                      <span className="text-sm text-muted-foreground">-</span>
                      <input type="time" value={dh.to} onChange={e => updateDayHours(day, 'to', e.target.value)}
                        className="px-2 py-1 border border-input rounded-xl text-sm" />
                    </>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Save button */}
      <button onClick={handleSave} disabled={saving}
        className="w-full py-2.5 px-4 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
        {saving ? '...' : saved ? t('settings.saved') : t('settings.save')}
      </button>

      {/* Security Section */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">{t('settings.security')}</h2>

        {mfaMethods.length > 0 && (
          <div className="space-y-2">
            {mfaMethods.map((method, i) => {
              const icon = method.type === 'totp' ? faKey : method.type === 'webauthn' ? faMobileScreen : faEnvelope
              return (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl border bg-card">
                  <div className="flex items-center gap-2">
                    <FontAwesomeIcon icon={icon} className="text-sm" />
                    <span className="text-sm">{method.type.toUpperCase()}</span>
                  </div>
                  <button onClick={() => setDeleteTarget(method)}
                    className="text-xs text-destructive hover:underline">
                    Eliminar
                  </button>
                </div>
              )
            })}
          </div>
        )}

        <button onClick={() => setShowAddMethod(true)}
          className="flex items-center gap-2 px-3 py-2 border border-input rounded-xl text-sm hover:bg-muted transition-colors">
          <FontAwesomeIcon icon={faPlus} className="text-sm" />
          Agregar método
        </button>

        {recoveryRemaining > 0 && (
          <p className="text-xs text-muted-foreground">
            Códigos de recuperación restantes: {recoveryRemaining}
          </p>
        )}
      </section>

      {/* Danger Zone */}
      <section className="space-y-4 border-t border-destructive/30 pt-6">
        <h2 className="text-lg font-semibold text-destructive">{t('settings.danger_zone')}</h2>

        <button onClick={() => { logout(); router.push('/') }}
          className="w-full py-2.5 px-4 border border-input rounded-xl text-sm hover:bg-muted transition-colors">
          {t('settings.logout')}
        </button>

        <button onClick={() => setConfirmDelete(true)}
          className="w-full py-2.5 px-4 bg-destructive/10 border border-destructive/30 rounded-xl text-sm text-destructive hover:bg-destructive/20 transition-colors">
          {t('settings.delete_account')}
        </button>
      </section>

      {/* MFA delete password confirm */}
      {deleteTarget && (
        <MfaPasswordConfirm
          open={!!deleteTarget}
          onConfirm={handleDeleteMethod}
          onCancel={() => { setDeleteTarget(null); setMfaDeleteError(null) }}
          error={mfaDeleteError}
        />
      )}

      {/* Recovery codes modal */}
      {recoveryCodes && (
        <MfaRecoveryModal codes={recoveryCodes} onClose={() => setRecoveryCodes(null)} />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/dashboard/business/settings-tab.tsx
git commit -m "feat: create business settings tab with profile, services, MFA, and danger zone"
```

---

## Task 11: Admin — Businesses in RC tab (temporary)

**Files:**
- Modify: `components/dashboard/admin/rescue-centers-tab.tsx`

- [ ] **Step 1: Add business imports and state**

At the top of the file, add imports:

```ts
import { Business } from '@/lib/api/businesses'
import * as adminApi from '@/lib/api/admin'
```

Add new state variables inside `RescueCentersTab`:

```ts
const [businesses, setBusinesses] = useState<Business[]>([])
const [typeFilter, setTypeFilter] = useState<'all' | 'rescue_center' | 'business'>('all')
```

- [ ] **Step 2: Fetch businesses alongside RCs**

In the existing `useEffect`, add a parallel fetch for businesses:

```ts
useEffect(() => {
  Promise.all([
    adminApi.listAllRescueCenters(),
    adminApi.listAllBusinesses(),
  ]).then(([rcResult, bizResult]) => {
    if (rcResult.error || !rcResult.data) { setError(rcResult.error || 'Error'); setLoading(false); return }
    setCenters(rcResult.data)
    if (bizResult.data) setBusinesses(bizResult.data)
    setLoading(false)
  })
}, [])
```

- [ ] **Step 3: Create a unified list type and combine data**

Create a union type and combine the two lists for rendering. Each item gets a `_type` field:

```ts
type UnifiedItem = (RescueCenter & { _type: 'rescue_center' }) | (Business & { _type: 'business' })

const allItems: UnifiedItem[] = [
  ...centers.map(c => ({ ...c, _type: 'rescue_center' as const })),
  ...businesses.map(b => ({ ...b, _type: 'business' as const })),
]

const filteredByType = typeFilter === 'all'
  ? allItems
  : allItems.filter(i => i._type === typeFilter)

const filteredItems = filter === 'all'
  ? filteredByType
  : filteredByType.filter(i => i.status === filter)
```

- [ ] **Step 4: Add type filter buttons**

Above the existing status filter, add a type filter row using i18n keys from the `business` namespace:

```tsx
<div className="flex gap-1 bg-muted rounded-xl p-1 w-fit">
  <button onClick={() => setTypeFilter('all')}
    className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-colors ${typeFilter === 'all' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
    {t('admin.filter_all', { ns: 'business' })}
  </button>
  <button onClick={() => setTypeFilter('rescue_center')}
    className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-colors ${typeFilter === 'rescue_center' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
    {t('admin.filter_rescue_centers', { ns: 'business' })}
  </button>
  <button onClick={() => setTypeFilter('business')}
    className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-colors ${typeFilter === 'business' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
    {t('admin.filter_businesses', { ns: 'business' })}
  </button>
</div>
```

- [ ] **Step 5: Add type badge to each card**

Inside each card's header, add a type badge next to the status badge:

```tsx
<span className={`text-xs px-2 py-1 rounded-xl font-medium ${
  item._type === 'rescue_center' ? 'bg-blue-500/20 text-blue-500' : 'bg-amber-500/20 text-amber-500'
}`}>
  {item._type === 'rescue_center'
    ? t('admin.type_rescue_center', { ns: 'business' })
    : t('admin.type_business', { ns: 'business' })}
</span>
```

- [ ] **Step 6: Wire approve/reject for businesses**

Add business-specific handler variants that call `approveBusiness` / `rejectBusiness` instead of `approveRescueCenter` / `rejectRescueCenter`. Choose the right handler based on `item._type`.

- [ ] **Step 7: Commit**

```bash
git add components/dashboard/admin/rescue-centers-tab.tsx
git commit -m "feat(admin): combine businesses into RC tab with type badges and filter"
```
