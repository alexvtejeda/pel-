# Login-Page Inline MFA Challenge Design

**Date:** 2026-04-14
**Scope:** `/auth/login` route, `MfaVerify` component, account sheet in `pets-header`, post-login redirect helper, Google OAuth callback, existing MFA enrollment page.
**Context:** The backend now enforces TOTP for admins on sensitive actions (RC approval, deletions). When a Google-OAuth admin lands on the frontend, the backend sets an `mfa_token` cookie and redirects to `/auth/login?mfa=1`. Currently the frontend has no handling for that URL. This spec wires it up, refactors the existing `MfaVerify` from modal overlay to inline card content, and adds an MFA self-service entry point to the account sheet.

## Goal

Replace the credentials form inside the login page's right-side `AuthLayout` card with an MFA challenge card when `?mfa=1` is present in the URL, animate the swap with a vertical shrink/expand, and share the same swap mechanism with the email+password login path (which previously showed `MfaVerify` as a full-screen overlay).

## Scope

- **In scope:** login page behavior, `MfaVerify` refactor to inline, account sheet MFA link, admin auto-redirect helper, `?mfa=1` signal on the enrollment page, Google OAuth callback wiring.
- **Out of scope:** MFA enrollment page internals (already built), backend MFA endpoint changes (the new `GET /api/v1/auth/mfa/challenge` endpoint is confirmed done), the backend's decision of where to redirect Google OAuth users, register page flow (unchanged — registration + MFA still redirects to `/auth/role-selection`).

## Login page state & URL detection

`components/auth/login-page.tsx` gains a `mode` state with three values:

```ts
type LoginMode = 'credentials' | 'loading' | 'mfa'
```

**Initial value:** `'loading'` when `searchParams.get('mfa') === '1'`, otherwise `'credentials'`. The `loading` state exists solely to avoid flashing an empty card while `mfaChallenge()` is in flight.

**Mount effect:** when `mode === 'loading'`, call `mfaChallenge()` once. On success, store the returned `MfaChallengeResponse` and switch to `mode: 'mfa'`. On error, fall back to `mode: 'credentials'` and surface a soft error: "Tu sesión MFA expiró, inicia sesión de nuevo."

**Transitions driven by email+password login:**
- `login()` returns `{ mfaChallenge }` → set challenge state, `setMode('mfa')`.
- `login()` returns success with no challenge → `postLoginRedirect(user, router)`.
- `login()` returns error → stay in `'credentials'` and surface the error.

**Transitions driven by MfaVerify:**
- `onSuccess(user)` → `postLoginRedirect(user, router)`.
- `onExpired()` → clear challenge state, `setMode('credentials')`, surface expired message.
- `onCancel()` → clear challenge state, `setMode('credentials')`. Adds a "Volver al inicio de sesión" link inside the MFA card so the user can back out manually.

## Render branching & animation

The credentials form JSX moves into an internal `CredentialsForm` component defined inside `login-page.tsx`. The root render uses `AnimatePresence` with `mode="wait"` + `initial={false}` so only one child is visible at a time, and the swap plays exit-then-enter with no overlap.

```tsx
<AuthLayout accent="amber" heroTagline="Bienvenido de vuelta">
  <AnimatePresence mode="wait" initial={false}>
    {mode === 'credentials' && (
      <motion.div
        key="credentials"
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        transition={{ duration: 0.2, ease: 'easeInOut' }}
        style={{ overflow: 'hidden' }}
      >
        <CredentialsForm onMfaRequired={(challenge, email) => {
          setChallenge(challenge)
          setChallengeEmail(email)
          setMode('mfa')
        }} onSuccess={(user) => postLoginRedirect(user, router)} />
      </motion.div>
    )}
    {mode === 'loading' && (
      <motion.div key="loading" {...shrinkExpandProps}>
        <LoadingSpinner />
      </motion.div>
    )}
    {mode === 'mfa' && challenge && (
      <motion.div key="mfa" {...shrinkExpandProps}>
        <MfaVerify
          challenge={challenge}
          loginEmail={challengeEmail}
          onSuccess={(user) => postLoginRedirect(user, router)}
          onExpired={() => { setChallenge(null); setMode('credentials') }}
          onCancel={() => { setChallenge(null); setMode('credentials') }}
        />
      </motion.div>
    )}
  </AnimatePresence>
</AuthLayout>
```

