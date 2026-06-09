# Admin "Report an Issue" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a floating "report an issue" button to the admin dashboard that opens a modal for filing a labelled GitHub issue against the backend or frontend repo via `POST /api/v1/admin/issues`.

**Architecture:** A new `createIssue()` function in `lib/api/admin.ts` (returns `{ data, error, status }` so the UI can branch on `403`). A self-contained `ReportIssueButton` component owns the FAB + a shadcn `Dialog` form, mounted once in `AdminDashboardShell` so it persists across all admin tabs. All user-facing strings are i18n keys (es + en) under `admin.report_issue`.

**Tech Stack:** Next.js 16 / React 19, TypeScript, TailwindCSS v4, shadcn/ui `Dialog`, Sonner toasts, react-i18next, Font Awesome, Vitest + React Testing Library.

**Spec:** `docs/superpowers/specs/2026-06-09-admin-report-issue-design.md`

---

## File Structure

- **Modify** `lib/api/admin.ts` — append `CreateIssuePayload`, `CreatedIssue`, and `createIssue()`.
- **Modify** `lib/api/__tests__/admin.test.ts` — add `createIssue` test suite.
- **Modify** `public/locales/es/pets.json` and `public/locales/en/pets.json` — add `admin.report_issue.*` strings.
- **Create** `components/dashboard/admin/report-issue-button.tsx` — FAB + Dialog form.
- **Create** `components/__tests__/admin/report-issue.test.tsx` — component tests.
- **Modify** `components/dashboard/admin/admin-dashboard-shell.tsx` — mount `<ReportIssueButton />`.

---

### Task 1: `createIssue()` API function

**Files:**
- Test: `lib/api/__tests__/admin.test.ts` (add suite)
- Modify: `lib/api/admin.ts` (append)

- [ ] **Step 1: Add the import for `createIssue` to the test file**

In `lib/api/__tests__/admin.test.ts`, update the existing import on line 2 to add `createIssue`:

```ts
import { listAllRescueCenters, approveRescueCenter, rejectRescueCenter, deleteRescueCenter, getFormTemplate, updateFormTemplate, createIssue } from '../admin'
```

- [ ] **Step 2: Write the failing tests**

Append this suite to the end of `lib/api/__tests__/admin.test.ts`:

```ts
describe('createIssue', () => {
  it('returns the created issue and status 201 on success', async () => {
    const issue = { number: 7, url: 'https://github.com/org/pelu/issues/7' }
    mockApiClient.mockResolvedValue({ ok: true, status: 201, json: () => Promise.resolve(issue) } as Response)

    const result = await createIssue({ repo: 'frontend', title: 'X', body: 'Y', labels: ['bug', 'frontend'] })

    expect(result).toEqual({ data: issue, error: null, status: 201 })
    expect(mockApiClient).toHaveBeenCalledWith('/api/v1/admin/issues', {
      method: 'POST',
      body: JSON.stringify({ repo: 'frontend', title: 'X', body: 'Y', labels: ['bug', 'frontend'] }),
    })
  })

  it('surfaces status 403 when the session is not MFA-verified', async () => {
    mockApiClient.mockResolvedValue({
      ok: false, status: 403, json: () => Promise.resolve({ error: 'mfa required' }),
    } as Response)

    const result = await createIssue({ repo: 'backend', title: 'X', body: '', labels: ['backend'] })
    expect(result).toEqual({ data: null, error: 'mfa required', status: 403 })
  })

  it('surfaces the server error and status on 400', async () => {
    mockApiClient.mockResolvedValue({
      ok: false, status: 400, json: () => Promise.resolve({ error: 'missing title' }),
    } as Response)

    const result = await createIssue({ repo: 'backend', title: '', body: '', labels: ['backend'] })
    expect(result).toEqual({ data: null, error: 'missing title', status: 400 })
  })

  it('returns status 0 on network failure', async () => {
    mockApiClient.mockRejectedValue(new Error('Network'))

    const result = await createIssue({ repo: 'frontend', title: 'X', body: '', labels: ['frontend'] })
    expect(result).toEqual({ data: null, error: null, status: 0 })
  })
})
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npx vitest run lib/api/__tests__/admin.test.ts -t createIssue`
Expected: FAIL — `createIssue is not a function` / import error.

- [ ] **Step 4: Implement `createIssue`**

Append to the end of `lib/api/admin.ts`:

