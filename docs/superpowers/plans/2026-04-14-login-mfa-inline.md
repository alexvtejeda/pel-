# Login-Page Inline MFA Challenge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire up `/auth/login?mfa=1` to render an inline MFA challenge inside the existing login card (replacing the credentials form with a vertical shrink/expand animation), refactor `MfaVerify` from a fixed modal overlay to inline card content, and add a universal "Configurar MFA" entry point to the account sheet in `pets-header`.

**Architecture:** A new `mode` state on the login page drives `AnimatePresence` between three content states (`credentials`, `loading`, `mfa`). On `?mfa=1` the page calls `GET /api/v1/auth/mfa/challenge` to recover the challenge metadata (the Google-OAuth path that the password flow gets inline). A new `postLoginRedirect` helper routes successful logins to `/auth/mfa/enrollment?mfa=1` when the backend reports `mfa_setup_required`, to `/dashboard/admin` when `is_admin`, or to the role-specific dashboard. A new thin page route at `app/auth/mfa/enrollment/page.tsx` wraps the existing `MfaEnrollment` component and conditionally hides its skip button when `?mfa=1` is present.

**Tech Stack:** Next.js 16 App Router, React 19, Framer Motion (`AnimatePresence` with `mode="wait"`), existing `apiClient` + raw `fetch` with cookies, Vitest + React Testing Library.

**Reference spec:** `docs/superpowers/specs/2026-04-14-login-mfa-inline-design.md`

---

## File Structure

**New files:**
- `lib/auth/post-login-redirect.ts` — shared helper that calls `/auth/me` and decides where to route a just-logged-in user based on `mfa_setup_required`, `is_admin`, and `user.role`.
- `app/auth/mfa/enrollment/page.tsx` — new route wrapper that mounts `MfaEnrollment`. Reads `?mfa=1` to decide whether to pass `onSkip`.
- `components/__tests__/auth/post-login-redirect.test.ts` — unit tests for the redirect helper with mocked `apiClient`.
- `components/__tests__/auth/login-page.test.tsx` — unit tests for the login page mode state transitions.

**Modified files:**
- `lib/types/user.ts` — extend `MfaChallengeResponse` with `email: string` and `strong_methods_available: boolean`.
- `lib/api/mfa.ts` — add `mfaChallenge()` export that calls `GET /auth/mfa/challenge`.
- `components/auth/mfa/mfa-verify.tsx` — delete fixed-inset modal wrappers; add `onCancel` prop; change `onSuccess` to pass `AuthUser`.
- `components/auth/login-page.tsx` — add `mode` state, `?mfa=1` URL detection with strict-mode guard, extract `CredentialsForm` internal component, wrap render in `AnimatePresence`, wire `postLoginRedirect`.
- `app/auth/google/callback/page.tsx` — replace inline role routing with `postLoginRedirect(user, router)`.
- `components/pets/pets-header.tsx` — add "Configurar MFA" link with `faKey` icon between Transport and Logout.
- `public/locales/es/pets.json` and `public/locales/en/pets.json` — add `header.setup_mfa`.
- `public/locales/es/auth.json` and `public/locales/en/auth.json` — add `mfa.verify.back_to_login`.

**Deleted files:** none.

---

## Task 1: Extend `MfaChallengeResponse` type

**Files:**
- Modify: `lib/types/user.ts`

- [ ] **Step 1: Read the current type definition**

Open `lib/types/user.ts` and confirm the current `MfaChallengeResponse` interface looks like:

```ts
export interface MfaChallengeResponse {
  mfa_required: true
  preferred_method: MfaMethod
  available_methods: MfaMethod[]
}
```

- [ ] **Step 2: Extend the interface with `email` and `strong_methods_available`**

Replace the interface with:

```ts
export interface MfaChallengeResponse {
  mfa_required: true
  preferred_method: MfaMethod
  available_methods: MfaMethod[]
  email: string
  strong_methods_available: boolean
}
```

The backend returns these two fields on both the inline login response and the new `GET /auth/mfa/challenge` endpoint. Existing consumers that destructure or inspect the response keep working because the new fields are additive.

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors in `lib/types/user.ts`. Pre-existing unrelated errors are OK.

- [ ] **Step 4: Commit**

```bash
git add lib/types/user.ts
git commit -m "refactor(auth): extend MfaChallengeResponse with email and strong_methods_available"
```

---

## Task 2: Add `mfaChallenge()` API function

**Files:**
- Modify: `lib/api/mfa.ts`

- [ ] **Step 1: Append the new export to `lib/api/mfa.ts`**

Add this function immediately after the existing `webauthnAssertBegin` export (around line 93):

```ts
export async function mfaChallenge(): Promise<{ data: MfaChallengeResponse | null; error: string | null }> {
  const res = await fetch(`${BASE_URL}/api/v1/auth/mfa/challenge`, {
    method: 'GET',
    credentials: 'include',
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) return { data: null, error: json.error || 'Sesión MFA expirada' }
  return { data: json, error: null }
}
```

Update the import statement at the top of the file to include `MfaChallengeResponse`:

