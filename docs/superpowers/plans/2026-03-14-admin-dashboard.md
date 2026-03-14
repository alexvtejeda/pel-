# Admin Dashboard Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an internal admin dashboard at `/dashboard/admin` for managing rescue center registrations and the master adoption form template.

**Architecture:** Mirrors the RC dashboard pattern — `SidebarProvider` shell with sidebar (logo, 3 nav items, profile footer), tab-based content, mobile bottom nav. Protected by `AdminGuard` that checks `is_admin` from a fresh `/auth/me` call. New `lib/api/admin.ts` module for all admin API calls.

**Tech Stack:** React 19, Next.js 16 App Router, TailwindCSS v4, shadcn/ui Sidebar, Font Awesome icons.

**Spec:** `docs/superpowers/specs/2026-03-14-admin-dashboard-design.md`

---

## Chunk 1: Foundation — API Module, Guard, Route

### Task 1: Add `reject_reason` to RescueCenter interface

**Files:**
- Modify: `lib/api/rescue-centers.ts`

- [ ] **Step 1: Add the field**

Add `reject_reason?: string` to the `RescueCenter` interface, after `logo_url`:

```typescript
export interface RescueCenter {
  id: string
  user_id: string
  name: string
  rnc?: string
  website?: string
  instagram?: string
  phone: string
  address: string
  city: string
  status: string
  logo_url: string | null
  reject_reason?: string
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/api/rescue-centers.ts
git commit -m "feat: add reject_reason to RescueCenter interface"
```

---

### Task 2: Create admin API module

**Files:**
- Create: `lib/api/admin.ts`

- [ ] **Step 1: Create the module**

```typescript
import { apiClient } from './client'
import { RescueCenter } from './rescue-centers'
import { Form, FormField } from './forms'

// --- Rescue Centers ---

export async function listAllRescueCenters(): Promise<{ data: RescueCenter[] | null; error: string | null }> {
  try {
    const res = await apiClient('/api/v1/admin/rescue-centers')
    const json = await res.json()
    if (!res.ok) return { data: null, error: json.error || 'Error al cargar centros' }
    return { data: json, error: null }
  } catch {
    return { data: null, error: 'Error de conexión' }
  }
}

export async function approveRescueCenter(id: string): Promise<{ data: RescueCenter | null; error: string | null }> {
  try {
    const res = await apiClient(`/api/v1/admin/rescue-centers/${id}/approve`, { method: 'PATCH' })
    const json = await res.json()
    if (!res.ok) return { data: null, error: json.error || 'Error al aprobar' }
    return { data: json, error: null }
  } catch {
    return { data: null, error: 'Error de conexión' }
  }
}

export async function rejectRescueCenter(id: string, reason: string): Promise<{ data: RescueCenter | null; error: string | null }> {
  try {
    const res = await apiClient(`/api/v1/admin/rescue-centers/${id}/reject`, {
      method: 'PATCH',
      body: JSON.stringify({ reason }),
    })
    const json = await res.json()
    if (!res.ok) return { data: null, error: json.error || 'Error al rechazar' }
    return { data: json, error: null }
  } catch {
    return { data: null, error: 'Error de conexión' }
  }
}

export async function deleteRescueCenter(id: string): Promise<{ data: true | null; error: string | null }> {
  try {
    const res = await apiClient(`/api/v1/admin/rescue-centers/${id}`, { method: 'DELETE' })
    if (res.status === 204) return { data: true, error: null }
    const json = await res.json()
    return { data: null, error: json.error || 'Error al eliminar' }
  } catch {
    return { data: null, error: 'Error de conexión' }
  }
}

// --- Form Template ---

export async function getFormTemplate(): Promise<{ data: Form | null; error: string | null }> {
  try {
    const res = await apiClient('/api/v1/admin/forms/default')
    const json = await res.json()
    if (!res.ok) return { data: null, error: json.error || 'Error al cargar plantilla' }
    return { data: json, error: null }
  } catch {
    return { data: null, error: 'Error de conexión' }
  }
}

export async function updateFormTemplate(data: { name?: string; fields?: FormField[] }): Promise<{ data: Form | null; error: string | null }> {
  try {
    const res = await apiClient('/api/v1/admin/forms/default', {
      method: 'PUT',
      body: JSON.stringify(data),
    })
    const json = await res.json()
    if (!res.ok) return { data: null, error: json.error || 'Error al guardar plantilla' }
    return { data: json, error: null }
  } catch {
    return { data: null, error: 'Error de conexión' }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/api/admin.ts
git commit -m "feat: add admin API module"
```