```ts
// --- GitHub Issues ---

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

// Returns status = HTTP status (0 on network error) so the caller can branch on 403.
export async function createIssue(
  payload: CreateIssuePayload
): Promise<{ data: CreatedIssue | null; error: string | null; status: number }> {
  try {
    const res = await apiClient('/api/v1/admin/issues', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    if (res.status === 201) {
      const json = await res.json()
      return { data: json, error: null, status: 201 }
    }
    const json = await res.json().catch(() => ({}))
    return { data: null, error: json.error || null, status: res.status }
  } catch {
    return { data: null, error: null, status: 0 }
  }
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run lib/api/__tests__/admin.test.ts -t createIssue`
Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
git add lib/api/admin.ts lib/api/__tests__/admin.test.ts
git commit -m "feat(admin): add createIssue API client for GitHub issues"
```

---

### Task 2: i18n strings (`admin.report_issue.*`)

**Files:**
- Modify: `public/locales/es/pets.json`
- Modify: `public/locales/en/pets.json`

- [ ] **Step 1: Add the Spanish strings**

In `public/locales/es/pets.json`, inside the `"admin"` object (starts at line ~176), add a `report_issue` key. Add it right after the `"title": "Admin",` line, ensuring valid JSON (the inserted block ends with a comma since more keys follow):

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
    },
```

- [ ] **Step 2: Add the English strings**

In `public/locales/en/pets.json`, inside the `"admin"` object, add the matching `report_issue` key in the same position:

```jsonc
    "report_issue": {
      "aria_label": "Report a problem",
      "title": "Report a problem",
      "subtitle": "Create a GitHub issue for the team.",
      "field_title": "Subject",
      "field_title_placeholder": "e.g. Error loading rescue centers",
      "field_description": "Description",
      "field_description_placeholder": "Describe the problem in detail…",
      "field_repo": "Repository",
      "repo_placeholder": "Select the repository",
      "repo_backend": "Backend (API)",
      "repo_frontend": "Frontend (app)",
      "field_type": "Type",
      "type_bug": "Bug",
      "type_missing_endpoint": "Missing API endpoint",
      "type_docs": "Documentation",
      "type_chore": "Chore",
      "submit": "Send report",
      "submitting": "Sending…",
      "cancel": "Cancel",
      "success": "Report sent (#{{number}})",
      "view_on_github": "View on GitHub",
      "error": "Could not send the report.",
      "mfa_required": "This action requires two-factor authentication. Please log in again.",
      "login_again": "Log in"
    },
```

- [ ] **Step 3: Validate both files are still valid JSON**

Run: `node -e "require('./public/locales/es/pets.json'); require('./public/locales/en/pets.json'); console.log('valid')"`
Expected: prints `valid` (no JSON parse error).

- [ ] **Step 4: Commit**

```bash
git add public/locales/es/pets.json public/locales/en/pets.json
git commit -m "feat(i18n): add admin report_issue strings (es/en)"
```

---

### Task 3: `ReportIssueButton` component

**Files:**
- Test: `components/__tests__/admin/report-issue.test.tsx` (create)
- Create: `components/dashboard/admin/report-issue-button.tsx`

- [ ] **Step 1: Write the failing component test**

Create `components/__tests__/admin/report-issue.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import i18n from '@/lib/i18n'
import { ReportIssueButton } from '@/components/dashboard/admin/report-issue-button'

const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

vi.mock('@/lib/api/admin', () => ({
  createIssue: vi.fn(),
}))

import { toast } from 'sonner'
import { createIssue } from '@/lib/api/admin'
const mockCreateIssue = vi.mocked(createIssue)

function renderComp() {
  return render(
    <I18nextProvider i18n={i18n}>
      <ReportIssueButton />
    </I18nextProvider>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('ReportIssueButton', () => {
  it('opens the dialog when the FAB is clicked', () => {
    renderComp()
    expect(screen.queryByTestId('report-issue-submit')).not.toBeInTheDocument()
    fireEvent.click(screen.getByTestId('report-issue-fab'))
    expect(screen.getByTestId('report-issue-submit')).toBeInTheDocument()
  })

  it('disables submit until title and repo are set', () => {
    renderComp()
    fireEvent.click(screen.getByTestId('report-issue-fab'))
    const submit = screen.getByTestId('report-issue-submit')
    expect(submit).toBeDisabled()

    fireEvent.change(screen.getByTestId('report-issue-title'), { target: { value: 'Bug X' } })
    expect(submit).toBeDisabled() // repo still empty

    fireEvent.change(screen.getByTestId('report-issue-repo'), { target: { value: 'frontend' } })
    expect(submit).toBeEnabled()
  })

  it('submits with mapped labels and shows a success toast on 201', async () => {
    mockCreateIssue.mockResolvedValue({
      data: { number: 42, url: 'https://github.com/org/pelu/issues/42' },
      error: null,
      status: 201,
    })
    renderComp()
    fireEvent.click(screen.getByTestId('report-issue-fab'))
    fireEvent.change(screen.getByTestId('report-issue-title'), { target: { value: 'Bug X' } })
    fireEvent.change(screen.getByTestId('report-issue-repo'), { target: { value: 'frontend' } })
    fireEvent.click(screen.getByTestId('report-issue-type-bug'))
    fireEvent.click(screen.getByTestId('report-issue-submit'))

    await waitFor(() =>
      expect(mockCreateIssue).toHaveBeenCalledWith({
        repo: 'frontend',
        title: 'Bug X',
        body: '',
        labels: ['bug', 'frontend'],
      })
    )
    await waitFor(() => expect(toast.success).toHaveBeenCalled())
    await waitFor(() => expect(screen.queryByTestId('report-issue-submit')).not.toBeInTheDocument())
  })

  it('keeps the dialog open and shows an error toast on 403', async () => {
    mockCreateIssue.mockResolvedValue({ data: null, error: 'forbidden', status: 403 })
    renderComp()
    fireEvent.click(screen.getByTestId('report-issue-fab'))
    fireEvent.change(screen.getByTestId('report-issue-title'), { target: { value: 'Bug X' } })
    fireEvent.change(screen.getByTestId('report-issue-repo'), { target: { value: 'backend' } })
    fireEvent.click(screen.getByTestId('report-issue-submit'))

    await waitFor(() => expect(toast.error).toHaveBeenCalled())
    expect(screen.getByTestId('report-issue-submit')).toBeInTheDocument() // dialog stays open
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run components/__tests__/admin/report-issue.test.tsx`
Expected: FAIL — cannot resolve `@/components/dashboard/admin/report-issue-button`.