`shrinkExpandProps` is a shared constant with the same `initial`/`animate`/`exit`/`transition`/`style` props so all three children animate consistently.

Animation timings are tunable: 200ms duration, `easeInOut`. The vertical shrink uses `height: 'auto'` ↔ `0` with `overflow: hidden` on the wrapper so content is clipped during the collapse.

## MfaVerify refactor: modal → inline

`components/auth/mfa/mfa-verify.tsx` loses its full-screen overlay wrappers and becomes a plain block card. The content (heading, code input / passkey button / recovery form, method picker, "other method" link, "cancel" link) stays identical in structure — only the surrounding positioning changes.

**Deletions:**
- `<div className="fixed inset-0 z-50 flex items-center justify-center p-4">` wrapper (both the method-picker branch and the main verify branch).
- `<div className="absolute inset-0 bg-black/60 backdrop-blur-md" />` backdrop.
- `<div className="relative bg-card rounded-2xl p-6 w-full max-w-sm …">` inner card — redundant because the parent `AuthLayout` right-side slot already provides padding and rounding.

**Method picker:** becomes an inline expanding section, not a separate full-screen modal. When "otro método" is clicked, the current code input collapses and the method list slides down in its place via the same `AnimatePresence` mechanism.

**New prop signature:**

```ts
interface MfaVerifyProps {
  challenge: MfaChallengeResponse
  loginEmail: string
  onSuccess: (user: AuthUser) => void
  onExpired: () => void
  onCancel: () => void
}
```

`onSuccess` now receives the authenticated `AuthUser` so callers can run `postLoginRedirect(user, router)` based on role. `onCancel` is new — callers wire it to return to the credentials form.

**All existing i18n keys reused.** No new copy strings for the MFA card itself; only a new "Volver al inicio de sesión" key (`auth:mfa.verify.back_to_login`) for the cancel link.

## Account sheet "Configurar MFA" link

`components/pets/pets-header.tsx` adds a new universal item inside the avatar sheet, positioned after all role-specific items and before the Logout button:

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

Visible for every authenticated role (member, rescue_center, business, admin). Admins see it too, even though they're already being force-redirected there on login — it's a valid way for them to re-enroll or regenerate recovery codes.

**Icon import:** `faKey` from `@fortawesome/free-solid-svg-icons`, added alongside the existing icon imports.

**i18n keys** in `public/locales/es/pets.json` and `public/locales/en/pets.json`:

```json
{
  "header": {
    "setup_mfa": "Configurar MFA"
  }
}
```

English: `"Set up MFA"`.

## Post-login redirect helper

New file `lib/auth/post-login-redirect.ts`:

```ts
import { apiClient } from '@/lib/api/client'
import { AuthUser } from '@/lib/types/user'

type RouterLike = { push: (path: string) => void }

export async function postLoginRedirect(user: AuthUser, router: RouterLike) {
  // `GET /auth/me` returns is_admin + mfa_setup_required (backend-computed, unspoofable).
  // mfa_setup_required is true when:
  //   - user is rescue_center/business with no MFA (non-Google), OR
  //   - user is an admin with no MFA (any provider, including Google)
  // The backend README explicitly calls out this field as the signal to redirect to
  // enrollment on app load, exactly for this flow.
  try {
    const res = await apiClient('/api/v1/auth/me')
    if (res.ok) {
      const me = await res.json()
      if (me.mfa_setup_required === true) {
        router.push('/auth/mfa/enrollment?mfa=1')
        return
      }
    }
  } catch {
    // Fall through to role-based redirect on /auth/me failure
  }

  switch (user.role) {
    case 'rescue_center':
      router.push('/dashboard/rescue-center')
      return
    case 'business':
      router.push('/dashboard/business')
      return
    case 'admin':
      // Admin role is exposed as the user's regular role — actual admin access
      // comes from the ADMIN_USER_IDS env allow-list on the backend. Route admins
      // to the admin dashboard only if `me.is_admin === true` (checked by the
      // dashboard guard component itself; here we just send them to the right URL).
      router.push('/dashboard/admin')
      return
    case 'member':
      router.push('/pets')
      return
    default:
      router.push('/auth/role-selection')
  }
}
```