```ts
import { AuthUser, MfaMethodsResponse, MfaChallengeResponse } from '@/lib/types/user'
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add lib/api/mfa.ts
git commit -m "feat(auth): add mfaChallenge() API helper for ?mfa=1 flow"
```

---

## Task 3: Create `postLoginRedirect` helper

**Files:**
- Create: `lib/auth/post-login-redirect.ts`
- Create: `components/__tests__/auth/post-login-redirect.test.ts`

- [ ] **Step 1: Write the failing test**

Create `components/__tests__/auth/post-login-redirect.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { postLoginRedirect } from '@/lib/auth/post-login-redirect'
import { AuthUser } from '@/lib/types/user'

vi.mock('@/lib/api/client', () => ({
  apiClient: vi.fn(),
}))

import { apiClient } from '@/lib/api/client'
const mockApiClient = apiClient as unknown as ReturnType<typeof vi.fn>

const baseUser: AuthUser = {
  id: 'u1',
  email: 'u@example.com',
  role: 'member',
  auth_provider: 'email',
  preferred_lang: 'es',
  display_name: null,
  avatar_url: null,
}

const makeRouter = () => ({ push: vi.fn() })

const meResponse = (body: object) =>
  ({ ok: true, json: async () => body } as Response)

describe('postLoginRedirect', () => {
  beforeEach(() => {
    mockApiClient.mockReset()
  })

  it('redirects to enrollment when mfa_setup_required is true', async () => {
    mockApiClient.mockResolvedValueOnce(meResponse({ mfa_setup_required: true }))
    const router = makeRouter()
    await postLoginRedirect(baseUser, router)
    expect(router.push).toHaveBeenCalledWith('/auth/mfa/enrollment?mfa=1')
  })

  it('redirects to admin dashboard when is_admin is true and mfa_setup_required is false', async () => {
    mockApiClient.mockResolvedValueOnce(meResponse({ is_admin: true, mfa_setup_required: false }))
    const router = makeRouter()
    await postLoginRedirect(baseUser, router)
    expect(router.push).toHaveBeenCalledWith('/dashboard/admin')
  })

  it('redirects to /pets for a member when not admin and no mfa required', async () => {
    mockApiClient.mockResolvedValueOnce(meResponse({ is_admin: false, mfa_setup_required: false }))
    const router = makeRouter()
    await postLoginRedirect(baseUser, router)
    expect(router.push).toHaveBeenCalledWith('/pets')
  })

  it('redirects to role-selection when user has no role', async () => {
    mockApiClient.mockResolvedValueOnce(meResponse({ is_admin: false, mfa_setup_required: false }))
    const router = makeRouter()
    await postLoginRedirect({ ...baseUser, role: null }, router)
    expect(router.push).toHaveBeenCalledWith('/auth/role-selection')
  })

  it('redirects rescue_center to /dashboard/rescue-center', async () => {
    mockApiClient.mockResolvedValueOnce(meResponse({ is_admin: false, mfa_setup_required: false }))
    const router = makeRouter()
    await postLoginRedirect({ ...baseUser, role: 'rescue_center' }, router)
    expect(router.push).toHaveBeenCalledWith('/dashboard/rescue-center')
  })

  it('redirects business to /dashboard/business', async () => {
    mockApiClient.mockResolvedValueOnce(meResponse({ is_admin: false, mfa_setup_required: false }))
    const router = makeRouter()
    await postLoginRedirect({ ...baseUser, role: 'business' }, router)
    expect(router.push).toHaveBeenCalledWith('/dashboard/business')
  })

  it('falls through to role-based redirect when /auth/me throws', async () => {
    mockApiClient.mockRejectedValueOnce(new Error('network'))
    const router = makeRouter()
    await postLoginRedirect({ ...baseUser, role: 'member' }, router)
    expect(router.push).toHaveBeenCalledWith('/pets')
  })

  it('prioritizes role-selection over admin dashboard when role is null even if is_admin', async () => {
    mockApiClient.mockResolvedValueOnce(meResponse({ is_admin: true, mfa_setup_required: false }))
    const router = makeRouter()
    await postLoginRedirect({ ...baseUser, role: null }, router)
    expect(router.push).toHaveBeenCalledWith('/auth/role-selection')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run components/__tests__/auth/post-login-redirect.test.ts`
Expected: FAIL — module `@/lib/auth/post-login-redirect` does not exist.

- [ ] **Step 3: Create `lib/auth/post-login-redirect.ts`**

