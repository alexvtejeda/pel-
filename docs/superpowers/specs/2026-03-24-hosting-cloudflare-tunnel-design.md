# Hosting Strategy: Cloudflare Tunnel for Demo

**Date:** 2026-03-24
**Status:** approved
**Brief:** `docs/superpowers/transcriptions/2026-03-24-hosting-strategy-friday-demo.md`

## Goal

Expose the Pelú frontend and Go backend through Cloudflare Tunnel using the owned domain `pelurd.com`, so the rescue center can test the app at a professional URL during the Friday 2026-03-28 demo.

## Architecture

Two ingress rules in one Cloudflare Tunnel:

- `pelurd.com` → `localhost:3000` (Next.js dev server)
- `api.pelurd.com` → `localhost:2701` (Go backend)

Cloudflare handles SSL termination — both domains get HTTPS automatically. Subdomains are free under the existing `pelurd.com` zone.

### Tunnel Config

```yaml
# ~/.cloudflared/config.yml
tunnel: <TUNNEL_ID>
credentials-file: ~/.cloudflared/<TUNNEL_ID>.json

ingress:
  - hostname: api.pelurd.com
    service: http://localhost:2701
  - hostname: pelurd.com
    service: http://localhost:3000
  - service: http_status:404
```

### Setup Steps

1. `cloudflared tunnel login` (one-time Cloudflare auth)
2. `cloudflared tunnel create pelu-demo` (creates tunnel + credentials)
3. `cloudflared tunnel route dns pelu-demo pelurd.com` (CNAME)
4. `cloudflared tunnel route dns pelu-demo api.pelurd.com` (CNAME)
5. `cloudflared tunnel run pelu-demo` (starts tunnel)

## Backend Changes

### Hard prerequisite: `STORE_PHOTOS_LOCALLY` refactoring

The backend refactoring below **must be completed and tested before the demo env vars will work.** Currently, photo storage and the `/uploads/*` file server route are both gated behind `TESTING_MODE`. Setting `TESTING_MODE=false` without this refactoring will cause the server to require all S3/MinIO env vars and `log.Fatalf` if they're missing.

### New env var: `STORE_PHOTOS_LOCALLY`

Decouples photo storage from `TESTING_MODE`:

- `STORE_PHOTOS_LOCALLY=true` → photos stored on local disk (`./uploads/`) and served via `/uploads/*` route
- `STORE_PHOTOS_LOCALLY=false` → photos stored in MinIO/S3 (current production path)

**Work required:**
- Add `STORE_PHOTOS_LOCALLY` to `internal/config/`
- Extract local photo storage logic currently gated behind `TESTING_MODE`, rewire to `STORE_PHOTOS_LOCALLY`
- Move the `/uploads/*` file server route gate from `cfg.TestingMode` to `cfg.StorePhotosLocally`
- **Parameterize the local storage base URL**: `NewLocalClient("./uploads", baseURL)` must use a configurable base URL (e.g., `STORAGE_LOCAL_BASE_URL`) so photo URLs resolve to `https://api.pelurd.com/uploads/...` in demo mode instead of `http://localhost:2701/uploads/...`
- Remove photo storage responsibility from `TESTING_MODE` entirely
- `TESTING_MODE` retains only OTP/TOTP bypass (`"000000"` acceptance) and seed data behavior

### Environment Variable Reference

| Variable | Local dev | Demo (Cloudflare) |
|---|---|---|
| `PORT` | `2701` | `2701` |
| `TESTING_MODE` | `true` | `false` |
| `STORE_PHOTOS_LOCALLY` | `true` | `true` |
| `STORAGE_LOCAL_BASE_URL` | `http://localhost:2701/uploads` | `https://api.pelurd.com/uploads` |
| `FRONTEND_URL` | `http://localhost:3000` | `https://pelurd.com` |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:3000` | `https://pelurd.com` |
| `COOKIE_DOMAIN` | *(empty)* | `.pelurd.com` |
| `WEBAUTHN_RPID` | `localhost` | `pelurd.com` |
| `WEBAUTHN_ORIGIN` | `http://localhost:3000` | `https://pelurd.com` |
| `GOOGLE_REDIRECT_URL` | `http://localhost:2701/api/v1/auth/google/callback` | `https://api.pelurd.com/api/v1/auth/google/callback` |
| `RESEND_API_KEY` | *(set)* | *(set — required for real MFA)* |
| `RESEND_FROM_EMAIL` | `noreply@pelurd.com` | `noreply@pelurd.com` |
| `NEXT_PUBLIC_API_URL` (frontend) | `http://localhost:2701` | `https://api.pelurd.com` |

`TESTING_MODE` and hosting are orthogonal — any combination works.

### MFA strategy for demo

With `TESTING_MODE=false`, real MFA is enforced for `rescue_center` and `business` roles. This means:
- `RESEND_API_KEY` and `RESEND_FROM_EMAIL` must be configured for email OTP delivery
- The RC user will need to complete MFA enrollment during demo (TOTP app, email OTP, or passkey)
- Alternatively, set `TESTING_MODE=true` during demo to bypass MFA — this only affects OTP validation, not photo storage (after the refactoring)

## Frontend Changes

Update `.env.local`:
```env
NEXT_PUBLIC_API_URL=https://api.pelurd.com
```

Restart the dev server after changing — `NEXT_PUBLIC_*` vars are read at startup. No code changes needed.

WebSocket URL derives from `NEXT_PUBLIC_API_URL` automatically → resolves to `wss://api.pelurd.com/api/v1/ws` (Cloudflare upgrades ws to wss).

## Demo Day Checklist (2026-03-28)

### Before
1. **Backend refactoring**: `STORE_PHOTOS_LOCALLY` must be implemented and tested
2. **Google Cloud Console**: add `https://api.pelurd.com/api/v1/auth/google/callback` as an authorized redirect URI in OAuth credentials
3. **Cloudflare**: add a redirect rule from `www.pelurd.com` → `pelurd.com` (or note: don't share the `www` URL)
4. Backend: update `.env` with demo values, restart server
5. Frontend: update `.env.local` with `NEXT_PUBLIC_API_URL=https://api.pelurd.com`, restart dev server
6. Start tunnel: `cloudflared tunnel run pelu-demo`
7. Verify: open `https://pelurd.com` and `https://api.pelurd.com` in browser
8. Test: register a user, upload a photo, verify photo loads from public URL

### During
- Tunnel running in a terminal
- Both servers running locally (`bun run dev` + `air` / `go run ./cmd/server`)

### After
- `Ctrl+C` the tunnel — site goes offline immediately
- Revert `.env` files to localhost values if desired

## Post-demo: Update backend README.md

After implementing the `STORE_PHOTOS_LOCALLY` change, update the backend README.md with the env var reference table so the local-vs-demo configuration is documented.
