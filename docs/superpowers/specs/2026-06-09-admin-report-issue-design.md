# Admin "Report an Issue" — Design Spec

**Date:** 2026-06-09
**Status:** Approved
**Scope:** Frontend only (this repo). No backend changes — consumes the existing `POST /api/v1/admin/issues` endpoint in pelu-api.

## Goal

Give admins a fast, always-available way to file a GitHub issue against either project repository (backend `pelu-api` or frontend `pelu`) directly from the admin dashboard, via a floating button that opens a small form modal.

## Backend contract (existing — do not modify)

`POST /api/v1/admin/issues` — creates a labelled GitHub issue in one of two server-configured repos using a server-side token (the GitHub credential is never exposed to the browser). Admin-only; requires a strong-MFA-verified session (`RequireAuth` + `RequireAdminWithMFA`).

**Request body:**

| Field | Type | Required | Notes |
|---|---|---|---|
| `repo` | string | ✅ | `"backend"` or `"frontend"`. Missing/unknown → 400. |
| `title` | string | ✅ | Missing → 400. |
| `body` | string | — | Issue description. |
| `labels` | string[] | — | Must come from the curated allow-list `{bug, missing API endpoint, backend, frontend, docs, chore}`. Unknown curated labels → 400. |
| `extra_labels` | string[] | — | Free-form, forwarded as-is. **Not used by this feature.** |

**Responses:**

- `201` → `{ number: integer, url: string }`
- `400` → `{ error }` (missing title, missing/unknown repo, unknown label, bad JSON)
- `401` → `{ error }` (unauthorized — handled by `apiClient` refresh-retry)
- `403` → `{ error }` (not admin / session not MFA-verified)
- `502` → `{ error }` (GitHub token/repo slug unset, or GitHub rejected the request)

### MFA constraint (important)

The endpoint relies on the session being **MFA-verified at login**. There is **no mid-session step-up endpoint**: `/auth/mfa/challenge` and `/auth/mfa/verify` both authenticate with the temporary `mfa_token` challenge cookie that only exists *during* the login flow, not with a live access token. The frontend therefore **cannot re-elevate** an authenticated session with a fresh TOTP code. A `403` means the admin's current session is not MFA-elevated; the only remedy is logging in again with MFA.

## Decisions

1. **403 handling:** assume-verified. Submit directly; on `403`, keep the modal open and show an error toast with a "Log in again" action that routes to `/auth/login`. (No backend step-up flow.)
2. **Repo picker:** dropdown `<select>`, **no default** — a placeholder option forces a deliberate choice.
3. **Labels:** a single issue-**type** picker (Bug / Missing API endpoint / Docs / Chore) mapped to curated labels. **Auto-add the selected repo as a label** (`backend`/`frontend`) for triage. No free-form `extra_labels`.
4. **Modal:** shadcn `Dialog` (`components/ui/dialog.tsx`).
5. **Success:** Sonner toast with a **clickable link** ("Ver en GitHub") to the created issue's `url`.
6. **Floating button:** admin dashboard only, all tabs, desktop + mobile, bottom-right, `rounded-full` circle FAB, positioned **above** the mobile bottom nav. Icon: `faBug`.
7. **i18n:** every user-facing string — labels, placeholders, buttons, **and all toast/error messages** — is an i18n key with both `es` (primary) and `en` entries. No hardcoded text.

## Architecture & data flow

```
[ReportIssueButton FAB]  (mounted in AdminDashboardShell, persists across tabs)
        │ click
        ▼
[shadcn Dialog: report-issue form]
   title* | description | repo* (select) | type (picker)
        │ submit (disabled until title && repo)
        ▼
createIssue({ repo, title, body, labels })   // lib/api/admin.ts
        │  POST /api/v1/admin/issues  (apiClient, credentials: include)
        ▼
   { data, error, status }
   ├─ 201 → close + reset + success toast w/ link to data.url
   ├─ 403 → keep open + error toast w/ "Log in again" → /auth/login
   ├─ 400 → error toast with server error message
   └─ 502/network → generic error toast
```

## Components & files

### New: `lib/api/admin.ts` → `createIssue()`

Follows the existing admin API pattern but returns an extra `status` field so the caller can branch on `403`. This is the only deviation from the bare `{ data, error }` convention and is intentional.

```ts
export interface CreateIssuePayload {
  repo: 'backend' | 'frontend'
  title: string
  body: string
  labels: string[]
}

export interface CreatedIssue {
  number: number
  url: string
}

// Returns status = HTTP status code (0 on network error) so callers can detect 403.
export async function createIssue(
  payload: CreateIssuePayload
): Promise<{ data: CreatedIssue | null; error: string | null; status: number }>
```

Behavior:
- `POST /api/v1/admin/issues` via `apiClient`, `body: JSON.stringify(payload)`.
- `201` → `{ data: json, error: null, status: 201 }`.
- non-2xx → `{ data: null, error: json.error || <fallback>, status: res.status }`.
- thrown/network → `{ data: null, error: <connection error key resolved by caller>, status: 0 }`.

The API module returns the raw server `error` string; the **component** decides which i18n key to show (so the module stays UI-agnostic, consistent with the rest of `lib/api/`).

### New: `components/dashboard/admin/report-issue-button.tsx`

Single component that owns `open` state and renders both the FAB and the `<Dialog>`.