```ts
import { apiClient } from '@/lib/api/client'
import { AuthUser } from '@/lib/types/user'

type RouterLike = { push: (path: string) => void }

export async function postLoginRedirect(user: AuthUser, router: RouterLike) {
  // `GET /auth/me` returns is_admin + mfa_setup_required (backend-computed, unspoofable).
  // - mfa_setup_required is true when the user is rescue_center/business with no MFA
  //   (non-Google), OR an admin with no MFA (any provider, including Google).
  // - is_admin is true when the user's ID is in ADMIN_USER_IDS. Admin is NOT a UserRole
  //   value — a user can be both an admin and a member, for example.
  //
  // Decision order (highest priority first):
  //   1. mfa_setup_required → forced enrollment
  //   2. no role set → pick a role first (even for admins — admin dashboard needs
  //      an underlying role established)
  //   3. is_admin → admin dashboard (overrides role-specific destination)
  //   4. role-specific dashboard
  let isAdmin = false
  try {
    const res = await apiClient('/api/v1/auth/me')
    if (res.ok) {
      const me = await res.json()
      if (me.mfa_setup_required === true) {
        router.push('/auth/mfa/enrollment?mfa=1')
        return
      }
      isAdmin = me.is_admin === true
    }
  } catch {
    // Fall through to role-based redirect on /auth/me failure
  }

  if (!user.role) {
    router.push('/auth/role-selection')
    return
  }

  if (isAdmin) {
    router.push('/dashboard/admin')
    return
  }

  switch (user.role) {
    case 'rescue_center':
      router.push('/dashboard/rescue-center')
      return
    case 'business':
      router.push('/dashboard/business')
      return
    case 'member':
      router.push('/pets')
      return
    default:
      router.push('/auth/role-selection')
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run components/__tests__/auth/post-login-redirect.test.ts`
Expected: PASS, 8 tests.

- [ ] **Step 5: Commit**

```bash
git add lib/auth/post-login-redirect.ts components/__tests__/auth/post-login-redirect.test.ts
git commit -m "feat(auth): add postLoginRedirect helper with admin and MFA routing"
```

---

## Task 4: Add i18n strings

**Files:**
- Modify: `public/locales/es/pets.json`
- Modify: `public/locales/en/pets.json`
- Modify: `public/locales/es/auth.json`
- Modify: `public/locales/en/auth.json`

- [ ] **Step 1: Add `header.setup_mfa` to Spanish pets namespace**

Open `public/locales/es/pets.json`. Find the `"header"` object. Add a new key `"setup_mfa": "Configurar MFA"` as the last entry in that object (keep trailing comma discipline — add a comma after the previous last entry).

- [ ] **Step 2: Add `header.setup_mfa` to English pets namespace**

Open `public/locales/en/pets.json`. Find the `"header"` object. Add a new key `"setup_mfa": "Set up MFA"`.

- [ ] **Step 3: Add `mfa.verify.back_to_login` to Spanish auth namespace**

Open `public/locales/es/auth.json`. Find the `"mfa"."verify"` nested object. Add `"back_to_login": "Volver al inicio de sesión"`.

- [ ] **Step 4: Add `mfa.verify.back_to_login` to English auth namespace**

Open `public/locales/en/auth.json`. Find the `"mfa"."verify"` nested object. Add `"back_to_login": "Back to login"`.

- [ ] **Step 5: Verify all four files are valid JSON**

Run: `node -e "JSON.parse(require('fs').readFileSync('public/locales/es/pets.json'))" && node -e "JSON.parse(require('fs').readFileSync('public/locales/en/pets.json'))" && node -e "JSON.parse(require('fs').readFileSync('public/locales/es/auth.json'))" && node -e "JSON.parse(require('fs').readFileSync('public/locales/en/auth.json'))"`
Expected: no output (all four parse successfully).

- [ ] **Step 6: Commit**

```bash
git add public/locales/es/pets.json public/locales/en/pets.json public/locales/es/auth.json public/locales/en/auth.json
git commit -m "feat(i18n): add setup_mfa and back_to_login strings"
```

---

## Task 5: Refactor `MfaVerify` from modal to inline

**Files:**
- Modify: `components/auth/mfa/mfa-verify.tsx`

- [ ] **Step 1: Replace the file with the inline version**

