# Cookie-Based Auth Migration Design

## Overview

Migrate the frontend from localStorage-based token management to HTTP-only cookie-based sessions. The backend now sets `access_token`, `refresh_token`, and `mfa_token` as HTTP-only cookies — tokens are never exposed to JavaScript. The frontend stops storing, reading, or passing tokens entirely. All fetch calls use `credentials: 'include'` to let the browser send cookies automatically.

## What the backend changed

- `POST /auth/login` — tokens set as cookies, JSON body returns `{ user }` (or MFA challenge without `mfa_token` field)
- `POST /auth/register` — tokens set as cookies, JSON body returns `{ user }`
- `POST /auth/refresh` — reads refresh token from cookie (JSON body fallback for curl), sets new cookies, returns `{ user }`
- `DELETE /auth/logout` — reads refresh token from cookie, clears cookies
- `PATCH /auth/role` — sets new access token cookie, returns `{ user }`
- `POST /auth/mfa/verify` — reads `mfa_token` from cookie, sets session cookies, returns `{ user }`
- `POST /auth/mfa/email/send`, `POST /auth/mfa/webauthn/assert/begin` — read `mfa_token` from cookie
- `GET /auth/google/callback` — sets cookies and redirects to `{FRONTEND_URL}/auth/google/callback` (no hash fragment)
- `GET /auth/me` — now returns `mfa_setup_required: boolean` in addition to existing fields
- `DELETE /admin/rescue-centers/:id` — now requires `{ mfa_method, mfa_code }` body (strong MFA)
- Backend `RequireAuth` middleware reads `access_token` cookie first, falls back to `Authorization: Bearer` header

## File Changes

### `lib/api/client.ts` — gutted and simplified

**Remove entirely:**
- `storeSession()` — no tokens to store
- `clearSession()` — replaced with a simple event dispatcher
- `getStoredUser()` — auth state comes from `/auth/me` now
- `getStoredAccessToken()` — cookies are automatic
- `getStoredRefreshToken()` — cookies are automatic

**Rewrite `apiClient()`:**
- All requests use `credentials: 'include'` — browser sends cookies automatically
- No `Authorization: Bearer` header — removed entirely
- On 401: attempt refresh via `POST /auth/refresh` with `credentials: 'include'` (no body — cookie sends refresh token). If refresh succeeds, retry original request. If refresh fails, fire `pelu:session-cleared` event.

**Keep:** `pelu:session-cleared` custom event — components still listen for it to clear UI state.

**New export:** `signalSessionCleared()` — fires the event (replaces `clearSession()`).

### `lib/types/user.ts` — type updates

- `AuthResponse`: remove `access_token` and `refresh_token` fields — now just `{ user: AuthUser }`
- `MfaChallengeResponse`: remove `mfa_token` field — now just `{ mfa_required, preferred_method, available_methods }`
- `AuthUser`: add `mfa_setup_required?: boolean` (returned by `/auth/me`)
- Keep `LoginResponse`, `isMfaChallenge`, `MfaMethod`, `MfaMethodInfo`, `MfaMethodsResponse`

### `lib/api/auth.ts` — simplified

**Critical:** `login()` and `register()` use raw `fetch` (not `apiClient`) — they MUST add `credentials: 'include'` to their fetch calls, otherwise the browser will silently drop the `Set-Cookie` headers from the backend and cookies will never be set.

- `login()` — add `credentials: 'include'` to fetch. Remove `storeSession()` call. Just parse JSON and return.
- `register()` — add `credentials: 'include'` to fetch. Remove `storeSession()` call. Just parse JSON and return.
- `logout()` — use `apiClient` (which handles credentials). Remove body — no refresh token needed. Remove `getStoredRefreshToken()` and `clearSession()` calls.
- `setRole()` — already uses `apiClient` (credentials handled). Remove `getStoredRefreshToken()` and `storeSession()`. Return `{ user }`.
- Remove imports: `storeSession`, `clearSession`, `getStoredRefreshToken`, `getStoredUser`

### `lib/api/mfa.ts` — remove token passing

- **Delete** `mfaFetch()` helper entirely
- All MFA verification functions (`mfaVerify`, `mfaEmailSend`, `webauthnAssertBegin`) switch to raw fetch with `credentials: 'include'` — no `mfaToken` parameter. Every raw `fetch` call to the backend must include `credentials: 'include'`.
- `mfaVerify()` return type: `{ user: AuthUser }` instead of `{ access_token, refresh_token, user }`
- All enrollment functions already use `apiClient()` — they just need `apiClient` to include credentials (handled by the `apiClient` rewrite)

### `lib/contexts/auth-context.tsx` — major simplification

**Init on mount:**
- Clear stale localStorage auth keys: remove `pelu_access_token`, `pelu_refresh_token`, `pelu_user` (one-time cleanup after migration).
- Call `GET /auth/me` via `apiClient()`. If 200, set `user` and `mfaSetupRequired` from the response. If 401, user is null. If network error (fetch throws), treat as unauthenticated (user = null) — the user can retry by refreshing.
- Remove: `getStoredAccessToken()`, `getStoredRefreshToken()`, `getStoredUser()`, `isTokenExpired()`, `hasMfaSetupRequired()` — all gone.