---

### Task 3: Create AdminGuard component

**Files:**
- Create: `components/dashboard/admin/admin-guard.tsx`

- [ ] **Step 1: Create the guard**

Fetches `/auth/me` fresh (raw JSON, not from `AuthUser` type). Redirects to `/` if not admin.

```typescript
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { apiClient } from '@/lib/api/client'

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [status, setStatus] = useState<'loading' | 'admin' | 'denied'>('loading')

  useEffect(() => {
    apiClient('/api/v1/auth/me').then(async (res) => {
      if (!res.ok) { setStatus('denied'); return }
      const json = await res.json()
      setStatus(json.is_admin === true ? 'admin' : 'denied')
    }).catch(() => setStatus('denied'))
  }, [])

  useEffect(() => {
    if (status === 'denied') router.replace('/')
  }, [status, router])

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
      </div>
    )
  }

  if (status === 'denied') return null

  return <>{children}</>
}
```

- [ ] **Step 2: Commit**

```bash
git add components/dashboard/admin/admin-guard.tsx
git commit -m "feat: add AdminGuard component"
```

---

### Task 4: Create admin route layout and page

**Files:**
- Create: `app/dashboard/admin/layout.tsx`
- Create: `app/dashboard/admin/page.tsx`

- [ ] **Step 1: Create layout**

```typescript
import { ProtectedRoute } from '@/components/auth/protected-route'
import { AdminGuard } from '@/components/dashboard/admin/admin-guard'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <AdminGuard>
        {children}
      </AdminGuard>
    </ProtectedRoute>
  )
}
```

- [ ] **Step 2: Create page**

```typescript
import { AdminDashboardShell } from '@/components/dashboard/admin/admin-dashboard-shell'

export default function AdminPage() {
  return <AdminDashboardShell />
}
```

- [ ] **Step 3: Commit**

```bash
git add app/dashboard/admin/layout.tsx app/dashboard/admin/page.tsx
git commit -m "feat: add admin dashboard route"
```

---

## Chunk 2: Shell, Sidebar, Mobile Nav

### Task 5: Create admin sidebar

**Files:**
- Create: `components/dashboard/admin/admin-sidebar.tsx`

- [ ] **Step 1: Create the sidebar**

Mirrors `rescue-center-sidebar.tsx` pattern exactly, with 3 nav items.

```typescript
'use client'

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faShieldCat, faFileLines, faGear } from '@fortawesome/free-solid-svg-icons'
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

function nameFromEmail(email: string): string {
  const prefix = email.split('@')[0]
  return prefix
    .split(/[._+]/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

type Tab = 'rescue-centers' | 'form-template' | 'settings'

interface AdminSidebarProps {
  activeTab: Tab
  onTabChange: (tab: Tab) => void
}

const navItems: { tab: Tab; label: string; icon: IconDefinition }[] = [
  { tab: 'rescue-centers', label: 'Centros de rescate', icon: faShieldCat },
  { tab: 'form-template',  label: 'Formulario',        icon: faFileLines },
  { tab: 'settings',       label: 'Configuración',     icon: faGear },
]

export function AdminSidebar({ activeTab, onTabChange }: AdminSidebarProps) {
  const { state } = useSidebar()
  const { user } = useAuth()

  const email = user?.email ?? ''
  const displayName = email ? nameFromEmail(email) : ''
  const initial = email.charAt(0).toUpperCase()

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-3">
        <div className="flex flex-col items-center">
          <Logo showText={state === 'expanded'} width={32} height={32} />
          {state === 'expanded' && (
            <span className="text-[10px] text-muted-foreground mt-1">Admin</span>
          )}
        </div>
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
                <FontAwesomeIcon icon={icon} className="w-4 h-4" />
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
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-800 text-sm font-semibold text-white">
            {initial}
          </div>
          {state === 'expanded' && (
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-semibold text-foreground">{displayName}</span>
              <span className="truncate text-xs text-muted-foreground">{email}</span>
            </div>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/dashboard/admin/admin-sidebar.tsx
git commit -m "feat: add admin sidebar"
```