Full replacement of `components/auth/mfa/mfa-verify.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faShieldHalved, faKey, faMobileScreen, faEnvelope } from '@fortawesome/free-solid-svg-icons'
import { MfaCodeInput } from './mfa-code-input'
import * as mfaApi from '@/lib/api/mfa'
import { AuthUser, MfaChallengeResponse, MfaMethod } from '@/lib/types/user'
import { useAuth } from '@/lib/contexts/auth-context'

interface MfaVerifyProps {
  challenge: MfaChallengeResponse
  loginEmail: string
  onSuccess: (user: AuthUser) => void
  onExpired: () => void
  onCancel: () => void
}

export function MfaVerify({ challenge, loginEmail, onSuccess, onExpired, onCancel }: MfaVerifyProps) {
  const { t } = useTranslation('auth')
  const { updateSession } = useAuth()
  const [activeMethod, setActiveMethod] = useState<MfaMethod>(challenge.preferred_method)
  const [showMethodPicker, setShowMethodPicker] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)

  const maskedEmail = loginEmail
    ? loginEmail.slice(0, 2) + '***@' + loginEmail.split('@')[1]
    : '***'

  const handleVerify = async (codeOrAssertion: string | unknown) => {
    setLoading(true)
    setError(null)
    const { data, error: err } = await mfaApi.mfaVerify(activeMethod, codeOrAssertion)
    setLoading(false)

    if (err) {
      if (err.includes('expired') || err.includes('expiró')) {
        onExpired()
        return
      }
      setError(err)
      return
    }

    if (data) {
      updateSession(data.user)
      onSuccess(data.user)
    }
  }

  const handleSwitchMethod = async (method: MfaMethod) => {
    setActiveMethod(method)
    setShowMethodPicker(false)
    setError(null)

    if (method === 'email') {
      const { error: sendErr } = await mfaApi.mfaEmailSend()
      if (sendErr) {
        setError(sendErr)
        return
      }
      setEmailSent(true)
    }
  }

  const handlePasskeyVerify = async () => {
    setLoading(true)
    setError(null)

    const { data: options, error: beginErr } = await mfaApi.webauthnAssertBegin()
    if (beginErr || !options) {
      setError(beginErr || 'Error')
      setLoading(false)
      return
    }

    try {
      const assertion = await navigator.credentials.get({
        publicKey: options as PublicKeyCredentialRequestOptions,
      })
      if (!assertion) {
        setError('No se pudo verificar')
        setLoading(false)
        return
      }
      await handleVerify(assertion)
    } catch {
      setError('Verificación cancelada')
      setLoading(false)
    }
  }

  const methodIcons: Record<MfaMethod, typeof faKey> = {
    webauthn: faKey,
    totp: faMobileScreen,
    email: faEnvelope,
    recovery: faShieldHalved,
  }

  const subtitleKeys: Record<MfaMethod, string> = {
    totp: 'mfa.verify.subtitle_totp',
    email: 'mfa.verify.subtitle_email',
    webauthn: 'mfa.verify.subtitle_passkey',
    recovery: 'mfa.verify.subtitle_recovery',
  }

  if (showMethodPicker) {
    return (
      <div className="space-y-4" data-testid="mfa-method-picker">
        <div className="text-center">
          <FontAwesomeIcon icon={faShieldHalved} className="text-2xl text-pop-550 mb-2" />
          <h2 className="font-semibold">{t('mfa.verify.other_method')}</h2>
        </div>

        <div className="space-y-2">
          {challenge.available_methods.filter(m => m !== 'recovery').map((method) => (
            <button
              key={method}
              onClick={() => handleSwitchMethod(method)}
              className={`w-full p-3 rounded-xl border text-left flex items-center gap-3 transition-colors ${
                activeMethod === method ? 'border-pop-450 bg-pop-450/10' : 'border-input hover:bg-muted'
              }`}
            >
              <FontAwesomeIcon icon={methodIcons[method]} className="text-base" />
              <span className="text-sm font-medium">{t(`mfa.enrollment.${method === 'webauthn' ? 'passkey' : method}`)}</span>
            </button>
          ))}
        </div>

        <button
          onClick={() => handleSwitchMethod('recovery')}
          className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {t('mfa.verify.use_recovery')}
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-5" data-testid="mfa-verify-card">
      <div className="text-center space-y-1">
        <FontAwesomeIcon icon={faShieldHalved} className="text-2xl text-pop-550 mb-2" />
        <h2 className="font-semibold">{t('mfa.verify.title')}</h2>
        <p className="text-sm text-muted-foreground">{t(subtitleKeys[activeMethod])}</p>
        {activeMethod === 'email' && emailSent && (
          <p className="text-xs text-pop-450">{t('mfa.verify.email_sent', { email: maskedEmail })}</p>
        )}
      </div>

      {(activeMethod === 'totp' || activeMethod === 'email') && (
        <MfaCodeInput onComplete={handleVerify} disabled={loading} error={error} />
      )}

      {activeMethod === 'recovery' && (
        <form onSubmit={(e) => { e.preventDefault(); const input = e.currentTarget.elements.namedItem('recovery') as HTMLInputElement; if (input.value) handleVerify(input.value) }} className="space-y-3">
          <input
            name="recovery"
            type="text"
            placeholder="XXXXXXXXXX"
            className="w-full px-4 py-3 border border-input rounded-xl text-center font-mono tracking-widest focus:outline-hidden focus:ring-2 focus:ring-ring focus:border-transparent"
            disabled={loading}
          />
          {error && <p className="text-destructive text-sm text-center">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {loading ? '...' : t('mfa.verify.verify_button')}
          </button>
        </form>
      )}

      {activeMethod === 'webauthn' && (
        <div className="space-y-3">
          {error && <p className="text-destructive text-sm text-center">{error}</p>}
          <button
            onClick={handlePasskeyVerify}
            disabled={loading}
            className="w-full py-3 px-4 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {loading ? '...' : t('mfa.verify.passkey_button')}
          </button>
        </div>
      )}

      <button
        onClick={() => setShowMethodPicker(true)}
        className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        {t('mfa.verify.other_method')} →
      </button>

      <button
        onClick={onCancel}
        className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        {t('mfa.verify.back_to_login')}
      </button>
    </div>
  )
}
```

