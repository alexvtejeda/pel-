# MFA Frontend Design

## Overview

Frontend implementation for multi-factor authentication. Three MFA methods (WebAuthn/passkeys, TOTP, email OTP) plus recovery codes. MFA is skippable for members, mandatory for `rescue_center` and `business` roles before admin approval.

Google OAuth users are exempt — Google handles its own 2FA.

## Auth Flow Changes

### Current flow
```
Register → Role Selection → Onboarding → Dashboard
Login → Dashboard
```

### New flow
```
Register → MFA Enrollment Prompt (skippable) → Role Selection → Onboarding Wizard
  └─ if RC/business → Mandatory MFA Enrollment (end of wizard) → Admin approval

Login (MFA enabled) → MFA Verify overlay (backdrop-blur) → Dashboard
Login (no MFA) → Dashboard (unchanged)
```

### Login response handling

`POST /auth/login` now returns two possible shapes:

1. **No MFA:** `{ access_token, refresh_token, user }` — existing flow, unchanged
2. **MFA enabled:** `{ mfa_required: true, mfa_token, preferred_method, available_methods }` — triggers verify overlay

The `mfa_token` (5-minute TTL) is held in React component state only — never persisted to localStorage.

## Screen 1: MFA Enrollment (Post-Registration & Mandatory)

### Context and behavior

| | Post-Registration | RC/Business Mandatory |
|---|---|---|
| **When** | Right after register | End of onboarding wizard |
| **Skippable** | Yes ("Omitir por ahora" subtle text link) | No |
| **Background** | `BackgroundBeams` component | `BackgroundBeams` (already present in wizard) |
| **Header** | `OnboardingNav` breadcrumb | `OnboardingNav` breadcrumb |

### Breadcrumb paths

- **Post-registration:** Inicio → Registro → **Seguridad**
- **RC mandatory (end of wizard):** Inicio → Registro → Rol → Centro de Rescate → **Seguridad**
- **Business mandatory (end of wizard):** Inicio → Registro → Rol → Negocio → **Seguridad**

### Layout

Welcoming style — celebratory feel, not the dark auth page. Consistent with onboarding wizards.

Shows all 3 methods as selectable cards:

1. **Passkeys** — labeled "Recomendado", subtitle "Usar huella o Face ID"
2. **App de autenticación** — subtitle "Código de 6 dígitos"
3. **Código por email** — subtitle "Enviar código a tu correo"

User selects one card, then proceeds to method-specific setup.

### Per-method setup flow

- **Passkeys:** Triggers `navigator.credentials.create()` via `POST /mfa/webauthn/register/begin` → browser native prompt → `POST /mfa/webauthn/register/finish`
- **TOTP:** Calls `POST /mfa/totp/setup` → shows QR code + manual secret string → user enters 6-digit code from authenticator app → `POST /mfa/totp/confirm`
- **Email OTP:** Calls `POST /mfa/email/enable` → enabled immediately (simplest method)

### Recovery codes modal

After the first MFA method is successfully enrolled, the backend auto-generates 8 recovery codes and returns them in the enrollment response.

- Modal/dialog overlay appears with all 8 codes displayed
- "Copiar todos" button to copy all codes to clipboard
- User dismisses modal when ready
- For mandatory flow: wizard completes after dismissal, admin approval request fires
- For skippable flow: user continues to role selection

## Screen 2: MFA Verify at Login (Returning Users)

### Trigger

Login page detects `mfa_required: true` in the login response.

### Visual treatment

- Login page stays visible behind a **`backdrop-blur` overlay** — frosted glass effect
- Focused card appears centered on the blurred background
- Dark auth page style (no beams, no OnboardingNav — this is a quick verification step)

### Default view (preferred method)

Shows input for the user's `preferred_method` directly (single focused card):

- **TOTP / Email OTP:** 6-digit code input boxes, auto-submit when all digits entered
- **Passkeys:** "Verificar con passkey" button → calls `webauthnAssertBegin(mfaToken)` to get challenge → triggers `navigator.credentials.get()` with challenge → sends resolved assertion to `mfaVerify(mfaToken, "webauthn", assertion)`

### Secondary actions

- "Usar otro método →" text link at bottom → replaces card content with method picker list (all `available_methods`)
- "Usar código de recuperación →" link below that

