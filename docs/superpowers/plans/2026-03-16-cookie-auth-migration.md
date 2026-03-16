# Cookie-Based Auth Migration Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate frontend auth from localStorage-based JWT tokens to HTTP-only cookie-based sessions. Remove all token storage/reading code and use `credentials: 'include'` on every fetch call.

**Architecture:** The backend now sets tokens as HTTP-only cookies. The frontend stops managing tokens entirely — `apiClient()` adds `credentials: 'include'` so the browser sends cookies automatically. Auth state bootstraps via `GET /auth/me` on every app load. MFA verification uses cookies too — no `mfa_token` passing.

**Tech Stack:** React 19, Next.js 16 App Router, `credentials: 'include'` fetch option.

**Spec:** `docs/superpowers/specs/2026-03-16-cookie-auth-migration-design.md`

---

## Chunk 1: Core Auth Layer (client, types, auth API, context)

### Task 1: Rewrite `lib/api/client.ts`

**Files:**
- Modify: `lib/api/client.ts`

- [ ] **Step 1: Replace the entire file**

Remove all localStorage functions. Rewrite `apiClient` with `credentials: 'include'`. New `signalSessionCleared()` replaces `clearSession()`.

```typescript
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

// --- Session event ---

export function signalSessionCleared() {
  window.dispatchEvent(new Event('pelu:session-cleared'))
}

// --- Token refresh ---

async function attemptRefresh(): Promise<boolean> {
  const res = await fetch(`${BASE_URL}/api/v1/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
  })

  if (!res.ok) {
    signalSessionCleared()
    return false
  }

  return true
}

// --- Fetch wrapper ---

export async function apiClient(path: string, options: RequestInit = {}): Promise<Response> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  })

  if (res.status === 401) {
    const refreshed = await attemptRefresh()
    if (refreshed) {
      return fetch(`${BASE_URL}${path}`, {
        ...options,
        headers,
        credentials: 'include',
      })
    }
  }

  return res
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/api/client.ts
git commit -m "refactor: rewrite apiClient for cookie-based auth"
```

---

### Task 2: Update types in `lib/types/user.ts`

**Files:**
- Modify: `lib/types/user.ts`

- [ ] **Step 1: Update the types**

```typescript
export type UserRole = 'member' | 'rescue_center' | 'business'
export type Language = 'es' | 'en'

export interface AuthUser {
  id: string
  email: string
  role: UserRole | null
  auth_provider: string
  preferred_lang: string
  display_name: string | null
  mfa_setup_required?: boolean
}

export interface AuthResponse {
  user: AuthUser
}

export interface MfaChallengeResponse {
  mfa_required: true
  preferred_method: MfaMethod
  available_methods: MfaMethod[]
}

export type MfaMethod = 'webauthn' | 'totp' | 'email' | 'recovery'

export interface MfaMethodInfo {
  type: MfaMethod
  id?: string
  name?: string
  created_at: string
}

export interface MfaMethodsResponse {
  mfa_enabled: boolean
  methods: MfaMethodInfo[]
  recovery_codes_remaining: number
}

export type LoginResponse = AuthResponse | MfaChallengeResponse

export function isMfaChallenge(res: LoginResponse): res is MfaChallengeResponse {
  return 'mfa_required' in res && res.mfa_required === true
}
```

Key changes: `AuthResponse` no longer has `access_token`/`refresh_token`. `MfaChallengeResponse` no longer has `mfa_token`. `AuthUser` gains `mfa_setup_required`.

- [ ] **Step 2: Commit**

```bash
git add lib/types/user.ts
git commit -m "refactor: update auth types for cookie-based sessions"
```

---

### Task 3: Rewrite `lib/api/auth.ts`

**Files:**
- Modify: `lib/api/auth.ts`

- [ ] **Step 1: Replace the entire file**

```typescript
import { UserRole, LoginResponse, isMfaChallenge } from '@/lib/types/user'
import { apiClient } from './client'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

export async function login(email: string, password: string): Promise<{ data: LoginResponse | null; error: string | null }> {
  const res = await fetch(`${BASE_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email, password }),
  })
  const json = await res.json()
  if (!res.ok) return { data: null, error: json.error || 'Error al iniciar sesión' }
  return { data: json, error: null }
}

export async function register(email: string, password: string): Promise<{ data: { user: { id: string; email: string; role: null } } | null; error: string | null }> {
  const res = await fetch(`${BASE_URL}/api/v1/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email, password }),
  })
  const json = await res.json()
  if (!res.ok) return { data: null, error: json.error || 'Error al crear cuenta' }
  return { data: json, error: null }
}