Changes from the previous version:
- Removed `fixed inset-0 z-50` overlay + backdrop in both render branches.
- Removed inner `bg-card rounded-2xl p-6 w-full max-w-sm border shadow-lg` card — the parent `AuthLayout` provides padding and rounding.
- Added `onCancel: () => void` to props and a "Volver al inicio de sesión" button at the bottom of the main verify card.
- Changed `onSuccess: () => void` to `onSuccess: (user: AuthUser) => void` so callers can run `postLoginRedirect` with the authenticated user.
- Added `data-testid="mfa-method-picker"` and `data-testid="mfa-verify-card"` for tests.

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: TypeScript will flag every call site of `<MfaVerify>` because of the new `onCancel` prop and the signature change on `onSuccess`. Expected call sites that need updating in later tasks:
- `components/auth/login-page.tsx` (Task 6)
- Any other consumer (grep: `npx grep "MfaVerify" components/`)

Note the list of call sites for Task 6's awareness. Do not fix them in this task — they're handled when each consumer is rewritten.

- [ ] **Step 3: Commit**

```bash
git add components/auth/mfa/mfa-verify.tsx
git commit -m "refactor(auth): convert MfaVerify from fixed modal to inline card"
```

---

## Task 6: Rewrite `login-page.tsx` with mode state and AnimatePresence

**Files:**
- Modify: `components/auth/login-page.tsx`
- Create: `components/__tests__/auth/login-page.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `components/__tests__/auth/login-page.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { LoginPage } from '@/components/auth/login-page'

vi.mock('next/navigation', () => {
  const mockPush = vi.fn()
  return {
    useRouter: () => ({ push: mockPush }),
    useSearchParams: () => mockSearchParams,
  }
})

let mockSearchParams = new URLSearchParams()
const setSearch = (s: string) => {
  mockSearchParams = new URLSearchParams(s)
}

vi.mock('@/lib/api/mfa', () => ({
  mfaChallenge: vi.fn(),
  mfaVerify: vi.fn(),
  mfaEmailSend: vi.fn(),
  webauthnAssertBegin: vi.fn(),
}))

vi.mock('@/lib/contexts/auth-context', () => ({
  useAuth: () => ({
    login: vi.fn(),
    updateSession: vi.fn(),
  }),
}))

vi.mock('@/lib/auth/post-login-redirect', () => ({
  postLoginRedirect: vi.fn(),
}))

vi.mock('@/lib/api/auth', () => ({
  googleRedirect: vi.fn(),
}))