### Email OTP sub-flow

When user switches to email method:
1. Automatically calls `POST /mfa/email/send`
2. Shows "Código enviado a tu***@email.com" confirmation
3. Same 6-digit input as TOTP

### State management

- `mfa_token` in component state only (never localStorage)
- On success: receives `{ access_token, refresh_token, user }` → stores session → redirects normally
- On failure: show error inline, allow retry
- On token expiry (5 min): dismiss overlay, show "Tu sesión expiró, inicia sesión de nuevo"

## Screen 3: MFA Management in Settings

### Location

New "Seguridad" card in the existing Settings tab, placed between profile info and the danger zone (logout/delete account).

### Data source

`GET /mfa/methods` → `{ mfa_enabled, methods[], recovery_codes_remaining }`

### Card layout

**Header:** "Autenticación de dos factores" with status badge ("Activado" green / "Desactivado" gray)

**When MFA is enabled — enrolled methods list:**
- Each method as a row: icon + method name + date added + trash icon
- Passkeys show their user-given name (e.g. "MacBook Touch ID")
- **1 method enrolled:** Trash icon muted/disabled (not clickable) — RC/business must keep at least one method
- **2+ methods enrolled:** Trash icon active → triggers password confirmation modal → `DELETE /mfa/{method}`
- "Agregar método" button → opens enrollment component (method picker)
- "Códigos de recuperación" sub-section: "X códigos restantes" + "Regenerar" button (calls `POST /mfa/recovery/generate`, shows new codes in modal)

**When MFA is not enabled:**
- Brief explanation text
- "Configurar" button → opens enrollment component

## Screen 4: Role Selection Update

Not MFA-specific, but part of this work to maintain visual consistency across the onboarding flow.

### Changes
- Add `BackgroundBeams` component (matching all onboarding wizards)
- Add `OnboardingNav` header with breadcrumb: Inicio → Registro → **Rol**

No functional changes — just visual alignment.

## New Files

| File | Purpose |
|---|---|
| `components/auth/mfa/mfa-enrollment.tsx` | Method picker (3 cards, passkeys "Recomendado"). Used post-registration and mandatory flow |
| `components/auth/mfa/mfa-verify.tsx` | Login verification overlay (backdrop-blur, focused card, code input) |
| `components/auth/mfa/mfa-totp-setup.tsx` | QR code display + 6-digit confirmation input |
| `components/auth/mfa/mfa-passkey-setup.tsx` | WebAuthn registration (triggers browser native prompt) |
| `components/auth/mfa/mfa-recovery-modal.tsx` | Modal showing 8 recovery codes with "Copiar todos" |
| `components/auth/mfa/mfa-code-input.tsx` | Shared 6-digit code input with auto-submit, used in TOTP confirm + login verify |
| `components/auth/mfa/mfa-password-confirm.tsx` | Password confirmation modal for deleting MFA methods in settings |
| `lib/api/mfa.ts` | All MFA API calls (`{ data, error }` pattern) |

## Modified Files

| File | Change |
|---|---|
| `lib/api/auth.ts` | `login()` must detect `mfa_required` response and NOT call `storeSession()` in that case. Return type becomes `{ data: AuthResponse \| MfaChallengeResponse \| null, error }` |
| `lib/contexts/auth-context.tsx` | `login()` method returns MFA challenge data when `mfa_required: true`. Add `mfa_setup_required` detection: if a 403 with "MFA setup required" is received, redirect to MFA enrollment |
| `components/auth/login-page.tsx` | Detect `mfa_required` response from `login()`, render `MfaVerify` backdrop-blur overlay |
| `components/auth/register-page.tsx` | After successful register, show `MfaEnrollment` before redirect to role selection |
| `components/auth/role-selection.tsx` | Add `BackgroundBeams` + `OnboardingNav` (visual-only change for onboarding consistency) |
| `components/auth/onboarding/rescue-center-wizard.tsx` | Add mandatory MFA enrollment as final step before admin approval |
| `components/auth/onboarding/business-wizard.tsx` | Same mandatory MFA step as RC wizard |
| `components/auth/protected-route.tsx` | Handle `mfa_setup_required` restricted tokens — if an RC/business user with no MFA logs back in, redirect to MFA enrollment instead of showing 403 errors |
| `components/dashboard/rescue-center/settings-tab.tsx` | Add "Seguridad" section with MFA method management |