export async function logout(): Promise<void> {
  apiClient('/api/v1/auth/logout', { method: 'DELETE' }).catch(() => {})
}

export async function setRole(role: UserRole): Promise<{ data: { user: { role: UserRole } } | null; error: string | null }> {
  const res = await apiClient('/api/v1/auth/role', {
    method: 'PATCH',
    body: JSON.stringify({ role }),
  })
  const json = await res.json()
  if (!res.ok) return { data: null, error: json.error || 'Error al seleccionar rol' }
  return { data: json, error: null }
}

export function googleRedirect(): void {
  window.location.href = `${BASE_URL}/api/v1/auth/google`
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/api/auth.ts
git commit -m "refactor: simplify auth API for cookie-based sessions"
```

---

### Task 4: Rewrite `lib/contexts/auth-context.tsx`

**Files:**
- Modify: `lib/contexts/auth-context.tsx`

- [ ] **Step 1: Replace the entire file**

```typescript
'use client'

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'
import { AuthUser, UserRole, MfaChallengeResponse, isMfaChallenge } from '@/lib/types/user'
import { apiClient } from '@/lib/api/client'
import * as authApi from '@/lib/api/auth'

interface AuthContextType {
  user: AuthUser | null
  loading: boolean
  mfaSetupRequired: boolean
  login: (email: string, password: string) => Promise<{ error: string | null; mfaChallenge: MfaChallengeResponse | null }>
  register: (email: string, password: string) => Promise<{ error: string | null }>
  logout: () => Promise<void>
  setRole: (role: UserRole) => Promise<{ error: string | null }>
  updateSession: (user: AuthUser) => void
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  mfaSetupRequired: false,
  login: async () => ({ error: null, mfaChallenge: null }),
  register: async () => ({ error: null }),
  logout: async () => {},
  setRole: async () => ({ error: null }),
  updateSession: () => {},
})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [mfaSetupRequired, setMfaSetupRequired] = useState(false)

  useEffect(() => {
    const handleSessionCleared = () => {
      setUser(null)
      setMfaSetupRequired(false)
    }
    window.addEventListener('pelu:session-cleared', handleSessionCleared)
    return () => window.removeEventListener('pelu:session-cleared', handleSessionCleared)
  }, [])

  useEffect(() => {
    // Clear stale localStorage keys from pre-cookie migration
    localStorage.removeItem('pelu_access_token')
    localStorage.removeItem('pelu_refresh_token')
    localStorage.removeItem('pelu_user')

    const init = async () => {
      try {
        const res = await apiClient('/api/v1/auth/me')
        if (res.ok) {
          const data = await res.json()
          setUser(data)
          setMfaSetupRequired(data.mfa_setup_required === true)
        }
      } catch {
        // Network error — treat as unauthenticated
      }
      setLoading(false)
    }

    init()
  }, [])

  const login = async (email: string, password: string): Promise<{ error: string | null; mfaChallenge: MfaChallengeResponse | null }> => {
    const { data, error } = await authApi.login(email, password)
    if (error || !data) return { error, mfaChallenge: null }

    if (isMfaChallenge(data)) {
      return { error: null, mfaChallenge: data }
    }

    setUser(data.user)
    return { error: null, mfaChallenge: null }
  }

  const register = async (email: string, password: string): Promise<{ error: string | null }> => {
    const { data, error } = await authApi.register(email, password)
    if (data) setUser(data.user)
    return { error }
  }

  const logout = async (): Promise<void> => {
    await authApi.logout()
    setUser(null)
    setMfaSetupRequired(false)
  }

  const setRole = async (role: UserRole): Promise<{ error: string | null }> => {
    const { data, error } = await authApi.setRole(role)
    if (data) setUser(data.user)
    return { error }
  }

  const updateSession = useCallback((newUser: AuthUser) => {
    setUser(newUser)
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, mfaSetupRequired, login, register, logout, setRole, updateSession }}>
      {children}
    </AuthContext.Provider>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/contexts/auth-context.tsx
git commit -m "refactor: AuthContext uses /auth/me instead of localStorage"
```

---

## Chunk 2: MFA, Multipart Uploads, Callback, Components

### Task 5: Rewrite `lib/api/mfa.ts`

**Files:**
- Modify: `lib/api/mfa.ts`

- [ ] **Step 1: Replace the entire file**

Remove `mfaFetch` helper and all `mfaToken` parameters. Use raw fetch with `credentials: 'include'` for verification, `apiClient` for enrollment/management.

```typescript
import { apiClient } from './client'
import { AuthUser, MfaMethodsResponse } from '@/lib/types/user'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

// --- Enrollment (authenticated via apiClient) ---