import { mfaChallenge as mockMfaChallenge } from '@/lib/api/mfa'

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setSearch('')
  })

  it('renders the credentials form when URL has no ?mfa param', () => {
    render(<LoginPage />)
    expect(screen.getByPlaceholderText(/correo electrónico/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/contraseña/i)).toBeInTheDocument()
  })

  it('fetches the MFA challenge on mount when ?mfa=1 is present', async () => {
    setSearch('mfa=1')
    ;(mockMfaChallenge as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: {
        mfa_required: true,
        preferred_method: 'totp',
        available_methods: ['totp', 'email'],
        email: 'a***@example.com',
        strong_methods_available: true,
      },
      error: null,
    })

    render(<LoginPage />)

    await waitFor(() => {
      expect(mockMfaChallenge).toHaveBeenCalledTimes(1)
    })
    await waitFor(() => {
      expect(screen.getByTestId('mfa-verify-card')).toBeInTheDocument()
    })
  })

  it('falls back to credentials form when mfaChallenge returns an error', async () => {
    setSearch('mfa=1')
    ;(mockMfaChallenge as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: null,
      error: 'Sesión MFA expirada',
    })

    render(<LoginPage />)

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/correo electrónico/i)).toBeInTheDocument()
    })
    expect(screen.getByText(/expiró/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run components/__tests__/auth/login-page.test.tsx`
Expected: FAIL — the current `LoginPage` doesn't have `mode` state, doesn't call `mfaChallenge`, and doesn't render the `mfa-verify-card` testid.

- [ ] **Step 3: Replace `components/auth/login-page.tsx` with the new version**

Full replacement:

```tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'
import { useAuth } from '@/lib/contexts/auth-context'
import { googleRedirect } from '@/lib/api/auth'
import { mfaChallenge as mfaChallengeApi } from '@/lib/api/mfa'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faGoogle } from '@fortawesome/free-brands-svg-icons'
import { MfaVerify } from '@/components/auth/mfa/mfa-verify'
import { MfaChallengeResponse, AuthUser } from '@/lib/types/user'
import { postLoginRedirect } from '@/lib/auth/post-login-redirect'
import { AuthLayout } from './auth-layout'

type LoginMode = 'credentials' | 'loading' | 'mfa'

const shrinkExpandProps = {
  initial: { opacity: 0, height: 0 },
  animate: { opacity: 1, height: 'auto' as const },
  exit: { opacity: 0, height: 0 },
  transition: { duration: 0.2, ease: 'easeInOut' as const },
  style: { overflow: 'hidden' },
}

export function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { login } = useAuth()

  const [mode, setMode] = useState<LoginMode>(
    searchParams.get('mfa') === '1' ? 'loading' : 'credentials'
  )
  const [challenge, setChallenge] = useState<MfaChallengeResponse | null>(null)
  const [challengeEmail, setChallengeEmail] = useState<string>('')
  const [credentialsError, setCredentialsError] = useState<string | null>(null)

  // Guard against React strict-mode double-fire in development.
  const challengeFetched = useRef(false)

  useEffect(() => {
    if (mode !== 'loading') return
    if (challengeFetched.current) return
    challengeFetched.current = true

    ;(async () => {
      const { data, error } = await mfaChallengeApi()
      if (error || !data) {
        setCredentialsError('Tu sesión MFA expiró, inicia sesión de nuevo')
        setMode('credentials')
        return
      }
      setChallenge(data)
      setChallengeEmail(data.email)
      setMode('mfa')
    })()
  }, [mode])

  const handleMfaRequired = (ch: MfaChallengeResponse, email: string) => {
    setChallenge(ch)
    setChallengeEmail(email)
    setMode('mfa')
  }

  const handleSuccess = (user: AuthUser) => {
    postLoginRedirect(user, router)
  }

  const handleCancel = () => {
    setChallenge(null)
    setMode('credentials')
  }

  return (
    <AuthLayout accent="amber" heroTagline="Bienvenido de vuelta">
      <AnimatePresence mode="wait" initial={false}>
        {mode === 'credentials' && (
          <motion.div key="credentials" {...shrinkExpandProps}>
            <CredentialsForm
              initialError={credentialsError}
              onMfaRequired={handleMfaRequired}
              onSuccess={handleSuccess}
              login={login}
            />
          </motion.div>
        )}
        {mode === 'loading' && (
          <motion.div key="loading" {...shrinkExpandProps}>
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pop-550" />
            </div>
          </motion.div>
        )}
        {mode === 'mfa' && challenge && (
          <motion.div key="mfa" {...shrinkExpandProps}>
            <MfaVerify
              challenge={challenge}
              loginEmail={challengeEmail}
              onSuccess={handleSuccess}
              onExpired={() => {
                setChallenge(null)
                setCredentialsError('Tu sesión MFA expiró, inicia sesión de nuevo')
                setMode('credentials')
              }}
              onCancel={handleCancel}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </AuthLayout>
  )
}

interface CredentialsFormProps {
  initialError: string | null
  onMfaRequired: (challenge: MfaChallengeResponse, email: string) => void
  onSuccess: (user: AuthUser) => void
  login: (email: string, password: string) => Promise<{ error?: string; user?: AuthUser; mfaChallenge?: MfaChallengeResponse }>
}

function CredentialsForm({ initialError, onMfaRequired, onSuccess, login }: CredentialsFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(initialError)

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error: authError, mfaChallenge: ch, user } = await login(email, password)

    if (authError) {
      setError(authError)
      setLoading(false)
      return
    }

    if (ch) {
      onMfaRequired(ch, email)
      setLoading(false)
      return
    }

    if (user) {
      onSuccess(user)
    }
    setLoading(false)
  }

  const handleGoogleSignIn = () => {
    googleRedirect()
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Inicia sesión</h2>
        <p className="text-xs text-muted-foreground mt-1">Ingresa tus credenciales</p>
      </div>

      <form onSubmit={handleEmailAuth} className="space-y-3">
        <input
          type="email"
          placeholder="Correo electrónico"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full px-4 py-3 border border-input bg-background/50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-ring"
        />
        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          className="w-full px-4 py-3 border border-input bg-background/50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 px-4 bg-amber-500 text-background rounded-xl font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Cargando...' : 'Iniciar sesión'}
        </button>
      </form>

      <div className="text-center text-sm">
        <Link href="/auth/register">
          ¿No tienes cuenta? <span className="text-pop-550 hover:opacity-80 transition-opacity">Regístrate</span>
        </Link>
      </div>

      <div className="relative">
        <hr className="my-4" />
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-transparent text-muted-foreground">O continúa con</span>
        </div>
      </div>

      <button
        onClick={handleGoogleSignIn}
        disabled={loading}
        className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-background/50 border border-input rounded-xl hover:bg-muted/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <FontAwesomeIcon icon={faGoogle} className="text-xl" />
        <span className="font-medium">Google</span>
      </button>

      {error && (
        <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-xl text-destructive text-sm">
          {error}
        </div>
      )}
    </div>
  )
}
```

Key behaviors:
- Initial mount reads `?mfa=1` from `useSearchParams` and sets `mode` accordingly.
- `challengeFetched` ref prevents strict-mode double-fire.
- `CredentialsForm` takes `login` as a prop (passed from parent) to keep the auth context call site at the top.
- `login()` return destructures `error`, `mfaChallenge`, AND `user` — the plan assumes the existing `login()` in `auth-context.tsx` returns `user` on successful non-MFA login. If it doesn't, `CredentialsForm` needs a one-line adjustment: call `updateSession` explicitly or re-fetch `/auth/me`. Verify during implementation.
- On direct login success, `CredentialsForm` calls `onSuccess(user)`, which runs `postLoginRedirect`.

- [ ] **Step 4: Run the login page tests**

Run: `npx vitest run components/__tests__/auth/login-page.test.tsx`
Expected: PASS, 3 tests.

- [ ] **Step 5: Run full auth tests**

Run: `npx vitest run components/__tests__/auth/`
Expected: PASS across all auth tests.

- [ ] **Step 6: Commit**

```bash
git add components/auth/login-page.tsx components/__tests__/auth/login-page.test.tsx
git commit -m "feat(auth): add mode state and ?mfa=1 handling to login page"
```

---

## Task 7: Create `/auth/mfa/enrollment` page route

**Files:**
- Create: `app/auth/mfa/enrollment/page.tsx`

- [ ] **Step 1: Create the directory and page file**

```bash
mkdir -p app/auth/mfa/enrollment
```

Create `app/auth/mfa/enrollment/page.tsx`:

```tsx
'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { MfaEnrollment } from '@/components/auth/mfa/mfa-enrollment'
import { useAuth } from '@/lib/contexts/auth-context'
import { postLoginRedirect } from '@/lib/auth/post-login-redirect'