**Call sites:**
1. `login-page.tsx` — email+password success without challenge.
2. `login-page.tsx` — `MfaVerify.onSuccess` callback (covers both email+password + challenge and `?mfa=1` Google OAuth flows).
3. `app/auth/google/callback/page.tsx` (or equivalent) — after Google OAuth success with no MFA requirement.

Registration flow is NOT touched. Registration success continues to redirect to `/auth/role-selection` as it does today.

## `?mfa=1` on the enrollment page

The existing MFA enrollment page (`components/auth/mfa/mfa-enrollment.tsx` or equivalent) reads `searchParams.get('mfa') === '1'` and, when true, hides the "Skip / Maybe later" button so admins cannot dodge enrollment. One-line guard, no other changes to the enrollment flow.

Consistent semantics: `?mfa=1` means "MFA is required for this user" regardless of which page it's on — login shows the challenge, enrollment hides skip.

## API additions

`lib/api/mfa.ts` — one new export:

```ts
export async function mfaChallenge(): Promise<{ data: MfaChallengeResponse | null; error: string | null }> {
  const res = await fetch(`${BASE_URL}/api/v1/auth/mfa/challenge`, {
    method: 'GET',
    credentials: 'include',
  })
  const json = await res.json()
  if (!res.ok) return { data: null, error: json.error || 'Sesión MFA expirada' }
  return { data: json, error: null }
}
```

Uses raw `fetch` with `credentials: 'include'` because the `mfa_token` cookie is the auth. Matches the pattern already used by `mfaVerify`, `mfaEmailSend`, and `webauthnAssertBegin`.

**Response shape from the backend** (confirmed via `pelu-api/README.md`):

```ts
interface MfaChallengeResponse {
  email: string              // already masked by backend: "a***@example.com"
  preferred_method: MfaMethod
  available_methods: MfaMethod[]
  strong_methods_available: boolean
}
```

The existing `MfaChallengeResponse` type in `lib/types/user.ts` must be checked against this shape and extended if needed. `strong_methods_available` is a new field — true iff the user has TOTP or WebAuthn enrolled. If the type is missing it, add it.

**Strong-methods warning for admins (optional UX nicety):** when `strong_methods_available === false` AND the user is an admin (checked via `/auth/me` `is_admin` field), surface a soft warning inside the MFA card: "Tu método de MFA actual no permite acceso al panel de administración. Considera configurar TOTP o un passkey." This is from the backend README recommendation and is a nice-to-have — if it complicates implementation, defer to a follow-up.

## Tests

New file `components/__tests__/auth/login-page.test.tsx`:

1. Renders `CredentialsForm` when URL has no `mfa` query param.
2. With `?mfa=1`, calls `mfaChallenge()` on mount, then renders `MfaVerify` with the returned challenge. Requires mocking `mfaChallenge` and `useSearchParams`.
3. If `mfaChallenge()` returns an error, falls back to `CredentialsForm` and shows an expired-session message.
4. Email+password success WITH challenge transitions from `mode: 'credentials'` to `mode: 'mfa'`. Observable via DOM change (credentials fields disappear, MFA heading appears).
5. `MfaVerify.onCancel` callback transitions from `mfa` → `credentials`. Verified by clicking the cancel link inside the MFA card.

Updates to existing `MfaVerify` tests (if any exist): remove assertions about the modal overlay (`fixed inset-0`, backdrop `div`), add assertions that the component renders as a plain block.

