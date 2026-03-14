# MFA Frontend Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add multi-factor authentication UI to the Pelú frontend — enrollment after registration, mandatory enforcement for RC/business roles, login verification overlay, and MFA management in settings.

**Architecture:** MFA screens are component states within existing pages (no new routes). The login page gets a backdrop-blur overlay for MFA verification. Enrollment uses the same beams + OnboardingNav style as onboarding wizards. A new `lib/api/mfa.ts` module handles all MFA API calls using raw `fetch` for verification (mfa_token) and `apiClient` for authenticated management.

**Tech Stack:** React 19, Next.js 16 App Router, TailwindCSS v4, Font Awesome icons, react-i18next, WebAuthn browser API (`navigator.credentials`), motion/react for animations, qrcode.react for TOTP QR codes.

**Spec:** `docs/superpowers/specs/2026-03-13-mfa-frontend-design.md`

**Prerequisites:** Run `bun add qrcode.react` before starting implementation.

---

## Chunk 1: Foundation — Types, API Module, i18n Keys

### Task 1: Add MFA types to user.ts

**Files:**
- Modify: `lib/types/user.ts`

- [ ] **Step 1: Add MFA-related types**

Add after the existing `AuthResponse` interface:

```typescript
export interface MfaChallengeResponse {
  mfa_required: true
  mfa_token: string
  preferred_method: MfaMethod
  available_methods: MfaMethod[]
}

export type MfaMethod = 'webauthn' | 'totp' | 'email' | 'recovery'

export interface MfaMethodInfo {
  type: MfaMethod
  id?: string       // only for webauthn
  name?: string     // only for webauthn (e.g. "MacBook Touch ID")
  created_at: string
}

export interface MfaMethodsResponse {
  mfa_enabled: boolean
  methods: MfaMethodInfo[]
  recovery_codes_remaining: number
}

export type LoginResponse = AuthResponse | MfaChallengeResponse
```

- [ ] **Step 2: Add helper type guard**

```typescript
export function isMfaChallenge(res: LoginResponse): res is MfaChallengeResponse {
  return 'mfa_required' in res && res.mfa_required === true
}
```

- [ ] **Step 3: Commit**

```bash
git add lib/types/user.ts
git commit -m "feat: add MFA types to user.ts"
```

---

### Task 2: Create MFA API module

**Files:**
- Create: `lib/api/mfa.ts`

- [ ] **Step 1: Create the MFA API module**

```typescript
import { apiClient } from './client'
import { AuthUser, MfaMethodsResponse } from '@/lib/types/user'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

// --- Helper for mfa_token requests (raw fetch, NOT apiClient) ---

async function mfaFetch(path: string, mfaToken: string, options: RequestInit = {}): Promise<Response> {
  return fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${mfaToken}`,
      ...(options.headers as Record<string, string> || {}),
    },
  })
}

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

// --- Verification (uses mfa_token, raw fetch) ---

export async function mfaVerify(mfaToken: string, method: string, codeOrAssertion: string | unknown): Promise<{ data: { access_token: string; refresh_token: string; user: AuthUser } | null; error: string | null }> {
  const body = method === 'webauthn'
    ? { method, assertion: codeOrAssertion }
    : { method, code: codeOrAssertion }
  const res = await mfaFetch('/api/v1/auth/mfa/verify', mfaToken, {
    method: 'POST',
    body: JSON.stringify(body),
  })
  const json = await res.json()
  if (!res.ok) return { data: null, error: json.error || 'Código inválido o expirado' }
  return { data: json, error: null }
}

export async function mfaEmailSend(mfaToken: string): Promise<{ data: unknown | null; error: string | null }> {
  const res = await mfaFetch('/api/v1/auth/mfa/email/send', mfaToken, { method: 'POST' })
  const json = await res.json()
  if (!res.ok) return { data: null, error: json.error || 'Error al enviar código' }
  return { data: json, error: null }
}