---

### Task 6: Create admin mobile bottom nav

**Files:**
- Create: `components/dashboard/admin/admin-mobile-nav.tsx`

- [ ] **Step 1: Create mobile nav**

```typescript
'use client'

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faShieldCat, faFileLines, faGear } from '@fortawesome/free-solid-svg-icons'
import { IconDefinition } from '@fortawesome/fontawesome-svg-core'

type Tab = 'rescue-centers' | 'form-template' | 'settings'

interface AdminMobileNavProps {
  activeTab: Tab
  onTabChange: (tab: Tab) => void
}

const navItems: { tab: Tab; label: string; icon: IconDefinition }[] = [
  { tab: 'rescue-centers', label: 'Centros',       icon: faShieldCat },
  { tab: 'form-template',  label: 'Formulario',    icon: faFileLines },
  { tab: 'settings',       label: 'Configuración', icon: faGear },
]

export function AdminMobileNav({ activeTab, onTabChange }: AdminMobileNavProps) {
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
              className={`w-5 h-5 ${activeTab === tab ? 'text-primary' : 'text-muted-foreground'}`}
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

- [ ] **Step 2: Commit**

```bash
git add components/dashboard/admin/admin-mobile-nav.tsx
git commit -m "feat: add admin mobile bottom nav"
```

---

### Task 7: Create admin dashboard shell

**Files:**
- Create: `components/dashboard/admin/admin-dashboard-shell.tsx`

- [ ] **Step 1: Create the shell**

```typescript
'use client'

import { useState } from 'react'
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar'
import { AdminSidebar } from './admin-sidebar'
import { RescueCentersTab } from './rescue-centers-tab'
import { AdminFormTab } from './admin-form-tab'
import { AdminSettingsTab } from './admin-settings-tab'
import { AdminMobileNav } from './admin-mobile-nav'

type Tab = 'rescue-centers' | 'form-template' | 'settings'

const tabTitles: Record<Tab, string> = {
  'rescue-centers': 'Centros de rescate',
  'form-template':  'Plantilla de adopción',
  'settings':       'Configuración',
}