- [ ] **Step 3: Implement the component**

Create `components/dashboard/admin/report-issue-button.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faBug } from '@fortawesome/free-solid-svg-icons'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createIssue } from '@/lib/api/admin'

type Repo = '' | 'backend' | 'frontend'
type IssueType = '' | 'bug' | 'missing API endpoint' | 'docs' | 'chore'

const ISSUE_TYPES: { value: Exclude<IssueType, ''>; labelKey: string; testId: string }[] = [
  { value: 'bug', labelKey: 'admin.report_issue.type_bug', testId: 'bug' },
  { value: 'missing API endpoint', labelKey: 'admin.report_issue.type_missing_endpoint', testId: 'missing-endpoint' },
  { value: 'docs', labelKey: 'admin.report_issue.type_docs', testId: 'docs' },
  { value: 'chore', labelKey: 'admin.report_issue.type_chore', testId: 'chore' },
]

export function ReportIssueButton() {
  const { t } = useTranslation('pets')
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [repo, setRepo] = useState<Repo>('')
  const [type, setType] = useState<IssueType>('')
  const [submitting, setSubmitting] = useState(false)

  const canSubmit = title.trim() !== '' && repo !== '' && !submitting

  const reset = () => {
    setTitle('')
    setBody('')
    setRepo('')
    setType('')
  }

  const handleSubmit = async () => {
    if (!canSubmit) return
    setSubmitting(true)
    // labels = chosen type (if any) + the repo label (auto-added for triage)
    const labels = [...(type ? [type] : []), repo as 'backend' | 'frontend']
    const { data, error, status } = await createIssue({
      repo: repo as 'backend' | 'frontend',
      title: title.trim(),
      body,
      labels,
    })
    setSubmitting(false)

    if (status === 201 && data) {
      toast.success(t('admin.report_issue.success', { number: data.number }), {
        action: {
          label: t('admin.report_issue.view_on_github'),
          onClick: () => window.open(data.url, '_blank', 'noopener'),
        },
      })
      reset()
      setOpen(false)
      return
    }
    if (status === 403) {
      toast.error(t('admin.report_issue.mfa_required'), {
        action: {
          label: t('admin.report_issue.login_again'),
          onClick: () => router.push('/auth/login'),
        },
      })
      return
    }
    toast.error(error || t('admin.report_issue.error'))
  }

  return (
    <>
      <button
        type="button"
        data-testid="report-issue-fab"
        aria-label={t('admin.report_issue.aria_label')}
        onClick={() => setOpen(true)}
        className="fixed right-6 bottom-20 md:bottom-6 z-50 w-14 h-14 rounded-full bg-pop-550 text-white shadow-lg flex items-center justify-center hover:opacity-90 transition-opacity"
      >
        <FontAwesomeIcon icon={faBug} className="text-xl" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>{t('admin.report_issue.title')}</DialogTitle>
            <DialogDescription>{t('admin.report_issue.subtitle')}</DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="issue-title" className="text-sm font-medium">
                {t('admin.report_issue.field_title')}
              </label>
              <Input
                id="issue-title"
                data-testid="report-issue-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t('admin.report_issue.field_title_placeholder')}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="issue-repo" className="text-sm font-medium">
                {t('admin.report_issue.field_repo')}
              </label>
              <select
                id="issue-repo"
                data-testid="report-issue-repo"
                value={repo}
                onChange={(e) => setRepo(e.target.value as Repo)}
                className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="" disabled>
                  {t('admin.report_issue.repo_placeholder')}
                </option>
                <option value="backend">{t('admin.report_issue.repo_backend')}</option>
                <option value="frontend">{t('admin.report_issue.repo_frontend')}</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">{t('admin.report_issue.field_type')}</span>
              <div className="flex flex-wrap gap-2">
                {ISSUE_TYPES.map((it) => (
                  <button
                    key={it.value}
                    type="button"
                    data-testid={`report-issue-type-${it.testId}`}
                    onClick={() => setType((prev) => (prev === it.value ? '' : it.value))}
                    className={`rounded-xl border px-3 py-1.5 text-sm transition-colors ${
                      type === it.value
                        ? 'bg-pop-550 text-white border-pop-550'
                        : 'border-input hover:bg-muted'
                    }`}
                  >
                    {t(it.labelKey)}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="issue-body" className="text-sm font-medium">
                {t('admin.report_issue.field_description')}
              </label>
              <textarea
                id="issue-body"
                data-testid="report-issue-body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={4}
                placeholder={t('admin.report_issue.field_description_placeholder')}
                className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring resize-none"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setOpen(false)}>
              {t('admin.report_issue.cancel')}
            </Button>
            <Button
              data-testid="report-issue-submit"
              className="rounded-xl"
              onClick={handleSubmit}
              disabled={!canSubmit}
            >
              {submitting ? t('admin.report_issue.submitting') : t('admin.report_issue.submit')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run components/__tests__/admin/report-issue.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add components/dashboard/admin/report-issue-button.tsx components/__tests__/admin/report-issue.test.tsx
git commit -m "feat(admin): add ReportIssueButton FAB + report-issue dialog"
```

