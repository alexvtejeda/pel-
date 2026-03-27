# Passkeys — Debug & Fix

**Date:** 2026-03-27
**Brief:** [2026-03-27-passkeys-support.md](../transcriptions/2026-03-27-passkeys-support.md)
**Domain:** fullstack
**Priority:** Nice-to-have (not needed for 2026-03-28 demo)

## Current State

The frontend passkey implementation is **already complete**:

- **Registration**: `MfaPasskeySetup` component → `webauthnRegisterBegin()` → `navigator.credentials.create()` → `webauthnRegisterFinish()`
- **Verification**: `MfaVerify` component → `webauthnAssertBegin()` → `navigator.credentials.get()` → `mfaVerify()`
- **Management**: Settings tabs in both RC and Business dashboards list passkeys, allow deletion via `deleteWebauthn()`
- **API functions**: All defined in `lib/api/mfa.ts` with test coverage
- **Types**: `MfaMethod`, `MfaMethodInfo` in `lib/types/user.ts`

The problem is that passkey **generation fails at runtime**. Since the frontend code and API client are in place, the issue is likely one of:

1. **Backend endpoints not implemented or returning errors** — the `/api/v1/auth/mfa/webauthn/register/begin` or `/register/finish` endpoints may not be fully working
2. **WebAuthn RP ID mismatch** — the relying party ID returned by the backend may not match the current domain (especially when testing via Cloudflare Tunnel with a custom domain)
3. **HTTPS requirement** — WebAuthn requires a secure context. If testing over HTTP (localhost without tunnel), `navigator.credentials.create()` will fail silently

## Solution

### 1. Debug the Registration Flow

Test passkey registration on mobile Safari via the Cloudflare Tunnel (HTTPS domain). Capture the exact error:
- Check browser console for WebAuthn errors
- Check network tab for the `/register/begin` response — does it return valid challenge options?
- Check if `navigator.credentials.create()` throws or returns null

### 2. Fix Based on Findings

Most likely fixes (in order of probability):

- **Backend RP ID**: Ensure the backend returns `rp.id` matching the domain being used (e.g., `pelurd.com` when accessed via tunnel). This is a backend config change.
- **Attestation format**: Ensure the backend accepts the attestation format returned by the device (e.g., `packed`, `none`). Mobile Safari may use a different format than desktop.
- **Origin validation**: Ensure the backend validates the origin correctly for the tunnel domain.

### 3. Frontend — No Changes Expected

The frontend code follows the standard WebAuthn flow correctly. If any frontend fix is needed, it would be error handling improvements (showing the user a clear message when passkey creation fails instead of failing silently).

## Files Involved

| File | Role |
|------|------|
| `lib/api/mfa.ts` | API client functions (already implemented) |
| `components/auth/mfa/mfa-passkey-setup.tsx` | Registration UI (already implemented) |
| `components/auth/mfa/mfa-verify.tsx` | Verification UI (already implemented) |
| Backend: `/api/v1/auth/mfa/webauthn/*` | Likely where the fix is needed |

## Out of Scope

- Adding new passkey UI components (already exist)
- Changing the MFA enrollment flow
- TOTP or email MFA (working correctly)