export async function totpSetup(): Promise<{ data: { secret: string; qr_uri: string } | null; error: string | null }> {
  const res = await apiClient('/api/v1/auth/mfa/totp/setup', { method: 'POST' })
  const json = await res.json()
  if (!res.ok) return { data: null, error: json.error || 'Error al configurar TOTP' }
  return { data: json, error: null }
}

export async function totpConfirm(code: string): Promise<{ data: { recovery_codes?: string[] } | null; error: string | null }> {
  const res = await apiClient('/api/v1/auth/mfa/totp/confirm', {
    method: 'POST',
    body: JSON.stringify({ code }),
  })
  const json = await res.json()
  if (!res.ok) return { data: null, error: json.error || 'Código inválido' }
  return { data: json, error: null }
}

export async function webauthnRegisterBegin(): Promise<{ data: unknown | null; error: string | null }> {
  const res = await apiClient('/api/v1/auth/mfa/webauthn/register/begin', { method: 'POST' })
  const json = await res.json()
  if (!res.ok) return { data: null, error: json.error || 'Error al iniciar registro de passkey' }
  return { data: json, error: null }
}

export async function webauthnRegisterFinish(attestation: unknown, name?: string): Promise<{ data: { recovery_codes?: string[] } | null; error: string | null }> {
  const res = await apiClient('/api/v1/auth/mfa/webauthn/register/finish', {
    method: 'POST',
    body: JSON.stringify({ attestation, name }),
  })
  const json = await res.json()
  if (!res.ok) return { data: null, error: json.error || 'Error al registrar passkey' }
  return { data: json, error: null }
}

export async function emailEnable(): Promise<{ data: { recovery_codes?: string[] } | null; error: string | null }> {
  const res = await apiClient('/api/v1/auth/mfa/email/enable', { method: 'POST' })
  const json = await res.json()
  if (!res.ok) return { data: null, error: json.error || 'Error al habilitar email OTP' }
  return { data: json, error: null }
}

export async function regenerateRecoveryCodes(): Promise<{ data: { recovery_codes: string[] } | null; error: string | null }> {
  const res = await apiClient('/api/v1/auth/mfa/recovery/generate', { method: 'POST' })
  const json = await res.json()
  if (!res.ok) return { data: null, error: json.error || 'Error al regenerar códigos' }
  return { data: json, error: null }
}

// --- Verification (uses mfa_token cookie — credentials: 'include') ---

export async function mfaVerify(method: string, codeOrAssertion: string | unknown): Promise<{ data: { user: AuthUser } | null; error: string | null }> {
  const body = method === 'webauthn'
    ? { method, assertion: codeOrAssertion }
    : { method, code: codeOrAssertion }
  const res = await fetch(`${BASE_URL}/api/v1/auth/mfa/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
  })
  const json = await res.json()
  if (!res.ok) return { data: null, error: json.error || 'Código inválido o expirado' }
  return { data: json, error: null }
}

export async function mfaEmailSend(): Promise<{ data: unknown | null; error: string | null }> {
  const res = await fetch(`${BASE_URL}/api/v1/auth/mfa/email/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  })
  const json = await res.json()
  if (!res.ok) return { data: null, error: json.error || 'Error al enviar código' }
  return { data: json, error: null }
}