## API Module: `lib/api/mfa.ts`

All functions follow the `{ data, error }` pattern. Uses `apiClient()` for authenticated calls.

### Enrollment (authenticated)
- `totpSetup()` → `POST /mfa/totp/setup` → `{ secret, qr_uri }`
- `totpConfirm(code)` → `POST /mfa/totp/confirm`
- `webauthnRegisterBegin()` → `POST /mfa/webauthn/register/begin`
- `webauthnRegisterFinish(attestation, name?)` → `POST /mfa/webauthn/register/finish`
- `emailEnable()` → `POST /mfa/email/enable`
- `regenerateRecoveryCodes()` → `POST /mfa/recovery/generate`

### Verification (uses mfa_token, not access token)

These functions use raw `fetch` with `Authorization: Bearer ${mfaToken}` — they do NOT use `apiClient()` since the mfa_token is not a regular access token and is never stored in localStorage.

- `mfaVerify(mfaToken, method, codeOrAssertion)` → `POST /mfa/verify` — `codeOrAssertion` is a string for TOTP/email/recovery, or a WebAuthn `PublicKeyCredential` assertion object for passkeys
- `mfaEmailSend(mfaToken)` → `POST /mfa/email/send`
- `webauthnAssertBegin(mfaToken)` → `POST /mfa/webauthn/assert/begin` — returns challenge options for `navigator.credentials.get()`, then the resolved assertion is sent to `mfaVerify()` with `method: "webauthn"`

### Management (authenticated)
- `getMethods()` → `GET /mfa/methods`
- `deleteTotp(password)` → `DELETE /mfa/totp`
- `deleteWebauthn(id, password)` → `DELETE /mfa/webauthn/:id`
- `deleteEmail(password)` → `DELETE /mfa/email`

## Handling `mfa_setup_required` restricted tokens

When an RC/business user who completed onboarding but never enrolled MFA logs back in, the backend issues a restricted access token with `mfa_setup_required: true`. This token only allows `/auth/me` and `/auth/mfa/*` — all other endpoints return 403 `"MFA setup required"`.

**Frontend handling:** `ProtectedRoute` (or `AuthContext`) detects the 403 response and redirects the user to the MFA enrollment screen. The enrollment component works the same as mandatory enrollment — no skip link, beams background, OnboardingNav.

**Page refresh during enrollment:** Since the restricted token is a valid access token stored in localStorage, a page refresh keeps the user authenticated. The `mfa_setup_required` guard catches them again and re-shows enrollment.

## Email masking

The "Código enviado a tu***@email.com" confirmation masks the email client-side from the stored `user.email` — the backend does not return a masked email. Simple string masking: show first 2 chars + `***` + domain.

## MFA settings for non-RC roles

Currently only `settings-tab.tsx` in the RC dashboard is modified. Business users will need equivalent MFA management when their dashboard is built. Members/adopters who opt into MFA can manage it from a future account settings page. For this phase, MFA management is scoped to the RC dashboard settings only — the enrollment flow works for all roles, but ongoing management UI is RC-only.

## i18n

New keys in the `auth` namespace. All UI text in Spanish first, English second.

Key groups:
- `mfa.enrollment.*` — enrollment screen titles, method names, descriptions
- `mfa.verify.*` — verification screen, error messages, expiry message
- `mfa.settings.*` — settings card, method management, recovery codes
- `mfa.recovery.*` — recovery codes modal

## Decisions Made

- MFA screens are component states within existing pages — no new routes
- `mfa_token` stored in React state only, never persisted
- Post-registration enrollment uses welcoming style with `BackgroundBeams` + `OnboardingNav`
- Login verification uses `backdrop-blur` overlay on top of login page
- Passkeys labeled "Recomendado" in enrollment
- Skip link is subtle text ("Omitir por ahora") for non-mandatory enrollment
- Role selection page updated with `BackgroundBeams` + `OnboardingNav` for consistency
- MFA management lives in existing Settings tab "Seguridad" section
- Trash icon muted when only 1 method enrolled (backend deletion guard enforces this too)
- Auto-submit on 6-digit completion for TOTP/email OTP
- Email OTP sends automatically when user switches to that method