export default function MfaEnrollmentPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const forced = searchParams.get('mfa') === '1'

  const breadcrumbItems = [
    { label: 'Inicio', href: '/' },
    { label: 'MFA', current: true },
  ]

  const handleComplete = () => {
    if (user) {
      postLoginRedirect(user, router)
    } else {
      router.push('/pets')
    }
  }

  const handleSkip = () => {
    if (user) {
      postLoginRedirect(user, router)
    } else {
      router.push('/pets')
    }
  }

  return (
    <MfaEnrollment
      onComplete={handleComplete}
      onSkip={forced ? undefined : handleSkip}
      breadcrumbItems={breadcrumbItems}
    />
  )
}
```

Notes:
- When `?mfa=1` is present, `onSkip` is undefined, which causes `MfaEnrollment` to hide the skip button (the component already conditions the button on `onSkip` existing — verified in `mfa-enrollment.tsx:116`).
- On completion or skip, re-run `postLoginRedirect` to route the user appropriately (if they just enrolled, `mfa_setup_required` will now be false and they'll proceed to their real destination).

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add app/auth/mfa/enrollment/page.tsx
git commit -m "feat(auth): add /auth/mfa/enrollment route with forced mode via ?mfa=1"
```

---

## Task 8: Update Google OAuth callback to use `postLoginRedirect`

**Files:**
- Modify: `app/auth/google/callback/page.tsx`

- [ ] **Step 1: Replace the callback page**

Full replacement of `app/auth/google/callback/page.tsx`:

```tsx
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/contexts/auth-context'
import { apiClient } from '@/lib/api/client'
import { postLoginRedirect } from '@/lib/auth/post-login-redirect'

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
        await postLoginRedirect(user, router)
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

Changes:
- Removed the inline `rolePaths` constant and the if/else role branching.
- Replaced with a single `postLoginRedirect(user, router)` call.
- `postLoginRedirect` internally re-calls `/auth/me` which is slightly redundant (we just fetched it) — acceptable for simplicity. If this becomes a measurable concern, `postLoginRedirect` can be refactored later to accept an optional `meData` parameter.

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add app/auth/google/callback/page.tsx
git commit -m "feat(auth): route google callback through postLoginRedirect"
```

---

## Task 9: Add "Configurar MFA" link to pets-header account sheet

**Files:**
- Modify: `components/pets/pets-header.tsx`

- [ ] **Step 1: Add the `faKey` import**

Open `components/pets/pets-header.tsx`. Find the existing FontAwesome icons import (around line 11):

```ts
import { faTableColumns, faArrowRightFromBracket, faPaw, faComments, faTruckFast } from '@fortawesome/free-solid-svg-icons'
```

Replace with:

```ts
import { faTableColumns, faArrowRightFromBracket, faPaw, faComments, faTruckFast, faKey } from '@fortawesome/free-solid-svg-icons'
```

- [ ] **Step 2: Add the new sheet item above the Logout button**

Find the Logout button inside the sheet (search for `handleLogout` or `profile.logout` inside `pets-header.tsx`). Insert this Link immediately above it, after the last role-specific item:

```tsx
<Link
  href="/auth/mfa/enrollment"
  onClick={() => setSheetOpen(false)}
  className="flex items-center gap-3 px-4 py-3 text-sm font-medium hover:bg-muted rounded-xl transition-colors"
>
  <FontAwesomeIcon icon={faKey} className="text-lg text-muted-foreground" />
  {t('header.setup_mfa')}
</Link>
```

The item must appear outside any role conditional (no `{user?.role === 'member' && ...}` wrapper) so it's visible for every authenticated user.

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 4: Run the existing pets-header smoke tests if present**

Run: `npx vitest run components/__tests__/ --reporter=verbose 2>&1 | grep -i pets-header`
If any test names `pets-header`, ensure they still pass. Expected: either no matches (no test file exists) or all pass.

- [ ] **Step 5: Commit**

```bash
git add components/pets/pets-header.tsx
git commit -m "feat(header): add Configurar MFA link to account sheet"
```

---

## Task 10: Manual browser verification

**Files:** none (verification only)

- [ ] **Step 1: Confirm dev server is running**

Navigate to `http://localhost:3000/auth/login`.