export async function webauthnAssertBegin(): Promise<{ data: unknown | null; error: string | null }> {
  const res = await fetch(`${BASE_URL}/api/v1/auth/mfa/webauthn/assert/begin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  })
  const json = await res.json()
  if (!res.ok) return { data: null, error: json.error || 'Error al iniciar verificación' }
  return { data: json, error: null }
}

// --- Management (authenticated via apiClient) ---

export async function getMethods(): Promise<{ data: MfaMethodsResponse | null; error: string | null }> {
  const res = await apiClient('/api/v1/auth/mfa/methods')
  const json = await res.json()
  if (!res.ok) return { data: null, error: json.error || 'Error al cargar métodos MFA' }
  return { data: json, error: null }
}

export async function deleteTotp(password: string): Promise<{ data: unknown | null; error: string | null }> {
  const res = await apiClient('/api/v1/auth/mfa/totp', {
    method: 'DELETE',
    body: JSON.stringify({ password }),
  })
  if (res.status === 204) return { data: {}, error: null }
  const json = await res.json()
  return { data: null, error: json.error || 'Error al eliminar TOTP' }
}

export async function deleteWebauthn(id: string, password: string): Promise<{ data: unknown | null; error: string | null }> {
  const res = await apiClient(`/api/v1/auth/mfa/webauthn/${id}`, {
    method: 'DELETE',
    body: JSON.stringify({ password }),
  })
  if (res.status === 204) return { data: {}, error: null }
  const json = await res.json()
  return { data: null, error: json.error || 'Error al eliminar passkey' }
}

export async function deleteEmail(password: string): Promise<{ data: unknown | null; error: string | null }> {
  const res = await apiClient('/api/v1/auth/mfa/email', {
    method: 'DELETE',
    body: JSON.stringify({ password }),
  })
  if (res.status === 204) return { data: {}, error: null }
  const json = await res.json()
  return { data: null, error: json.error || 'Error al eliminar email OTP' }
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/api/mfa.ts
git commit -m "refactor: MFA API uses cookies instead of mfaToken param"
```

---

### Task 6: Update multipart upload functions

**Files:**
- Modify: `lib/api/pets.ts`
- Modify: `lib/api/rescue-centers.ts`
- Modify: `lib/api/businesses.ts`
- Modify: `lib/api/submissions.ts`

- [ ] **Step 1: Update all four files**

In each file, replace `getStoredAccessToken` import + `Authorization: Bearer` header with `credentials: 'include'`.

**`lib/api/pets.ts`** — change import and `uploadPhotos`:
- Import: `import { apiClient } from './client'` (remove `getStoredAccessToken`)
- `uploadPhotos`: remove `const token = getStoredAccessToken()`, remove `headers: token ? { Authorization: ... } : {}`, add `credentials: 'include'`

**`lib/api/rescue-centers.ts`** — change import and `uploadRcLogo`:
- Import: `import { apiClient } from './client'` (remove `getStoredAccessToken`)
- `uploadRcLogo`: remove token logic, add `credentials: 'include'`

**`lib/api/businesses.ts`** — change import and `uploadBusinessPhoto`:
- Import: `import { apiClient } from './client'` (remove `getStoredAccessToken`)
- `uploadBusinessPhoto`: remove token check + header, add `credentials: 'include'`

**`lib/api/submissions.ts`** — change import and `uploadSubmissionFile`:
- Import: `import { apiClient } from './client'` (remove `getStoredAccessToken`)
- `uploadSubmissionFile`: remove token logic, add `credentials: 'include'`

For each raw fetch call, the pattern is the same:
```typescript
// BEFORE
const token = getStoredAccessToken()
const res = await fetch(url, {
  method: 'POST',
  headers: token ? { Authorization: `Bearer ${token}` } : {},
  body: form,
})

// AFTER
const res = await fetch(url, {
  method: 'POST',
  credentials: 'include',
  body: form,
})
```

- [ ] **Step 2: Commit**

```bash
git add lib/api/pets.ts lib/api/rescue-centers.ts lib/api/businesses.ts lib/api/submissions.ts
git commit -m "refactor: multipart uploads use cookies instead of Bearer token"
```

---

### Task 7: Rewrite Google OAuth callback

**Files:**
- Modify: `app/auth/google/callback/page.tsx`

- [ ] **Step 1: Replace the entire file**

```typescript
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/contexts/auth-context'
import { apiClient } from '@/lib/api/client'
import { UserRole } from '@/lib/types/user'

const rolePaths: Record<UserRole, string> = {
  rescue_center: '/dashboard/rescue-center',
  member: '/',
  business: '/',
}

export default function GoogleCallbackPage() {
  const router = useRouter()
  const { updateSession } = useAuth()

  useEffect(() => {
    const init = async () => {
      try {
        const res = await apiClient('/api/v1/auth/me')
        if (!res.ok) {
          router.push('/auth/login')
          return
        }
        const user = await res.json()
        updateSession(user)

        if (user.role) {
          router.push(rolePaths[user.role as UserRole])
        } else {
          router.push('/auth/role-selection')
        }
      } catch {
        router.push('/auth/login')
      }
    }

    init()
  }, [router, updateSession])

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Iniciando sesión…</p>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/auth/google/callback/page.tsx
git commit -m "refactor: Google callback reads cookies instead of URL hash"
```

---

### Task 8: Update MFA verify component

**Files:**
- Modify: `components/auth/mfa/mfa-verify.tsx`

- [ ] **Step 1: Update imports and token references**

Changes needed:
1. Remove `import { storeSession } from '@/lib/api/client'`
2. `handleVerify`: remove `challenge.mfa_token` param from `mfaApi.mfaVerify()` call — now just `mfaApi.mfaVerify(activeMethod, codeOrAssertion)`
3. `handleVerify` success: replace `storeSession(...)` + `updateSession(data.user, data.access_token)` with just `updateSession(data.user)`
4. `handleSwitchMethod`: remove `challenge.mfa_token` from `mfaApi.mfaEmailSend()` — now just `mfaApi.mfaEmailSend()`
5. `handlePasskeyVerify`: remove `challenge.mfa_token` from `mfaApi.webauthnAssertBegin()` — now just `mfaApi.webauthnAssertBegin()`

- [ ] **Step 2: Commit**

```bash
git add components/auth/mfa/mfa-verify.tsx
git commit -m "refactor: MFA verify uses cookies, no token passing"
```

---

### Task 9: Update remaining components

**Files:**
- Modify: `components/adopt/adopt-pet-page.tsx`
- Modify: `components/auth/onboarding/member-wizard.tsx`
- Modify: `lib/api/admin.ts`
- Modify: `components/dashboard/admin/rescue-centers-tab.tsx`

- [ ] **Step 1: Fix adopt-pet-page.tsx**

Replace `const token = localStorage.getItem('pelu_access_token')` + `if (!token)` check with `useAuth()` hook:

Add import: `import { useAuth } from '@/lib/contexts/auth-context'`
Add in component: `const { user } = useAuth()`
Replace: `if (!token) { router.replace('/auth/login'); return }` with `if (!user) { router.replace('/auth/login'); return }`

- [ ] **Step 2: Fix member-wizard.tsx**

Change line `if (json.user && json.access_token) updateSession(json.user, json.access_token)` to:
```typescript
if (json.user) updateSession(json.user)
```

Also update the `updateSession` destructuring if it expects 2 args — it now only takes `(user)`.

- [ ] **Step 3: Update admin deleteRescueCenter**

In `lib/api/admin.ts`, change `deleteRescueCenter` to accept MFA params:

```typescript
export async function deleteRescueCenter(id: string, mfaCode: string): Promise<{ data: true | null; error: string | null }> {
  try {
    const res = await apiClient(`/api/v1/admin/rescue-centers/${id}`, {
      method: 'DELETE',
      body: JSON.stringify({ mfa_method: 'totp', mfa_code: mfaCode }),
    })
    if (res.status === 204) return { data: true, error: null }
    const json = await res.json()
    return { data: null, error: json.error || 'Error al eliminar' }
  } catch {
    return { data: null, error: 'Error de conexión' }
  }
}
```

- [ ] **Step 4: Update admin rescue-centers-tab.tsx delete dialog**

In the delete dialog, add a TOTP code input. Update `handleDelete` to pass the code. The delete dialog should:
1. Add state: `const [deleteCode, setDeleteCode] = useState('')`
2. Add a 6-digit input field in the dialog (use `MfaCodeInput` component)
3. Pass code to `adminApi.deleteRescueCenter(deletingId, deleteCode)`
4. Reset `deleteCode` on dialog close
5. Show error from API if MFA fails (e.g. "no TOTP set up")

Add import: `import { MfaCodeInput } from '@/components/auth/mfa/mfa-code-input'`

In the delete dialog JSX, add between the description paragraph and the button row:
```tsx
<div className="space-y-2">
  <p className="text-xs text-muted-foreground">Ingresa el código de tu app de autenticación:</p>
  <MfaCodeInput
    onComplete={(code) => setDeleteCode(code)}
    error={null}
  />
</div>
```

Update the delete button to be disabled when no code: `disabled={!deleteCode}`

Update `handleDelete`: `await adminApi.deleteRescueCenter(deletingId, deleteCode)`

- [ ] **Step 5: Commit**

```bash
git add components/adopt/adopt-pet-page.tsx components/auth/onboarding/member-wizard.tsx lib/api/admin.ts components/dashboard/admin/rescue-centers-tab.tsx
git commit -m "refactor: update remaining components for cookie auth"
```

---

### Task 10: TypeScript check and verification

- [ ] **Step 1: Run TypeScript check**

```bash
npx tsc --noEmit
```

Fix any type errors. Common ones to watch for:
- `updateSession` signature mismatch (now takes 1 arg not 2)
- `storeSession` / `clearSession` / `getStored*` imports that were missed
- `challenge.mfa_token` references in MFA components
- `data.access_token` / `data.refresh_token` references

- [ ] **Step 2: Verify manually**

Test these flows:
1. Login (email/password) → should set cookies, redirect to role selection
2. Register → should set cookies, show MFA enrollment
3. Page refresh when logged in → should call `/auth/me`, stay logged in
4. Logout → should clear cookies, redirect to home
5. Google OAuth → should redirect, set cookies, come back to callback page
6. Admin dashboard → should load if admin

- [ ] **Step 3: Commit fixes**

```bash
git add -A
git commit -m "fix: resolve TypeScript errors from cookie auth migration"
```