**`mfaSetupRequired`:** Read from `/auth/me` response (`mfa_setup_required` field) instead of JWT decoding.

**`login()`:** Returns `{ error, mfaChallenge }` — no token handling.

**`register()`:** Sets user from response — no token handling.

**`updateSession()`:** Simplified to just `setUser(newUser)` — no token parameters, no `storeSession()`. Signature changes from `(user, accessToken)` to `(user)`.

**`logout()`:** Calls `authApi.logout()`, sets user to null. No `clearSession()`.

**Keep:** `pelu:session-cleared` event listener — still needed for hard 401 recovery from `apiClient`. Handler must set both `user` to null AND `mfaSetupRequired` to false (avoid stale state causing redirect loops).

### `lib/api/pets.ts`, `lib/api/rescue-centers.ts`, `lib/api/businesses.ts`, `lib/api/submissions.ts` — multipart uploads

- Remove `getStoredAccessToken()` import
- Remove `Authorization: Bearer ${token}` header
- Add `credentials: 'include'` to raw fetch calls
- Keep raw fetch (still needed for multipart — can't set Content-Type manually)

### `app/auth/google/callback/page.tsx` — rewritten

- Remove URL hash decoding (`#session=...`)
- Remove `storeSession()` import and call
- New flow: on mount, call `GET /auth/me` with `credentials: 'include'`. Cookies are already set by the backend redirect. Set user via `updateSession()`. Redirect to role selection.

### `components/auth/mfa/mfa-verify.tsx` — simplified

- Remove `storeSession()` import and call
- After successful `mfaVerify()`, call `updateSession(data.user)` — no tokens
- Keep `loginEmail` prop (still needed for email masking display)
- `challenge` prop type updated — no `mfa_token` field

### `components/adopt/adopt-pet-page.tsx`

- Remove direct `localStorage.getItem('pelu_access_token')`
- Use `useAuth()` hook to check if user is logged in instead

### `components/auth/protected-route.tsx`

- `mfaSetupRequired` still comes from `useAuth()` — no change needed (AuthContext sources it from `/auth/me` now instead of JWT)

### `components/dashboard/admin/rescue-centers-tab.tsx`

- Update delete flow: `deleteRescueCenter(id)` now requires `{ mfa_method, mfa_code }` body
- Delete dialog adds a 6-digit TOTP code input field (using `MfaCodeInput` component). The admin must enter their authenticator code to confirm deletion.
- `mfa_method` is hardcoded to `"totp"` — the backend only accepts TOTP for destructive admin actions (WebAuthn requires browser interaction that doesn't fit a dialog flow)
- If the admin has no TOTP set up, the backend returns 403 — show the error message from the response

### `lib/api/admin.ts`

- Update `deleteRescueCenter()` signature: `deleteRescueCenter(id, mfaMethod, mfaCode)` — sends `{ mfa_method, mfa_code }` in body

### `components/auth/onboarding/member-wizard.tsx`

- `updateSession()` call signature changes from `(user, accessToken)` to `(user)`
- Fix conditional: change `if (json.user && json.access_token)` to `if (json.user)` — backend no longer returns `access_token` in the body, so the old check would always be falsy and `updateSession()` would never execute

### Files that import from `lib/api/client.ts` — all need import updates

Every file that imported `storeSession`, `clearSession`, `getStoredAccessToken`, `getStoredRefreshToken`, or `getStoredUser` must have those imports removed. Files that only import `apiClient` need no import changes.

## What stays in localStorage

- `pelu_changing_role` — app state flag for role change flow
- `pelu_motivation` — member wizard persistence
- `i18nextLng` — language preference

These are non-auth app state and remain unchanged.

## What gets deleted

- `pelu_access_token` localStorage key — no longer written or read
- `pelu_refresh_token` localStorage key — no longer written or read
- `pelu_user` localStorage key — no longer written or read
- All JWT decoding functions (`isTokenExpired`, `hasMfaSetupRequired`) — can't decode HTTP-only cookies

## Migration safety

- The backend's `RequireAuth` middleware falls back to `Authorization: Bearer` header if no cookie is present — this means curl/Postman testing still works
- Existing localStorage values from before the migration are harmless — they'll just be ignored
- The frontend clears stale localStorage auth keys (`pelu_access_token`, `pelu_refresh_token`, `pelu_user`) on first load in `AuthProvider` init

## Decisions

- Auth state bootstraps via `GET /auth/me` on every app load (no localStorage cache)
- `mfa_setup_required` comes from `/auth/me` response body (backend added this field)
- `pelu:session-cleared` event kept for hard 401 recovery
- `updateSession()` signature simplified to `(user)` — no token param
- Admin RC deletion requires TOTP code in the delete dialog
- Google OAuth callback reads user from `/auth/me` after redirect (cookies already set)
- MFA verification functions no longer accept `mfaToken` parameter — cookie handles it