export async function webauthnAssertBegin(mfaToken: string): Promise<{ data: unknown | null; error: string | null }> {
  const res = await mfaFetch('/api/v1/auth/mfa/webauthn/assert/begin', mfaToken, { method: 'POST' })
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
git commit -m "feat: add MFA API module"
```

---

### Task 3: Add i18n keys for MFA

**Files:**
- Modify: `public/locales/es/auth.json`
- Modify: `public/locales/en/auth.json`

Note: `lib/i18n/index.ts` already imports `auth.json` for both locales — no changes needed there.

- [ ] **Step 1: Add Spanish MFA keys**

Add to `public/locales/es/auth.json` after the `role_selection` block:

```json
"mfa": {
  "enrollment": {
    "title": "Protege tu cuenta",
    "subtitle": "Agrega un método de autenticación de dos factores",
    "skip": "Omitir por ahora",
    "passkey": "Passkey",
    "passkey_desc": "Usar huella o Face ID",
    "recommended": "Recomendado",
    "totp": "App de autenticación",
    "totp_desc": "Código de 6 dígitos",
    "email": "Código por email",
    "email_desc": "Enviar código a tu correo",
    "continue": "Configurar",
    "success": "¡Método configurado!",
    "totp_scan": "Escanea el código QR con tu app de autenticación",
    "totp_manual": "O ingresa esta clave manualmente:",
    "totp_confirm": "Ingresa el código de 6 dígitos de tu app",
    "passkey_prompt": "Registrar passkey",
    "passkey_waiting": "Sigue las instrucciones de tu navegador..."
  },
  "verify": {
    "title": "Verificación de identidad",
    "subtitle_totp": "Ingresa el código de tu app de autenticación",
    "subtitle_email": "Ingresa el código enviado a tu correo",
    "subtitle_passkey": "Verifica con tu passkey",
    "subtitle_recovery": "Ingresa un código de recuperación",
    "verify_button": "Verificar",
    "passkey_button": "Verificar con passkey",
    "other_method": "Usar otro método",
    "use_recovery": "Usar código de recuperación",
    "email_sent": "Código enviado a {{email}}",
    "error_invalid": "Código inválido o expirado",
    "error_expired": "Tu sesión expiró, inicia sesión de nuevo"
  },
  "settings": {
    "title": "Autenticación de dos factores",
    "enabled": "Activado",
    "disabled": "Desactivado",
    "setup": "Configurar",
    "add_method": "Agregar método",
    "recovery_title": "Códigos de recuperación",
    "recovery_remaining": "{{count}} códigos restantes",
    "recovery_regenerate": "Regenerar",
    "delete_confirm_title": "Confirmar contraseña",
    "delete_confirm_desc": "Ingresa tu contraseña para eliminar este método",
    "password_placeholder": "Contraseña",
    "confirm_button": "Confirmar",
    "cancel": "Cancelar",
    "last_method_warning": "Debes tener al menos un método activo"
  },
  "recovery": {
    "title": "Códigos de recuperación",
    "subtitle": "Guarda estos códigos en un lugar seguro. Cada código solo se puede usar una vez.",
    "copy_all": "Copiar todos",
    "copied": "¡Copiados!",
    "close": "Entendido"
  }
}
```

- [ ] **Step 2: Add English MFA keys**

Add the equivalent to `public/locales/en/auth.json`:

```json
"mfa": {
  "enrollment": {
    "title": "Protect your account",
    "subtitle": "Add a two-factor authentication method",
    "skip": "Skip for now",
    "passkey": "Passkey",
    "passkey_desc": "Use fingerprint or Face ID",
    "recommended": "Recommended",
    "totp": "Authenticator app",
    "totp_desc": "6-digit code",
    "email": "Email code",
    "email_desc": "Send code to your email",
    "continue": "Set up",
    "success": "Method configured!",
    "totp_scan": "Scan the QR code with your authenticator app",
    "totp_manual": "Or enter this key manually:",
    "totp_confirm": "Enter the 6-digit code from your app",
    "passkey_prompt": "Register passkey",
    "passkey_waiting": "Follow your browser instructions..."
  },
  "verify": {
    "title": "Identity verification",
    "subtitle_totp": "Enter the code from your authenticator app",
    "subtitle_email": "Enter the code sent to your email",
    "subtitle_passkey": "Verify with your passkey",
    "subtitle_recovery": "Enter a recovery code",
    "verify_button": "Verify",
    "passkey_button": "Verify with passkey",
    "other_method": "Use another method",
    "use_recovery": "Use recovery code",
    "email_sent": "Code sent to {{email}}",
    "error_invalid": "Invalid or expired code",
    "error_expired": "Your session expired, please sign in again"
  },
  "settings": {
    "title": "Two-factor authentication",
    "enabled": "Enabled",
    "disabled": "Disabled",
    "setup": "Set up",
    "add_method": "Add method",
    "recovery_title": "Recovery codes",
    "recovery_remaining": "{{count}} codes remaining",
    "recovery_regenerate": "Regenerate",
    "delete_confirm_title": "Confirm password",
    "delete_confirm_desc": "Enter your password to remove this method",
    "password_placeholder": "Password",
    "confirm_button": "Confirm",
    "cancel": "Cancel",
    "last_method_warning": "You must have at least one active method"
  },
  "recovery": {
    "title": "Recovery codes",
    "subtitle": "Save these codes in a safe place. Each code can only be used once.",
    "copy_all": "Copy all",
    "copied": "Copied!",
    "close": "Got it"
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add public/locales/es/auth.json public/locales/en/auth.json
git commit -m "feat: add MFA i18n keys (es + en)"
```

---

### Task 4: Update login API to handle MFA response

**Files:**
- Modify: `lib/api/auth.ts`
- Modify: `lib/types/user.ts` (already has `LoginResponse` type from Task 1)

- [ ] **Step 1: Update login function return type and logic**

In `lib/api/auth.ts`, change the `login` function. The key change: when `mfa_required` is true, do NOT call `storeSession()` — return the MFA challenge data instead.

```typescript
// Change import to include new types
import { AuthResponse, UserRole, LoginResponse, isMfaChallenge } from '@/lib/types/user'

// Change login return type
export async function login(email: string, password: string): Promise<{ data: LoginResponse | null; error: string | null }> {
  const res = await fetch(`${BASE_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  const json = await res.json()
  if (!res.ok) return { data: null, error: json.error || 'Error al iniciar sesión' }

  // If MFA is required, don't store session — return challenge data
  if (isMfaChallenge(json)) {
    return { data: json, error: null }
  }

  storeSession(json.access_token, json.refresh_token, json.user)
  return { data: json, error: null }
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/api/auth.ts
git commit -m "feat: login() detects MFA challenge, skips storeSession"
```

---

### Task 5: Update AuthContext to expose MFA state

**Files:**
- Modify: `lib/contexts/auth-context.tsx`

- [ ] **Step 1: Update context type and login method**

Add MFA state fields and update the `login` method to return MFA challenge info when needed.

Changes to `AuthContextType` interface:

```typescript
interface AuthContextType {
  user: AuthUser | null
  loading: boolean
  login: (email: string, password: string) => Promise<{ error: string | null; mfaChallenge: MfaChallengeResponse | null }>
  register: (email: string, password: string) => Promise<{ error: string | null }>
  logout: () => Promise<void>
  setRole: (role: UserRole) => Promise<{ error: string | null }>
  updateSession: (user: AuthUser, accessToken: string) => void
}
```

Update imports at top:

```typescript
import { AuthUser, UserRole, MfaChallengeResponse, isMfaChallenge } from '@/lib/types/user'
```

Update default context value:

```typescript
login: async () => ({ error: null, mfaChallenge: null }),
```

Update the `login` method inside `AuthProvider`:

```typescript
const login = async (email: string, password: string): Promise<{ error: string | null; mfaChallenge: MfaChallengeResponse | null }> => {
  const { data, error } = await authApi.login(email, password)
  if (error || !data) return { error, mfaChallenge: null }

  if (isMfaChallenge(data)) {
    return { error: null, mfaChallenge: data }
  }

  setUser(data.user)
  return { error: null, mfaChallenge: null }
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/contexts/auth-context.tsx
git commit -m "feat: AuthContext login returns MFA challenge data"
```

---

## Chunk 2: Shared MFA Components

### Task 6: Create 6-digit code input component

**Files:**
- Create: `components/auth/mfa/mfa-code-input.tsx`

- [ ] **Step 1: Create the component**

A shared 6-digit OTP input with auto-submit. Used in TOTP confirm, login verification, and email OTP.

```typescript
'use client'

import { useState, useRef, useEffect, KeyboardEvent } from 'react'

interface MfaCodeInputProps {
  onComplete: (code: string) => void
  disabled?: boolean
  error?: string | null
}

export function MfaCodeInput({ onComplete, disabled, error }: MfaCodeInputProps) {
  const [digits, setDigits] = useState<string[]>(Array(6).fill(''))
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    inputRefs.current[0]?.focus()
  }, [])

  // Clear digits when error changes (allow retry)
  useEffect(() => {
    if (error) {
      setDigits(Array(6).fill(''))
      inputRefs.current[0]?.focus()
    }
  }, [error])

  const handleChange = (index: number, value: string) => {
    // Only accept digits
    const digit = value.replace(/\D/g, '').slice(-1)
    const newDigits = [...digits]
    newDigits[index] = digit
    setDigits(newDigits)

    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }

    // Auto-submit when all 6 digits are filled
    if (digit && index === 5) {
      const code = newDigits.join('')
      if (code.length === 6) onComplete(code)
    } else if (digit) {
      // Check if this was the last empty slot
      const code = newDigits.join('')
      if (code.length === 6) onComplete(code)
    }
  }

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pasted.length === 0) return
    const newDigits = Array(6).fill('')
    pasted.split('').forEach((d, i) => { newDigits[i] = d })
    setDigits(newDigits)
    if (pasted.length === 6) {
      onComplete(pasted)
    } else {
      inputRefs.current[pasted.length]?.focus()
    }
  }

  return (
    <div>
      <div className="flex gap-2 justify-center">
        {digits.map((digit, i) => (
          <input
            key={i}
            ref={(el) => { inputRefs.current[i] = el }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onPaste={i === 0 ? handlePaste : undefined}
            disabled={disabled}
            className={`w-11 h-13 text-center text-xl font-semibold border rounded-xl bg-background focus:outline-hidden focus:ring-2 focus:ring-ring focus:border-transparent disabled:opacity-50 ${
              error ? 'border-destructive' : 'border-input'
            }`}
          />
        ))}
      </div>
      {error && (
        <p className="text-destructive text-sm text-center mt-3">{error}</p>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/auth/mfa/mfa-code-input.tsx
git commit -m "feat: add MfaCodeInput shared component"
```

---

### Task 7: Create recovery codes modal

**Files:**
- Create: `components/auth/mfa/mfa-recovery-modal.tsx`

- [ ] **Step 1: Create the modal component**

```typescript
'use client'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCopy, faCheck } from '@fortawesome/free-solid-svg-icons'

interface MfaRecoveryModalProps {
  codes: string[]
  onClose: () => void
}

export function MfaRecoveryModal({ codes, onClose }: MfaRecoveryModalProps) {
  const { t } = useTranslation('auth')
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(codes.join('\n'))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative bg-card rounded-2xl p-6 w-full max-w-md space-y-4 border shadow-lg">
        <h2 className="text-lg font-semibold">{t('mfa.recovery.title')}</h2>
        <p className="text-sm text-muted-foreground">{t('mfa.recovery.subtitle')}</p>

        <div className="grid grid-cols-2 gap-2 p-4 bg-muted rounded-xl font-mono text-sm">
          {codes.map((code, i) => (
            <div key={i} className="px-2 py-1">{code}</div>
          ))}
        </div>

        <button
          onClick={handleCopy}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-input rounded-xl text-sm hover:bg-muted transition-colors"
        >
          <FontAwesomeIcon icon={copied ? faCheck : faCopy} className="w-4 h-4" />
          {copied ? t('mfa.recovery.copied') : t('mfa.recovery.copy_all')}
        </button>

        <button
          onClick={onClose}
          className="w-full py-3 px-4 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors"
        >
          {t('mfa.recovery.close')}
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/auth/mfa/mfa-recovery-modal.tsx
git commit -m "feat: add MfaRecoveryModal component"
```

---

### Task 8: Create password confirmation modal

**Files:**
- Create: `components/auth/mfa/mfa-password-confirm.tsx`

- [ ] **Step 1: Create the modal component**

Used in settings when deleting an MFA method.

```typescript
'use client'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'

interface MfaPasswordConfirmProps {
  onConfirm: (password: string) => Promise<void>
  onCancel: () => void
  error?: string | null
}

export function MfaPasswordConfirm({ onConfirm, onCancel, error }: MfaPasswordConfirmProps) {
  const { t } = useTranslation('auth')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    await onConfirm(password)
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-card rounded-2xl p-6 w-full max-w-sm space-y-4 border shadow-lg">
        <h3 className="font-semibold">{t('mfa.settings.delete_confirm_title')}</h3>
        <p className="text-sm text-muted-foreground">{t('mfa.settings.delete_confirm_desc')}</p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t('mfa.settings.password_placeholder')}
            required
            className="w-full px-4 py-2 border border-input rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-ring focus:border-transparent"
          />
          {error && <p className="text-destructive text-sm">{error}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading || !password}
              className="flex-1 py-2 px-4 bg-destructive text-destructive-foreground rounded-xl text-sm font-medium hover:bg-destructive/90 transition-colors disabled:opacity-50"
            >
              {loading ? '...' : t('mfa.settings.confirm_button')}
            </button>
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="flex-1 py-2 px-4 border border-input rounded-xl text-sm hover:bg-muted transition-colors"
            >
              {t('mfa.settings.cancel')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/auth/mfa/mfa-password-confirm.tsx
git commit -m "feat: add MfaPasswordConfirm modal"
```

---

## Chunk 3: MFA Enrollment Flow

### Task 9: Create TOTP setup component

**Files:**
- Create: `components/auth/mfa/mfa-totp-setup.tsx`

- [ ] **Step 1: Create the component**

Shows QR code, manual secret, and 6-digit confirmation input.

Note: For QR code rendering, use a simple `<img>` tag with a QR code API URL generated from the `qr_uri` value. The backend returns the `otpauth://` URI which can be encoded into a QR code. Use the `qrcode` npm package or generate via a data URL. Since we want to keep dependencies minimal, we'll use the approach of encoding it with a lightweight inline canvas approach. However, the simplest approach is to install `qrcode.react`:

```bash
bun add qrcode.react
```

```typescript
'use client'

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { QRCodeSVG } from 'qrcode.react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCopy, faCheck } from '@fortawesome/free-solid-svg-icons'
import * as mfaApi from '@/lib/api/mfa'
import { MfaCodeInput } from './mfa-code-input'

interface MfaTotpSetupProps {
  onSuccess: (recoveryCodes?: string[]) => void
  onBack: () => void
}

export function MfaTotpSetup({ onSuccess, onBack }: MfaTotpSetupProps) {
  const { t } = useTranslation('auth')
  const [step, setStep] = useState<'loading' | 'scan' | 'confirm'>('loading')
  const [secret, setSecret] = useState('')
  const [qrUri, setQrUri] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [verifying, setVerifying] = useState(false)
  const [copiedSecret, setCopiedSecret] = useState(false)

  // Start setup on mount
  useEffect(() => {
    mfaApi.totpSetup().then(({ data, error: err }) => {
      if (err || !data) {
        setError(err || 'Error')
        return
      }
      setSecret(data.secret)
      setQrUri(data.qr_uri)
      setStep('scan')
    })
  }, [])

  const handleCopySecret = async () => {
    await navigator.clipboard.writeText(secret)
    setCopiedSecret(true)
    setTimeout(() => setCopiedSecret(false), 2000)
  }

  const handleConfirm = async (code: string) => {
    setVerifying(true)
    setError(null)
    const { data, error: err } = await mfaApi.totpConfirm(code)
    setVerifying(false)
    if (err) {
      setError(err)
      return
    }
    onSuccess(data?.recovery_codes)
  }

  if (step === 'loading') {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="text-sm text-muted-foreground hover:text-foreground">
        ← {t('mfa.settings.cancel')}
      </button>

      {step === 'scan' && (
        <>
          <p className="text-sm text-muted-foreground">{t('mfa.enrollment.totp_scan')}</p>
          <div className="flex justify-center p-4 bg-white rounded-xl">
            <QRCodeSVG value={qrUri} size={200} />
          </div>
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">{t('mfa.enrollment.totp_manual')}</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 px-3 py-2 bg-muted rounded-xl text-xs font-mono break-all">{secret}</code>
              <button onClick={handleCopySecret} className="p-2 hover:bg-muted rounded-xl transition-colors">
                <FontAwesomeIcon icon={copiedSecret ? faCheck : faCopy} className="w-4 h-4" />
              </button>
            </div>
          </div>
          <button
            onClick={() => setStep('confirm')}
            className="w-full py-3 px-4 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors"
          >
            {t('mfa.enrollment.continue')}
          </button>
        </>
      )}

      {step === 'confirm' && (
        <>
          <p className="text-sm text-muted-foreground">{t('mfa.enrollment.totp_confirm')}</p>
          <MfaCodeInput onComplete={handleConfirm} disabled={verifying} error={error} />
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/auth/mfa/mfa-totp-setup.tsx
git commit -m "feat: add MfaTotpSetup component with QR code"
```

---

### Task 10: Create passkey setup component

**Files:**
- Create: `components/auth/mfa/mfa-passkey-setup.tsx`

- [ ] **Step 1: Create the component**

Triggers the browser WebAuthn registration flow.

```typescript
'use client'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faKey } from '@fortawesome/free-solid-svg-icons'
import * as mfaApi from '@/lib/api/mfa'

interface MfaPasskeySetupProps {
  onSuccess: (recoveryCodes?: string[]) => void
  onBack: () => void
}

export function MfaPasskeySetup({ onSuccess, onBack }: MfaPasskeySetupProps) {
  const { t } = useTranslation('auth')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleRegister = async () => {
    setLoading(true)
    setError(null)

    // Step 1: Get registration challenge from backend
    const { data: options, error: beginError } = await mfaApi.webauthnRegisterBegin()
    if (beginError || !options) {
      setError(beginError || 'Error')
      setLoading(false)
      return
    }

    // Step 2: Trigger browser native prompt
    try {
      const credential = await navigator.credentials.create({
        publicKey: options as PublicKeyCredentialCreationOptions,
      })
      if (!credential) {
        setError('No se pudo crear la credencial')
        setLoading(false)
        return
      }

      // Step 3: Send attestation to backend
      const { data, error: finishError } = await mfaApi.webauthnRegisterFinish(credential)
      if (finishError) {
        setError(finishError)
        setLoading(false)
        return
      }

      onSuccess(data?.recovery_codes)
    } catch (err) {
      // User cancelled or browser doesn't support WebAuthn
      setError(err instanceof Error ? err.message : 'Error al registrar passkey')
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="text-sm text-muted-foreground hover:text-foreground">
        ← {t('mfa.settings.cancel')}
      </button>

      <div className="text-center space-y-4">
        <FontAwesomeIcon icon={faKey} className="w-12 h-12 text-pop-550" />
        <p className="text-sm text-muted-foreground">
          {loading ? t('mfa.enrollment.passkey_waiting') : t('mfa.enrollment.passkey_desc')}
        </p>
      </div>

      {error && (
        <p className="text-destructive text-sm text-center">{error}</p>
      )}

      <button
        onClick={handleRegister}
        disabled={loading}
        className="w-full py-3 px-4 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
      >
        {loading ? '...' : t('mfa.enrollment.passkey_prompt')}
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/auth/mfa/mfa-passkey-setup.tsx
git commit -m "feat: add MfaPasskeySetup component with WebAuthn"
```

---

### Task 11: Create MFA enrollment screen

**Files:**
- Create: `components/auth/mfa/mfa-enrollment.tsx`

- [ ] **Step 1: Create the enrollment component**

Shows all 3 methods as selectable cards. Used post-registration (skippable) and at end of RC/business wizard (mandatory). Includes `BackgroundBeams` and `OnboardingNav`.

```typescript
'use client'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faKey, faMobileScreen, faEnvelope, faShieldHalved } from '@fortawesome/free-solid-svg-icons'
import { BackgroundBeams } from '@/components/ui/beams'
import { OnboardingNav } from '@/components/auth/onboarding/onboarding-nav'
import { MfaTotpSetup } from './mfa-totp-setup'
import { MfaPasskeySetup } from './mfa-passkey-setup'
import { MfaRecoveryModal } from './mfa-recovery-modal'
import * as mfaApi from '@/lib/api/mfa'
import { MfaMethod } from '@/lib/types/user'

interface MfaEnrollmentProps {
  onComplete: () => void
  onSkip?: () => void  // undefined = mandatory (no skip)
  breadcrumbItems: { label: string; href?: string; current?: boolean; changeRole?: boolean }[]
}

export function MfaEnrollment({ onComplete, onSkip, breadcrumbItems }: MfaEnrollmentProps) {
  const { t } = useTranslation('auth')
  const [selectedMethod, setSelectedMethod] = useState<MfaMethod | null>(null)
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null)

  const methods = [
    { key: 'webauthn' as MfaMethod, icon: faKey, label: t('mfa.enrollment.passkey'), desc: t('mfa.enrollment.passkey_desc'), recommended: true },
    { key: 'totp' as MfaMethod, icon: faMobileScreen, label: t('mfa.enrollment.totp'), desc: t('mfa.enrollment.totp_desc'), recommended: false },
    { key: 'email' as MfaMethod, icon: faEnvelope, label: t('mfa.enrollment.email'), desc: t('mfa.enrollment.email_desc'), recommended: false },
  ]

  const handleSuccess = (codes?: string[]) => {
    if (codes && codes.length > 0) {
      setRecoveryCodes(codes)
    } else {
      onComplete()
    }
  }

  const handleSelectMethod = async (method: MfaMethod) => {
    if (method === 'email') {
      // Email OTP is instant — enable it immediately
      const { data, error } = await mfaApi.emailEnable()
      if (error) return // TODO: show error
      handleSuccess(data?.recovery_codes)
    } else {
      setSelectedMethod(method)
    }
  }

  // Recovery codes modal → then complete
  if (recoveryCodes) {
    return <MfaRecoveryModal codes={recoveryCodes} onClose={onComplete} />
  }

  // Method-specific setup screens
  if (selectedMethod === 'totp') {
    return (
      <div className="dark relative min-h-screen overflow-hidden bg-background">
        <BackgroundBeams />
        <OnboardingNav items={breadcrumbItems} />
        <div className="relative z-10 flex min-h-screen items-center justify-center p-4 pt-20">
          <div className="w-full max-w-md bg-background/90 backdrop-blur-xl rounded-2xl p-8 inset-shadow-[1px_1px_1px_var(--color-input)]">
            <MfaTotpSetup onSuccess={handleSuccess} onBack={() => setSelectedMethod(null)} />
          </div>
        </div>
      </div>
    )
  }

  if (selectedMethod === 'webauthn') {
    return (
      <div className="dark relative min-h-screen overflow-hidden bg-background">
        <BackgroundBeams />
        <OnboardingNav items={breadcrumbItems} />
        <div className="relative z-10 flex min-h-screen items-center justify-center p-4 pt-20">
          <div className="w-full max-w-md bg-background/90 backdrop-blur-xl rounded-2xl p-8 inset-shadow-[1px_1px_1px_var(--color-input)]">
            <MfaPasskeySetup onSuccess={handleSuccess} onBack={() => setSelectedMethod(null)} />
          </div>
        </div>
      </div>
    )
  }

  // Method picker screen
  return (
    <div className="dark relative min-h-screen overflow-hidden bg-background">
      <BackgroundBeams />
      <OnboardingNav items={breadcrumbItems} />

      <div className="relative z-10 flex min-h-screen items-center justify-center p-4 pt-20">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-2">
            <FontAwesomeIcon icon={faShieldHalved} className="w-12 h-12 text-pop-550" />
            <h1 className="text-2xl font-bold text-foreground">{t('mfa.enrollment.title')}</h1>
            <p className="text-muted-foreground">{t('mfa.enrollment.subtitle')}</p>
          </div>

          <div className="space-y-3">
            {methods.map((m) => (
              <button
                key={m.key}
                onClick={() => handleSelectMethod(m.key)}
                className="w-full p-4 bg-background/90 backdrop-blur-xl rounded-2xl border border-input hover:border-pop-450/50 transition-all text-left flex items-center gap-4 inset-shadow-[1px_1px_1px_var(--color-input)]"
              >
                <FontAwesomeIcon icon={m.icon} className="w-5 h-5 text-pop-550" />
                <div className="flex-1">
                  <div className="font-medium text-foreground">{m.label}</div>
                  <div className="text-sm text-muted-foreground">{m.desc}</div>
                </div>
                {m.recommended && (
                  <span className="text-xs px-2 py-1 bg-pop-550/20 text-pop-450 rounded-lg font-medium">
                    {t('mfa.enrollment.recommended')}
                  </span>
                )}
              </button>
            ))}
          </div>

          {onSkip && (
            <button
              onClick={onSkip}
              className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {t('mfa.enrollment.skip')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/auth/mfa/mfa-enrollment.tsx
git commit -m "feat: add MfaEnrollment screen with method picker"
```

---

## Chunk 4: Login MFA Verify & Auth Flow Integration

### Task 12: Create MFA verify overlay for login

**Files:**
- Create: `components/auth/mfa/mfa-verify.tsx`

- [ ] **Step 1: Create the verify overlay component**

Backdrop-blur overlay on top of the login page. Shows preferred method input directly with "use another method" link.

```typescript
'use client'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faShieldHalved, faKey, faMobileScreen, faEnvelope } from '@fortawesome/free-solid-svg-icons'
import { MfaCodeInput } from './mfa-code-input'
import * as mfaApi from '@/lib/api/mfa'
import { MfaChallengeResponse, MfaMethod } from '@/lib/types/user'
import { storeSession } from '@/lib/api/client'
import { useAuth } from '@/lib/contexts/auth-context'

interface MfaVerifyProps {
  challenge: MfaChallengeResponse
  loginEmail: string  // email from the login form, used for masking (user is null during MFA verify)
  onSuccess: () => void
  onExpired: () => void
}

export function MfaVerify({ challenge, loginEmail, onSuccess, onExpired }: MfaVerifyProps) {
  const { t } = useTranslation('auth')
  const { updateSession } = useAuth()
  const [activeMethod, setActiveMethod] = useState<MfaMethod>(challenge.preferred_method)
  const [showMethodPicker, setShowMethodPicker] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)

  // Mask email from the login form value (user is null during MFA verify since session isn't stored yet)
  const maskedEmail = loginEmail
    ? loginEmail.slice(0, 2) + '***@' + loginEmail.split('@')[1]
    : '***'

  const handleVerify = async (codeOrAssertion: string | unknown) => {
    setLoading(true)
    setError(null)
    const { data, error: err } = await mfaApi.mfaVerify(challenge.mfa_token, activeMethod, codeOrAssertion)
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
      storeSession(data.access_token, data.refresh_token, data.user)
      updateSession(data.user, data.access_token)
      onSuccess()
    }
  }

  const handleSwitchMethod = async (method: MfaMethod) => {
    setActiveMethod(method)
    setShowMethodPicker(false)
    setError(null)

    // Auto-send email OTP when switching to email
    if (method === 'email') {
      const { error: sendErr } = await mfaApi.mfaEmailSend(challenge.mfa_token)
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

    const { data: options, error: beginErr } = await mfaApi.webauthnAssertBegin(challenge.mfa_token)
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

  // Method picker view
  if (showMethodPicker) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-md" />
        <div className="relative bg-card rounded-2xl p-6 w-full max-w-sm space-y-4 border shadow-lg">
          <div className="text-center">
            <FontAwesomeIcon icon={faShieldHalved} className="w-8 h-8 text-pop-550 mb-2" />
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
                <FontAwesomeIcon icon={methodIcons[method]} className="w-4 h-4" />
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
      </div>
    )
  }

  // Main verify view
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" />
      <div className="relative bg-card rounded-2xl p-6 w-full max-w-sm space-y-5 border shadow-lg">
        <div className="text-center space-y-1">
          <FontAwesomeIcon icon={faShieldHalved} className="w-8 h-8 text-pop-550 mb-2" />
          <h2 className="font-semibold">{t('mfa.verify.title')}</h2>
          <p className="text-sm text-muted-foreground">{t(subtitleKeys[activeMethod])}</p>
          {activeMethod === 'email' && emailSent && (
            <p className="text-xs text-pop-450">{t('mfa.verify.email_sent', { email: maskedEmail })}</p>
          )}
        </div>

        {/* Code input for TOTP, Email */}
        {(activeMethod === 'totp' || activeMethod === 'email') && (
          <MfaCodeInput onComplete={handleVerify} disabled={loading} error={error} />
        )}

        {/* Recovery code text input */}
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

        {/* Passkey button */}
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
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/auth/mfa/mfa-verify.tsx
git commit -m "feat: add MfaVerify backdrop-blur overlay for login"
```

---

### Task 13: Integrate MFA into login page

**Files:**
- Modify: `components/auth/login-page.tsx`

- [ ] **Step 1: Add MFA state and overlay to login page**

Key changes:
1. Import `MfaVerify` and `MfaChallengeResponse`
2. Add `mfaChallenge` state
3. In `handleEmailAuth`, check for MFA challenge response
4. Render `MfaVerify` overlay when `mfaChallenge` is set

Update the imports:

```typescript
import { MfaVerify } from '@/components/auth/mfa/mfa-verify'
import { MfaChallengeResponse } from '@/lib/types/user'
```

Add state after existing states:

```typescript
const [mfaChallenge, setMfaChallenge] = useState<MfaChallengeResponse | null>(null)
```

Update `handleEmailAuth` — replace the current `const { error: authError } = await login(email, password)` block:

```typescript
const { error: authError, mfaChallenge: challenge } = await login(email, password)

if (authError) {
  setError(authError)
  setLoading(false)
  return
}

if (challenge) {
  setMfaChallenge(challenge)
  setLoading(false)
  return
}

router.push('/auth/role-selection')
setLoading(false)
```

Add before the closing `</div>` of the component return (after the card):

```tsx
{mfaChallenge && (
  <MfaVerify
    challenge={mfaChallenge}
    loginEmail={email}
    onSuccess={() => router.push('/auth/role-selection')}
    onExpired={() => {
      setMfaChallenge(null)
      setError('Tu sesión expiró, inicia sesión de nuevo')
    }}
  />
)}
```

- [ ] **Step 2: Commit**

```bash
git add components/auth/login-page.tsx
git commit -m "feat: integrate MFA verify overlay into login page"
```

---

### Task 14: Add MFA enrollment prompt after registration

**Files:**
- Modify: `components/auth/register-page.tsx`

- [ ] **Step 1: Add MFA enrollment state to register page**

After successful registration, show `MfaEnrollment` instead of immediately redirecting. Only for email/password registrations (not Google OAuth).

Add imports:

```typescript
import { MfaEnrollment } from '@/components/auth/mfa/mfa-enrollment'
```

Add state:

```typescript
const [showMfaEnrollment, setShowMfaEnrollment] = useState(false)
```

Update `handleSubmit` — after successful register, instead of `router.push('/auth/role-selection')`:

```typescript
setShowMfaEnrollment(true)
setLoading(false)
```

Add conditional render before the main return. If `showMfaEnrollment` is true, render the enrollment screen:

```typescript
if (showMfaEnrollment) {
  return (
    <MfaEnrollment
      onComplete={() => router.push('/auth/role-selection')}
      onSkip={() => router.push('/auth/role-selection')}
      breadcrumbItems={[
        { label: 'Inicio', href: '/' },
        { label: 'Registro', href: '/auth/register' },
        { label: 'Seguridad', current: true },
      ]}
    />
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/auth/register-page.tsx
git commit -m "feat: show MFA enrollment prompt after registration"
```

---

## Chunk 5: Mandatory MFA in Onboarding Wizards & Role Selection Update

### Task 15: Add mandatory MFA to rescue center wizard

**Files:**
- Modify: `components/auth/onboarding/rescue-center-wizard.tsx`

- [ ] **Step 1: Add MFA enrollment as final step**

After the wizard form is submitted successfully (the RC is created), instead of immediately showing the "¡Solicitud enviada!" success screen, show MFA enrollment first (mandatory, no skip). After MFA enrollment completes, then show the success screen.

Add import:

```typescript
import { MfaEnrollment } from '@/components/auth/mfa/mfa-enrollment'
```

Add state after existing states:

```typescript
const [showMfaEnrollment, setShowMfaEnrollment] = useState(false)
```

In `handleSubmit`, replace `setSubmitted(true)` at the end with:

```typescript
setShowMfaEnrollment(true)
```

Add a conditional render block before the existing `if (submitted)` block:

```typescript
if (showMfaEnrollment) {
  return (
    <MfaEnrollment
      onComplete={() => {
        setShowMfaEnrollment(false)
        setSubmitted(true)
      }}
      breadcrumbItems={[
        { label: 'Inicio', href: '/' },
        { label: 'Registro', href: '/auth/register' },
        { label: 'Rol', href: '/auth/role-selection', changeRole: true },
        { label: 'Centro de Rescate' },
        { label: 'Seguridad', current: true },
      ]}
    />
  )
}
```

Note: No `onSkip` prop → makes it mandatory.

- [ ] **Step 2: Commit**

```bash
git add components/auth/onboarding/rescue-center-wizard.tsx
git commit -m "feat: mandatory MFA enrollment in RC wizard"
```

---

### Task 16: Add mandatory MFA to business wizard

**Files:**
- Modify: `components/auth/onboarding/business-wizard.tsx`

- [ ] **Step 1: Same pattern as rescue center wizard**

Add the same import, state, and conditional render as Task 15 but with business-specific breadcrumb:

```typescript
import { MfaEnrollment } from '@/components/auth/mfa/mfa-enrollment'
```

Add state:

```typescript
const [showMfaEnrollment, setShowMfaEnrollment] = useState(false)
```

Replace `setSubmitted(true)` at end of `handleSubmit` with:

```typescript
setShowMfaEnrollment(true)
```

Add conditional before `if (submitted)`:

```typescript
if (showMfaEnrollment) {
  return (
    <MfaEnrollment
      onComplete={() => {
        setShowMfaEnrollment(false)
        setSubmitted(true)
      }}
      breadcrumbItems={[
        { label: 'Inicio', href: '/' },
        { label: 'Registro', href: '/auth/register' },
        { label: 'Rol', href: '/auth/role-selection', changeRole: true },
        { label: 'Negocio' },
        { label: 'Seguridad', current: true },
      ]}
    />
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/auth/onboarding/business-wizard.tsx
git commit -m "feat: mandatory MFA enrollment in business wizard"
```

---

### Task 17: Add BackgroundBeams and OnboardingNav to role selection

**Files:**
- Modify: `components/auth/role-selection.tsx`

- [ ] **Step 1: Add visual consistency with onboarding flow**

Add imports:

```typescript
import { BackgroundBeams } from '@/components/ui/beams'
import { OnboardingNav } from '@/components/auth/onboarding/onboarding-nav'
```

Wrap the return JSX — replace the outer `<div className="flex min-h-screen items-center justify-center p-4">` with:

```tsx
<div className="dark relative min-h-screen overflow-hidden bg-background">
  <BackgroundBeams />
  <OnboardingNav
    items={[
      { label: 'Inicio', href: '/' },
      { label: 'Registro', href: '/auth/register' },
      { label: 'Rol', current: true },
    ]}
  />
  <div className="relative z-10 flex min-h-screen items-center justify-center p-4 pt-20">
    <div className="w-full max-w-2xl">
      {/* ... existing content unchanged ... */}
    </div>
  </div>
</div>
```

- [ ] **Step 2: Commit**

```bash
git add components/auth/role-selection.tsx
git commit -m "feat: add BackgroundBeams + OnboardingNav to role selection"
```

---

## Chunk 6: MFA Management in Settings & Restricted Token Handling

### Task 18: Add MFA security section to settings tab

**Files:**
- Modify: `components/dashboard/rescue-center/settings-tab.tsx`

- [ ] **Step 1: Add MFA management section**

Add imports at top:

```typescript
import { useTranslation } from 'react-i18next'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faKey, faMobileScreen, faEnvelope, faTrash, faShieldHalved, faPlus } from '@fortawesome/free-solid-svg-icons'
import * as mfaApi from '@/lib/api/mfa'
import { MfaMethodInfo } from '@/lib/types/user'
import { MfaPasswordConfirm } from '@/components/auth/mfa/mfa-password-confirm'
import { MfaRecoveryModal } from '@/components/auth/mfa/mfa-recovery-modal'
import { MfaEnrollment } from '@/components/auth/mfa/mfa-enrollment'
```

Add state after existing states:

```typescript
const { t } = useTranslation('auth')
const [mfaMethods, setMfaMethods] = useState<MfaMethodInfo[]>([])
const [mfaEnabled, setMfaEnabled] = useState(false)
const [recoveryRemaining, setRecoveryRemaining] = useState(0)
const [deleteTarget, setDeleteTarget] = useState<MfaMethodInfo | null>(null)
const [deleteError, setDeleteError] = useState<string | null>(null)
const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null)
const [showAddMethod, setShowAddMethod] = useState(false)
```

Add useEffect to fetch MFA methods:

```typescript
useEffect(() => {
  mfaApi.getMethods().then(({ data }) => {
    if (data) {
      setMfaMethods(data.methods)
      setMfaEnabled(data.mfa_enabled)
      setRecoveryRemaining(data.recovery_codes_remaining)
    }
  })
}, [])
```

Add handler functions:

```typescript
const handleDeleteMethod = async (password: string) => {
  if (!deleteTarget) return
  setDeleteError(null)
  let result
  if (deleteTarget.type === 'totp') result = await mfaApi.deleteTotp(password)
  else if (deleteTarget.type === 'webauthn') result = await mfaApi.deleteWebauthn(deleteTarget.id!, password)
  else if (deleteTarget.type === 'email') result = await mfaApi.deleteEmail(password)
  else return

  if (result?.error) {
    setDeleteError(result.error)
    return
  }
  setMfaMethods((prev) => prev.filter((m) => m !== deleteTarget))
  setDeleteTarget(null)
}

const handleRegenRecovery = async () => {
  const { data } = await mfaApi.regenerateRecoveryCodes()
  if (data) {
    setRecoveryCodes(data.recovery_codes)
    setRecoveryRemaining(data.recovery_codes.length)
  }
}

const methodIcon = (type: string) => {
  if (type === 'webauthn') return faKey
  if (type === 'totp') return faMobileScreen
  return faEnvelope
}

const methodLabel = (m: MfaMethodInfo) => {
  if (m.type === 'webauthn') return m.name || 'Passkey'
  if (m.type === 'totp') return t('mfa.enrollment.totp')
  return t('mfa.enrollment.email')
}
```

Add the security card JSX — insert between the rescue center name card and the logout card (between line 149 and line 150 in the current file):

```tsx
{/* Security / MFA */}
<div className="rounded-2xl border bg-card p-6 space-y-4">
  <div className="flex items-center justify-between">
    <h2 className="font-semibold">{t('mfa.settings.title')}</h2>
    <span className={`text-xs px-2 py-1 rounded-lg font-medium ${
      mfaEnabled ? 'bg-green-500/20 text-green-400' : 'bg-muted text-muted-foreground'
    }`}>
      {mfaEnabled ? t('mfa.settings.enabled') : t('mfa.settings.disabled')}
    </span>
  </div>

  {mfaMethods.length > 0 && (
    <div className="space-y-2">
      {mfaMethods.map((m, i) => (
        <div key={i} className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl">
          <FontAwesomeIcon icon={methodIcon(m.type)} className="w-4 h-4 text-muted-foreground" />
          <div className="flex-1">
            <div className="text-sm font-medium">{methodLabel(m)}</div>
            <div className="text-xs text-muted-foreground">
              {new Date(m.created_at).toLocaleDateString()}
            </div>
          </div>
          <button
            onClick={() => mfaMethods.length > 1 ? setDeleteTarget(m) : undefined}
            disabled={mfaMethods.length <= 1}
            title={mfaMethods.length <= 1 ? t('mfa.settings.last_method_warning') : undefined}
            className={`p-2 rounded-xl transition-colors ${
              mfaMethods.length > 1
                ? 'hover:bg-destructive/10 text-destructive'
                : 'text-muted-foreground/30 cursor-not-allowed'
            }`}
          >
            <FontAwesomeIcon icon={faTrash} className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  )}

  {/* Add method button */}
  {mfaEnabled && (
    <button
      onClick={() => setShowAddMethod(true)}
      className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-input rounded-xl text-sm hover:bg-muted transition-colors"
    >
      <FontAwesomeIcon icon={faPlus} className="w-3.5 h-3.5" />
      {t('mfa.settings.add_method')}
    </button>
  )}

  {/* Recovery codes info */}
  {mfaEnabled && (
    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-xl">
      <div>
        <div className="text-sm font-medium">{t('mfa.settings.recovery_title')}</div>
        <div className="text-xs text-muted-foreground">
          {t('mfa.settings.recovery_remaining', { count: recoveryRemaining })}
        </div>
      </div>
      <button
        onClick={handleRegenRecovery}
        className="text-xs px-3 py-1 border border-input rounded-xl hover:bg-muted transition-colors"
      >
        {t('mfa.settings.recovery_regenerate')}
      </button>
    </div>
  )}

  {/* Setup button when MFA is not enabled */}
  {!mfaEnabled && mfaMethods.length === 0 && (
    <div className="text-center space-y-3">
      <p className="text-sm text-muted-foreground">
        Agrega un método de autenticación para proteger tu cuenta.
      </p>
      <button
        onClick={() => setShowAddMethod(true)}
        className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors"
      >
        {t('mfa.settings.setup')}
      </button>
    </div>
  )}
</div>
```

Add modals at the bottom of the component return (before the closing `</div>`):

```tsx
{deleteTarget && (
  <MfaPasswordConfirm
    onConfirm={handleDeleteMethod}
    onCancel={() => { setDeleteTarget(null); setDeleteError(null) }}
    error={deleteError}
  />
)}
{recoveryCodes && (
  <MfaRecoveryModal codes={recoveryCodes} onClose={() => setRecoveryCodes(null)} />
)}
{showAddMethod && (
  <div className="fixed inset-0 z-50">
    <MfaEnrollment
      onComplete={() => {
        setShowAddMethod(false)
        // Refresh MFA methods list
        mfaApi.getMethods().then(({ data }) => {
          if (data) {
            setMfaMethods(data.methods)
            setMfaEnabled(data.mfa_enabled)
            setRecoveryRemaining(data.recovery_codes_remaining)
          }
        })
      }}
      onSkip={() => setShowAddMethod(false)}
      breadcrumbItems={[
        { label: 'Dashboard' },
        { label: 'Seguridad', current: true },
      ]}
    />
  </div>
)}
```

- [ ] **Step 2: Commit**

```bash
git add components/dashboard/rescue-center/settings-tab.tsx
git commit -m "feat: add MFA security section to RC settings"
```

---

### Task 19: Handle mfa_setup_required restricted tokens

**Files:**
- Modify: `lib/contexts/auth-context.tsx`

- [ ] **Step 1: Detect mfa_setup_required in stored tokens**

When the auth context initializes and finds a stored token, check if it has `mfa_setup_required: true` in its JWT claims. Expose this as a context value so `ProtectedRoute` can redirect.

Add to `AuthContextType`:

```typescript
mfaSetupRequired: boolean
```

Add state:

```typescript
const [mfaSetupRequired, setMfaSetupRequired] = useState(false)
```

Add a helper function to check the JWT claim (after existing `isTokenExpired`):

```typescript
function hasMfaSetupRequired(accessToken: string): boolean {
  try {
    const payload = JSON.parse(atob(accessToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    return payload.mfa_setup_required === true
  } catch {
    return false
  }
}
```

In the `init` effect, after `setUser(storedUser)` (both in the non-expired and refreshed branches), add:

```typescript
setMfaSetupRequired(hasMfaSetupRequired(accessToken))
```

Update the context provider value to include `mfaSetupRequired`:

```typescript
<AuthContext.Provider value={{ user, loading, login, register, logout, setRole, updateSession, mfaSetupRequired }}>
```

Update the default context value too:

```typescript
mfaSetupRequired: false,
```

- [ ] **Step 2: Commit**

```bash
git add lib/contexts/auth-context.tsx
git commit -m "feat: detect mfa_setup_required in stored JWT"
```

---

### Task 20: Redirect mfa_setup_required users in ProtectedRoute

**Files:**
- Modify: `components/auth/protected-route.tsx`

- [ ] **Step 1: Add MFA setup redirect**

In `ProtectedRoute`, after the existing role checks, add a check for `mfaSetupRequired`. If true, redirect to a special state that shows MFA enrollment.

We'll redirect to a query-param URL to trigger the enrollment: `/auth/role-selection?mfa_setup=1`. However, since we want to keep things simple and not add new routes, the cleanest approach is: if `mfaSetupRequired` is true and the user has a role that requires MFA (rescue_center or business), redirect to `/auth/onboarding/${user.role}?mfa_setup=1`.

But actually, the simplest approach is to render the `MfaEnrollment` component inline in the ProtectedRoute when `mfaSetupRequired` is true.

Update imports:

```typescript
import { MfaEnrollment } from '@/components/auth/mfa/mfa-enrollment'
```

Update the destructuring from `useAuth()`:

```typescript
const { user, loading, mfaSetupRequired } = useAuth()
```

After the existing role checks but before rendering children, add:

```typescript
if (mfaSetupRequired && user?.role && ['rescue_center', 'business'].includes(user.role)) {
  return (
    <MfaEnrollment
      onComplete={async () => {
        // After enrolling, clear session and redirect to login
        // so the user gets a fresh token without mfa_setup_required
        const { logout } = await import('@/lib/api/auth')
        await logout()
        window.location.href = '/auth/login'
      }}
      breadcrumbItems={[
        { label: 'Inicio', href: '/' },
        { label: 'Seguridad', current: true },
      ]}
    />
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/auth/protected-route.tsx
git commit -m "feat: redirect mfa_setup_required users to MFA enrollment"
```

---

### Task 21: Manual testing & final commit

- [ ] **Step 1: Verify lint passes**

```bash
bun run lint
```

Fix any lint errors.

- [ ] **Step 2: Test the following flows manually in the browser**

1. **Register → MFA enrollment prompt** — register a new account, verify the MFA enrollment screen appears with beams + OnboardingNav, click "Omitir por ahora" to skip
2. **Role selection visual update** — verify BackgroundBeams and OnboardingNav appear on role selection page
3. **RC wizard mandatory MFA** — complete RC onboarding wizard, verify MFA enrollment appears after form submission (no skip link)
4. **Login with MFA** — if you set up TOTP/email MFA, verify the backdrop-blur overlay appears after login, enter code to complete
5. **Settings MFA management** — go to RC dashboard Settings, verify "Seguridad" section shows enabled methods, trash icon muted when only 1 method

- [ ] **Step 3: Fix any issues found during testing**

- [ ] **Step 4: Final commit if any fixes were made**

```bash
git add -A
git commit -m "fix: address issues found during MFA manual testing"
```