export function AdminDashboardShell() {
  const [activeTab, setActiveTab] = useState<Tab>('rescue-centers')

  return (
    <SidebarProvider>
      <AdminSidebar activeTab={activeTab} onTabChange={setActiveTab} />
      <SidebarInset>
        <header className="bg-sidebar flex h-14 items-center gap-2 px-4">
          <SidebarTrigger className="hidden md:flex" />
          <h1 className="text-lg font-semibold flex-1">{tabTitles[activeTab]}</h1>
        </header>
        <main className="p-4 pb-20 md:pb-4">
          {activeTab === 'rescue-centers' && <RescueCentersTab />}
          {activeTab === 'form-template' && <AdminFormTab />}
          {activeTab === 'settings' && <AdminSettingsTab />}
        </main>
        <AdminMobileNav activeTab={activeTab} onTabChange={setActiveTab} />
      </SidebarInset>
    </SidebarProvider>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/dashboard/admin/admin-dashboard-shell.tsx
git commit -m "feat: add admin dashboard shell"
```

---

## Chunk 3: Tab Components

### Task 8: Create rescue centers tab

**Files:**
- Create: `components/dashboard/admin/rescue-centers-tab.tsx`

- [ ] **Step 1: Create the tab**

Card grid with status filter tabs, approve/reject/delete actions. Reject shows inline reason input. Delete shows alert dialog.

```typescript
'use client'

import { useEffect, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTrash, faMapMarkerAlt, faPhone } from '@fortawesome/free-solid-svg-icons'
import { RescueCenter } from '@/lib/api/rescue-centers'
import * as adminApi from '@/lib/api/admin'

type StatusFilter = 'all' | 'pending' | 'active' | 'rejected'

const statusLabels: Record<StatusFilter, string> = {
  all: 'Todos',
  pending: 'Pendientes',
  active: 'Activos',
  rejected: 'Rechazados',
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-500/20 text-yellow-500',
  active: 'bg-green-500/20 text-green-500',
  rejected: 'bg-red-500/20 text-red-500',
}

const statusText: Record<string, string> = {
  pending: 'Pendiente',
  active: 'Activo',
  rejected: 'Rechazado',
}

export function RescueCentersTab() {
  const [centers, setCenters] = useState<RescueCenter[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<StatusFilter>('all')

  // Reject state
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  // Delete state
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    adminApi.listAllRescueCenters().then(({ data, error: err }) => {
      if (err || !data) { setError(err || 'Error'); setLoading(false); return }
      setCenters(data)
      setLoading(false)
    })
  }, [])

  const filtered = filter === 'all' ? centers : centers.filter(c => c.status === filter)

  const handleApprove = async (id: string) => {
    const { data, error: err } = await adminApi.approveRescueCenter(id)
    if (err || !data) return
    setCenters(prev => prev.map(c => c.id === id ? data : c))
  }

  const handleReject = async (id: string) => {
    if (!rejectReason.trim()) return
    const { data, error: err } = await adminApi.rejectRescueCenter(id, rejectReason.trim())
    if (err || !data) return
    setCenters(prev => prev.map(c => c.id === id ? data : c))
    setRejectingId(null)
    setRejectReason('')
  }

  const handleDelete = async (id: string) => {
    const { error: err } = await adminApi.deleteRescueCenter(id)
    if (err) return
    setCenters(prev => prev.filter(c => c.id !== id))
    setDeletingId(null)
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  if (error) {
    return <p className="text-destructive text-sm py-8 text-center">{error}</p>
  }

  return (
    <div className="space-y-4">
      {/* Status filter tabs */}
      <div className="flex gap-1 bg-muted rounded-xl p-1 w-fit">
        {(Object.keys(statusLabels) as StatusFilter[]).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === s ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {statusLabels[s]}
          </button>
        ))}
      </div>

      {/* Card grid */}
      {filtered.length === 0 ? (
        <p className="text-muted-foreground text-sm py-8 text-center">
          No hay centros de rescate{filter !== 'all' ? ` con estado "${statusLabels[filter].toLowerCase()}"` : ''}.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((center) => (
            <div key={center.id} className="rounded-2xl border bg-card p-5 space-y-3">
              {/* Header */}
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold">{center.name}</h3>
                  <p className="text-sm text-muted-foreground">{center.rnc || ''}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-lg font-medium ${statusColors[center.status] || ''}`}>
                  {statusText[center.status] || center.status}
                </span>
              </div>

              {/* Details */}
              <div className="space-y-1 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <FontAwesomeIcon icon={faMapMarkerAlt} className="w-3.5 h-3.5" />
                  <span>{center.address}, {center.city}</span>
                </div>
                <div className="flex items-center gap-2">
                  <FontAwesomeIcon icon={faPhone} className="w-3.5 h-3.5" />
                  <span>{center.phone}</span>
                </div>
                {center.website && <p className="text-xs truncate">{center.website}</p>}
                {center.instagram && <p className="text-xs">{center.instagram}</p>}
              </div>

              {/* Reject reason */}
              {center.status === 'rejected' && center.reject_reason && (
                <p className="text-xs text-destructive bg-destructive/10 p-2 rounded-lg">
                  Razón: {center.reject_reason}
                </p>
              )}

              {/* Reject inline input */}
              {rejectingId === center.id && (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Razón del rechazo..."
                    className="w-full px-3 py-2 border border-input rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-ring focus:border-transparent"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleReject(center.id)}
                      disabled={!rejectReason.trim()}
                      className="flex-1 py-1.5 px-3 bg-destructive text-destructive-foreground rounded-xl text-sm font-medium hover:bg-destructive/90 transition-colors disabled:opacity-50"
                    >
                      Confirmar
                    </button>
                    <button
                      onClick={() => { setRejectingId(null); setRejectReason('') }}
                      className="flex-1 py-1.5 px-3 border border-input rounded-xl text-sm hover:bg-muted transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}

              {/* Actions */}
              {rejectingId !== center.id && (
                <div className="flex gap-2">
                  {center.status === 'pending' && (
                    <>
                      <button
                        onClick={() => handleApprove(center.id)}
                        className="flex-1 py-1.5 px-3 bg-green-500/20 border border-green-500/40 rounded-xl text-sm font-medium text-green-500 hover:bg-green-500/30 transition-colors"
                      >
                        Aprobar
                      </button>
                      <button
                        onClick={() => setRejectingId(center.id)}
                        className="flex-1 py-1.5 px-3 bg-destructive/20 border border-destructive/40 rounded-xl text-sm font-medium text-destructive hover:bg-destructive/30 transition-colors"
                      >
                        Rechazar
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => setDeletingId(center.id)}
                    className="py-1.5 px-3 border border-input rounded-xl text-sm text-muted-foreground hover:bg-muted transition-colors"
                  >
                    <FontAwesomeIcon icon={faTrash} className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Delete confirmation dialog */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDeletingId(null)} />
          <div className="relative bg-card rounded-2xl p-6 w-full max-w-sm space-y-4 border shadow-lg">
            <h3 className="font-semibold">¿Eliminar centro de rescate?</h3>
            <p className="text-sm text-muted-foreground">
              Esta acción no se puede deshacer. Se eliminará el centro de rescate y todos sus datos.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => handleDelete(deletingId)}
                className="flex-1 py-2 px-4 bg-destructive text-destructive-foreground rounded-xl text-sm font-medium hover:bg-destructive/90 transition-colors"
              >
                Eliminar
              </button>
              <button
                onClick={() => setDeletingId(null)}
                className="flex-1 py-2 px-4 border border-input rounded-xl text-sm hover:bg-muted transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/dashboard/admin/rescue-centers-tab.tsx
git commit -m "feat: add admin rescue centers tab with approve/reject/delete"
```

---

### Task 9: Create admin form template tab

**Files:**
- Create: `components/dashboard/admin/admin-form-tab.tsx`

- [ ] **Step 1: Create the tab**

This is a simplified copy of `components/dashboard/rescue-center/forms-tab.tsx`. The implementer MUST read that file in full (393 lines) and copy the form editor JSX.

**What to copy from `forms-tab.tsx`:** All field editing logic and JSX — `updateField`, `addField`, `deleteField`, `addOption`, `updateOption`, `deleteOption`, `addFollowUp`, drag handlers, the `FIELD_TYPES` array, `HAS_OPTIONS`, `typeInfo`, `makeField`, the field list JSX, field editor panel, add-field dropdown, preview mode toggle, and the `FormRenderer` preview.

**What to strip out:**
- `forms` list state, `activeFormId`, `switchForm`, `handleCreateForm`
- `logoUrl`, `rcName`, `LogoUpload` component and import
- Form selector dropdown in header
- `getMyRescueCenter`, `listForms`, `getForm`, `createForm` imports

**The key structural differences are shown below.** The implementer should build the full component by combining this skeleton with the field editor JSX from `forms-tab.tsx`:

```typescript
'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { IconDefinition } from '@fortawesome/fontawesome-svg-core'
import {
  faAlignLeft, faAlignJustify, faListCheck, faSquareCheck,
  faSort, faCalendar, faStar, faFile, faTrash, faPlus,
  faGripVertical, faChevronDown,
} from '@fortawesome/free-solid-svg-icons'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormField, FieldType } from '@/lib/api/forms'
import { FormRenderer } from '@/components/forms/form-renderer'
import * as adminApi from '@/lib/api/admin'

// --- Copy FIELD_TYPES, HAS_OPTIONS, typeInfo, makeField from forms-tab.tsx ---

export function AdminFormTab() {
  // Simplified state — NO forms list, NO activeFormId, NO logoUrl/rcName
  const [fields, setFields]               = useState<FormField[]>([])
  const [activeFieldId, setActiveFieldId] = useState<string | null>(null)
  const [view, setView]                   = useState<'edit' | 'preview'>('edit')
  const [dirty, setDirty]                 = useState(false)
  const [saving, setSaving]               = useState(false)
  const [saveMsg, setSaveMsg]             = useState('')
  const [newType, setNewType]             = useState<FieldType>('short_text')
  const [loading, setLoading]             = useState(true)

  const dragIndexRef = useRef<number | null>(null)
  const activeField = fields.find(f => f.id === activeFieldId) ?? null

  // Load master template on mount (replaces the RC forms list loading)
  useEffect(() => {
    adminApi.getFormTemplate().then(({ data }) => {
      if (data) setFields(data.fields)
      setLoading(false)
    })
  }, [])

  // Save calls admin API (replaces updateForm(activeFormId, { fields }))
  const handleSave = async () => {
    setSaving(true)
    const { error } = await adminApi.updateFormTemplate({ fields })
    setSaving(false)
    if (error) { setSaveMsg(`Error: ${error}`); return }
    setDirty(false)
    setSaveMsg('Guardado ✓')
    setTimeout(() => setSaveMsg(''), 2000)
  }

  // --- Copy ALL field editing functions from forms-tab.tsx ---
  // updateField, addField, deleteField, addOption, updateOption, deleteOption, addFollowUp, drag handlers

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  // --- Copy the return JSX from forms-tab.tsx ---
  // But replace the header:
  // - No form selector dropdown
  // - No "Nuevo formulario" button
  // - No LogoUpload section
  // - Static title "Plantilla de adopción" already shown in the shell header

  return (
    // ... field list + field editor panel + add field + preview toggle
    // Exact same JSX as forms-tab.tsx minus the RC-specific parts listed above
  )
}
```

The implementer must produce a complete file by merging this skeleton with the field editor code from `forms-tab.tsx`.

- [ ] **Step 2: Commit**

```bash
git add components/dashboard/admin/admin-form-tab.tsx
git commit -m "feat: add admin form template tab"
```

---

### Task 10: Create admin settings tab

**Files:**
- Create: `components/dashboard/admin/admin-settings-tab.tsx`

- [ ] **Step 1: Create the tab**

Minimal: email display + logout button.

```typescript
'use client'

import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/contexts/auth-context'

export function AdminSettingsTab() {
  const { user, logout } = useAuth()
  const router = useRouter()

  const handleLogout = async () => {
    await logout()
    router.push('/')
  }

  return (
    <div className="max-w-lg space-y-8">
      {/* Account info */}
      <div className="rounded-2xl border bg-card p-6 space-y-4">
        <h2 className="font-semibold">Cuenta</h2>
        <div className="text-sm">
          <p className="text-muted-foreground">Email</p>
          <p className="font-medium">{user?.email}</p>
        </div>
      </div>

      {/* Session */}
      <div className="rounded-2xl border bg-card p-6 space-y-4">
        <h2 className="font-semibold">Sesión</h2>
        <button
          onClick={handleLogout}
          className="px-4 py-2 border border-input rounded-xl text-sm hover:bg-muted transition-colors"
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/dashboard/admin/admin-settings-tab.tsx
git commit -m "feat: add admin settings tab"
```

---

### Task 11: Lint check and verification

- [ ] **Step 1: TypeScript check**

```bash
npx tsc --noEmit
```

Fix any type errors.

- [ ] **Step 2: Verify the admin dashboard loads**

Navigate to `http://localhost:3000/dashboard/admin` in the browser. Verify:
1. AdminGuard checks `/auth/me` — if not admin, redirects to `/`
2. If admin, sidebar renders with 3 tabs + profile footer
3. Rescue centers tab shows card grid (may be empty if no RCs exist)
4. Form template tab loads the master template editor
5. Settings tab shows email + logout

- [ ] **Step 3: Final commit if any fixes were made**

```bash
git add -A
git commit -m "fix: address issues found during admin dashboard testing"
```