- **FAB:** `<button>` with `className` ~ `fixed right-6 bottom-20 md:bottom-6 z-50 w-14 h-14 rounded-full bg-pop-550 text-white shadow-lg flex items-center justify-center hover:opacity-90 transition-opacity`. Contains `<FontAwesomeIcon icon={faBug} className="text-xl" />`. `aria-label` from i18n.
- **Dialog form state** (`useState`): `title`, `body`, `repo` (`'' | 'backend' | 'frontend'`), `type` (`'' | 'bug' | 'missing API endpoint' | 'docs' | 'chore'`), `submitting`.
- **Label assembly on submit:** `labels = [...(type ? [type] : []), repo]` — i.e. the chosen type (if any) plus the repo label, both from the curated allow-list.
- **Submit guard:** disabled unless `title.trim()` non-empty AND `repo !== ''`.
- **On submit:** set `submitting`, call `createIssue`, then branch:
  - `status === 201 && data` → `toast.success(<success message>, { action: { label: t('admin.report_issue.view_on_github'), onClick: () => openExternal(data.url) } })`, reset form, close dialog.
  - `status === 403` → `toast.error(t('admin.report_issue.mfa_required'), { action: { label: t('admin.report_issue.login_again'), onClick: () => router.push('/auth/login') } })`, keep dialog open.
  - `status === 400` → `toast.error(error || t('admin.report_issue.error'))`.
  - else → `toast.error(t('admin.report_issue.error'))`.
  - finally → clear `submitting`.
- **External link:** open `data.url` in the system browser. In Electron, plain anchors/`window.open` to external URLs should route out of the app — use the existing app convention for external links (verify during planning); fall back to `window.open(url, '_blank', 'noopener')`.
- **Login redirect:** `router.push('/auth/login')`. If the login page supports a return path (there is a post-login-redirect mechanism — `components/__tests__/auth/post-login-redirect.test.ts`), pass a return target of `/dashboard/admin`; confirm the param name during planning. Do not invent a param that the login page ignores.

Form controls use existing primitives: `Input` (`components/ui/input.tsx`) for title, native `<textarea>` (styled like `add-event-modal.tsx`) for body, and native `<select>` for repo. For **type**, a single-select segmented chip group (4 `rounded-xl` toggle buttons: Bug / Missing API endpoint / Docs / Chore) — keeps it visually distinct from the repo dropdown and makes the optional nature clear (none selected = no type label). Geometry: dialog content/cards `rounded-2xl`, inputs/buttons `rounded-xl`. Icons via Font Awesome only.

### Changed: `components/dashboard/admin/admin-dashboard-shell.tsx`

Mount `<ReportIssueButton />` once as a sibling of the tab content (inside the shell, outside the per-tab panels) so it persists across all admin tabs. No other shell changes.

### i18n: `public/locales/{es,en}/pets.json` under `admin.report_issue`

Add a `report_issue` block under the existing `admin` key. Keys (es primary, en mirror):

```jsonc
"report_issue": {
  "aria_label": "Reportar un problema",
  "title": "Reportar un problema",
  "subtitle": "Crea un issue en GitHub para el equipo.",
  "field_title": "Asunto",
  "field_title_placeholder": "ej. Error al cargar centros de rescate",
  "field_description": "Descripción",
  "field_description_placeholder": "Describe el problema con detalle…",
  "field_repo": "Repositorio",
  "repo_placeholder": "Selecciona el repositorio",
  "repo_backend": "Backend (API)",
  "repo_frontend": "Frontend (app)",
  "field_type": "Tipo",
  "type_bug": "Error (bug)",
  "type_missing_endpoint": "Falta endpoint de API",
  "type_docs": "Documentación",
  "type_chore": "Tarea (chore)",
  "submit": "Enviar reporte",
  "submitting": "Enviando…",
  "cancel": "Cancelar",
  "success": "Reporte enviado (#{{number}})",
  "view_on_github": "Ver en GitHub",
  "error": "No se pudo enviar el reporte.",
  "mfa_required": "Esta acción requiere verificación en dos pasos. Inicia sesión de nuevo.",
  "login_again": "Iniciar sesión"
}
```

`type_*` labels are display strings; the underlying value sent to the API is the curated label (`bug`, `missing API endpoint`, `docs`, `chore`). The `success` key uses an i18n interpolation for the issue number.

## Testing

- **`lib/api/__tests__/admin.test.ts`** — add `createIssue` cases mirroring existing admin tests:
  - 201 returns `{ data: { number, url }, status: 201 }`.
  - Request payload includes `repo`, mapped `labels` (type + auto-added repo label), `title`, `body`.
  - 403 → `{ data: null, status: 403 }`.
  - 400 → surfaces server `error` and `status: 400`.
  - network throw → `{ data: null, status: 0 }`.
- **`components/__tests__/admin/report-issue.test.tsx`** (via `renderWithProviders`):
  - FAB opens the dialog.
  - Submit disabled until title non-empty AND repo selected.
  - Success path: closes dialog, fires success toast (mock `createIssue` → 201).
  - 403 path: dialog stays open, shows the login action (mock `createIssue` → 403).
  - Labels assembled correctly (mock asserts payload).

## Out of scope

- Backend mid-session MFA step-up endpoint (would be a separate pelu-api spec).
- Listing/viewing/editing existing issues — create-only.
- Free-form `extra_labels`.
- Attachments/screenshots.

## Open items to confirm during planning (not blockers)

1. Exact return-path param the `/auth/login` page honors (for the 403 "Log in again" redirect back to the admin dashboard).
2. The app's existing convention for opening external URLs from within Electron (for the "Ver en GitHub" link).