- [ ] **Step 2: Verify the credentials mode**

  - [ ] The login card on the right shows the credentials form (email, password, Sign-in, Google button).
  - [ ] Entering valid credentials for a user WITHOUT MFA logs them in and `postLoginRedirect` sends them to their role-appropriate dashboard.
  - [ ] Entering invalid credentials shows an error inline.

- [ ] **Step 3: Verify the email+password → MFA flow**

Using a test account with MFA enabled:
  - [ ] Enter credentials and click Sign-in.
  - [ ] The card shrinks vertically, the MFA challenge card expands in the same slot.
  - [ ] The MFA card shows the correct method (TOTP by default).
  - [ ] Clicking "Volver al inicio de sesión" shrinks the MFA card and brings the credentials form back.
  - [ ] Entering a valid code runs `postLoginRedirect` and routes correctly.

- [ ] **Step 4: Verify the `?mfa=1` flow**

Manually visit `http://localhost:3000/auth/login?mfa=1` with a valid `mfa_token` cookie set by the backend:
  - [ ] The card shows a spinner briefly.
  - [ ] The MFA challenge card replaces the spinner.
  - [ ] Verifying a valid code routes to the correct destination.
  - [ ] Without a valid `mfa_token` cookie, the card falls back to credentials with "Tu sesión MFA expiró" error visible.

- [ ] **Step 5: Verify the enrollment redirect**

  - [ ] Log in as an admin without MFA enrolled. Expect `postLoginRedirect` to send you to `/auth/mfa/enrollment?mfa=1`.
  - [ ] On that page, the "Skip / Maybe later" button is hidden.
  - [ ] Log in as an RC or business user without MFA. Expect the same enrollment redirect.
  - [ ] Complete enrollment. The page runs `postLoginRedirect` again and this time routes to the correct dashboard.

- [ ] **Step 6: Verify the account sheet MFA link**

  - [ ] Open the avatar sheet from the pets header as any authenticated user.
  - [ ] The "Configurar MFA" item appears between Transport (or whatever the last role-specific item is) and Logout.
  - [ ] Clicking it navigates to `/auth/mfa/enrollment` with the skip button visible (since no `?mfa=1`).

- [ ] **Step 7: No commit for this task** — manual verification only.

---

## Task 11: Final test sweep

**Files:** none (verification only)

- [ ] **Step 1: Run the full Vitest suite**

Run: `npx vitest run`
Expected: PASS across all test files.

- [ ] **Step 2: Run a TypeScript check**

Run: `npx tsc --noEmit`
Expected: no new errors introduced by this feature. Pre-existing unrelated errors (e.g. `theme-toggle.tsx` missing `next-themes`) are OK — ignore them.

- [ ] **Step 3: Commit any incidental formatting**

If any auto-applied formatting changes are staged:

```bash
git add -u
git commit -m "chore(auth): post-sweep formatting for login MFA feature"
```

Otherwise skip this commit.

---

## Self-Review Notes

**Spec coverage check:**

- Login page state & URL detection → Task 6 ✓
- Render branching & animation (shrinkExpandProps, AnimatePresence) → Task 6 ✓
- MfaVerify refactor (remove fixed inset, add onCancel, AuthUser in onSuccess) → Task 5 ✓
- Account sheet "Configurar MFA" link → Task 9 + Task 4 (i18n) ✓
- Post-login redirect helper → Task 3 ✓
- `?mfa=1` on enrollment page (hide skip) → Task 7 ✓
- mfaChallenge() API addition → Task 2 ✓
- MfaChallengeResponse type extension → Task 1 ✓
- Google OAuth callback wiring → Task 8 ✓
- Tests: post-login-redirect, login-page mode transitions → Tasks 3 and 6 ✓
- Edge cases (strict-mode double-fetch guard, cancel link, expired session fallback) → covered in Task 6 ✓
- Known risks (Framer Motion flash, /auth/me roundtrip, MfaVerify consumers) → handled in Task 6 (strict-mode ref) and Task 5 (consumer grep step)

**Placeholder scan:** No TBDs, no "similar to Task N", every step has complete code.

**Type consistency:** `MfaChallengeResponse` (Task 1) is imported by `mfaChallenge` (Task 2), `MfaVerify` (Task 5), and `LoginPage` (Task 6). `AuthUser` is imported by `postLoginRedirect` (Task 3), `MfaVerify` (Task 5), and `LoginPage` (Task 6). `LoginMode` type is scoped to `login-page.tsx` only. `shrinkExpandProps` is scoped to `login-page.tsx` only. Callbacks `onSuccess: (user: AuthUser) => void`, `onExpired: () => void`, `onCancel: () => void` are consistent between MfaVerify definition (Task 5) and call site (Task 6).

**One known assumption flagged:** Task 6 assumes `useAuth().login()` returns `{ error?, user?, mfaChallenge? }`. If the current implementation returns a different shape (e.g. doesn't return `user` directly), Task 6 requires a one-line adjustment: call `updateSession` or re-fetch `/auth/me` inside `CredentialsForm.handleEmailAuth` to obtain the `AuthUser` before calling `onSuccess`. Verify during implementation by reading `lib/contexts/auth-context.tsx`.