---

### Task 4: Mount the button in the admin dashboard shell

**Files:**
- Modify: `components/dashboard/admin/admin-dashboard-shell.tsx`

- [ ] **Step 1: Add the import**

In `components/dashboard/admin/admin-dashboard-shell.tsx`, add to the import block (after the `ChatTab` import):

```tsx
import { ReportIssueButton } from './report-issue-button'
```

- [ ] **Step 2: Render the button inside `SidebarInset`**

Add `<ReportIssueButton />` immediately before the closing `</SidebarInset>` tag (after `<AdminMobileNav ... />`):

```tsx
        <AdminMobileNav activeTab={activeTab} onTabChange={setActiveTab} />
        <ReportIssueButton />
      </SidebarInset>
```

- [ ] **Step 3: Verify the build/lint is clean**

Run: `npx tsc --noEmit && bun run lint`
Expected: no type errors, no new lint errors. (If `bun run lint` reports pre-existing warnings unrelated to these files, that's fine — just confirm nothing new in the touched files.)

- [ ] **Step 4: Manual verification**

> The dev server is assumed already running (`bun run dev`). Do not start it.

1. Log in as an admin and go to `/dashboard/admin`.
2. Confirm a circular bug-icon button appears bottom-right on every tab (rescue-centers, form-template, chat, settings).
3. On a narrow viewport, confirm it sits **above** the mobile bottom nav (not overlapping).
4. Click it → the dialog opens. Confirm Submit is disabled until a title is typed AND a repo is chosen.
5. Pick a type chip, fill the form, submit. On success, confirm the toast shows a "Ver en GitHub" / "View on GitHub" action linking to the new issue.
6. (If your session is not MFA-elevated) confirm a 403 shows the "Iniciar sesión" / "Log in" toast action.

- [ ] **Step 5: Commit**

```bash
git add components/dashboard/admin/admin-dashboard-shell.tsx
git commit -m "feat(admin): mount ReportIssueButton in admin dashboard shell"
```

---

### Task 5: Full verification

- [ ] **Step 1: Run the full test suite**

Run: `npx vitest run`
Expected: all tests pass (including the new `createIssue` and `ReportIssueButton` tests).

- [ ] **Step 2: Final typecheck + lint**

Run: `npx tsc --noEmit && bun run lint`
Expected: clean (no new errors from the touched files).

---

## Notes / deferred confirmations (from spec; not blockers)

- **Login return path:** the 403 action currently routes to `/auth/login` with no return target. If the login page supports a return param (there's a `lib/auth/post-login-redirect` mechanism), enhance the redirect to come back to `/dashboard/admin`. Confirm the param name before adding it — do not invent one the login page ignores.
- **External link in Electron:** `window.open(url, '_blank', 'noopener')` is used for the "View on GitHub" action. If the app has an established convention for opening external URLs from Electron, switch to that. Verify behaviour in the packaged app during QA.