GSAP-style caveat: Framer Motion timing is not asserted. The tests check DOM state transitions, not animation frames.

## Edge cases

1. **User lands on `/auth/login?mfa=1` with no active `mfa_token` cookie** (e.g., deep-linked). `mfaChallenge()` returns 401. Frontend falls back to `mode: 'credentials'` with a soft error: "Tu sesión MFA expiró, inicia sesión de nuevo."

2. **User clicks "Volver al inicio de sesión" during MFA challenge.** The MFA card collapses, credentials form expands back in. The `mfa_token` cookie on the backend still exists until TTL; re-logging issues a fresh challenge normally.

3. **User refreshes while in `mode: 'mfa'` after email+password login.** URL has no `?mfa=1`, so `mode` resets to `'credentials'` on reload. The user enters credentials again. Persisting mode across refresh is out of scope.

4. **Admin-with-MFA who logs in successfully but has no role set.** `postLoginRedirect` falls through to `/auth/role-selection`. Subsequent logins after role-set hit `/dashboard/admin` via the role switch.

5. **Admin loses TOTP device after forced enrollment.** Out of scope. Recovery via recovery codes or backend operator intervention.

6. **Concurrent login tabs.** If the second tab tries to verify a stale challenge, the backend returns an expired error, `onExpired` fires, `mode` resets to `credentials`, soft error shown.

## Known risks

1. **Framer Motion `AnimatePresence` flash on exit/enter.** `mode="wait"` + `initial={false}` prevents the enter animation on first mount and ensures no overlap between exit and enter. Timings: 200ms exit, 200ms enter, `easeInOut`.

2. **`/auth/me` round-trip adds ~100ms to login success.** Acceptable for a rare event. The alternative (putting `is_admin` on `AuthUser`) was rejected for spoofing reasons.

3. **Existing `pets-header.tsx` `/auth/me` call and the new one in `postLoginRedirect` could race.** They're separate effects with different lifecycles, and each call is independent and idempotent, so there's no correctness issue — just two requests in quick succession on the first authenticated page load. Acceptable.

4. **`MfaVerify` consumers outside the login page** — the register page, if it uses `MfaVerify`, will break visually when we remove the overlay wrapper. The spec assumes the only consumer is the login page. Any additional consumer (register page, a settings page) must be updated in this same task. Verify during implementation with a grep for `<MfaVerify`.

## Files

**New:**
- `lib/auth/post-login-redirect.ts` — the `postLoginRedirect` helper.
- `components/__tests__/auth/login-page.test.tsx` — unit tests for the login page mode transitions.

**Modified:**
- `components/auth/login-page.tsx` — adds `mode` state, `?mfa=1` detection, `AnimatePresence` shrink/expand, `CredentialsForm` internal component, wires `postLoginRedirect`.
- `components/auth/mfa/mfa-verify.tsx` — refactor from fixed overlay to inline card content; new `onCancel` prop; `onSuccess` now receives `AuthUser`.
- `components/pets/pets-header.tsx` — new "Configurar MFA" link with `faKey` icon, between Transport and Logout.
- `public/locales/es/pets.json` and `public/locales/en/pets.json` — add `header.setup_mfa`.
- `public/locales/es/auth.json` and `public/locales/en/auth.json` — add `mfa.verify.back_to_login`.
- `lib/api/mfa.ts` — add `mfaChallenge()` export.
- The existing MFA enrollment page — read `?mfa=1`, hide skip button when present.
- The Google OAuth callback page — call `postLoginRedirect(user, router)` on success.

**Deleted:** none.

## Out of scope reminders

- Backend MFA endpoint work. `GET /api/v1/auth/mfa/challenge` is assumed done.
- The MFA enrollment page internals (TOTP setup, passkey setup, recovery code generation). We only toggle the skip button via `?mfa=1`.
- Register page flow. Still redirects to `/auth/role-selection` on success.
- Persisting MFA mode across page refresh.
- Rate-limiting, brute-force protection, and audit logging — backend concerns.
