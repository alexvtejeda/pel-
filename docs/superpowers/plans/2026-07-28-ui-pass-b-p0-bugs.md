# UI Improvement Pass — Plan B: P0 Bug Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate every trap state and every silent failure the audit found on `/adopt`, `/chat`, `/mis-mascotas` and `/auth/mfa/enrollment` — the bugs where a user is stranded on a spinner, told they have no data when the request actually failed, or bounced to another page with no explanation.

**Architecture:** Every fix follows one pattern: keep the `{ data, error }` contract, branch **three ways** (loading / error / content-or-empty), and render `<ErrorState>` with a retry that re-invokes the existing fetch callback. No new API modules, no backend changes.

**Tech Stack:** Next.js 16 (App Router) · React 19 · Tailwind CSS v4.2 · react-i18next · Vitest + React Testing Library (`npx vitest run`) · Bun.

**Spec:** `docs/superpowers/specs/2026-07-28-ui-improvement-pass-design.md` §7 P0, §8 P0, §9 P0, §11 P0.

**Depends on:** Plan A (`docs/superpowers/plans/2026-07-28-ui-pass-a-foundations.md`) must be merged first. This plan uses `<ErrorState>`, `<PeluLoadingLogo>`, `<Spinner>`, `focus-ring`, `bg-pop-solid` and `formatAge` from it.

---

## Before you start

- Assume `bun run dev` is **already running** on port 3000. Do not start it.
- Local API is on port **2701**. To reproduce failure states, stop it with `docker compose stop` inside `pelu/api/` and restart with `docker compose up` — or use DevTools → Network → Offline.
- Run tests with `npx vitest run`.
- Branch: `git checkout -b fix/ui-pass-p0-bugs` before Task 1.
- **Do not clean up the PRUEBA adoption submission in production.** It is fixture data.

## Two spec corrections found while grounding this plan

1. **§7 "No `.catch` on the load `Promise.all` → infinite spinner"** is not quite the real failure. `getPublicPet` and `getPetForm` (`lib/api/pets-public.ts:39-70`) both wrap their fetch in `try/catch` and return `{ data: null, error: 'Error de conexión' }` — they never reject. So the actual bug is at `components/adopt/adopt-pet-page.tsx:37-40`: `if (!petRes.data || !formRes.data) router.replace('/pets')` treats a **network outage exactly like a 404**, silently bouncing the user to `/pets` with no explanation. The fix is to branch on `error` before deciding to redirect. A `.catch` is still added as a guard against an unexpected throw.

2. **§9 P0 "Age formatting"** was implemented in Plan A Task 1 (`formatAge` + `UserPetCard` wiring + updated tests). It is **not** repeated here. Verify it still passes during final verification.

## File Structure

**Created:**

| Path | Responsibility |
| --- | --- |
| `components/__tests__/adopt/adopt-pet-page.test.tsx` | Load-failure, redirect-on-404, and partial-submit behavior. |
| `components/__tests__/chat/chat-conversation-list.test.tsx` | Error vs empty branching for the sidebar. |
| `app/auth/mfa/enrollment/layout.tsx` | Wraps the MFA enrollment route in `ProtectedRoute`. |

**Modified:**

| Path | Change |
| --- | --- |
| `components/adopt/adopt-pet-page.tsx` | Banner height, load-error branch + retry, success/error exclusivity |
| `components/forms/form-renderer.tsx` | `submitWarning` prop, `faPaw` instead of the emoji, `TransitionLink` CTA |
| `components/chat/chat-conversation-list.tsx` | Error branch + retry, empty-state guidance |
| `components/chat/chat-message-thread.tsx` | Error branch + retry |
| `components/chat/chat-page.tsx` | `chat.select_conversation` instead of reusing `chat.empty` |
| `app/mis-mascotas/page.tsx` | Error branch + retry |
| `components/auth/mfa/mfa-totp-setup.tsx` | Error step instead of a permanent spinner |
| `components/auth/mfa/mfa-enrollment.tsx` | Email-OTP pending + error feedback |
| `public/locales/{es,en}/{pets,auth,business}.json` | New keys (ES first) |

---

## Task 1: `/adopt` — the banner is cropped (spec §7 P0)

**Root cause:** `components/adopt/adopt-pet-page.tsx:91` sets `max-h-40` — a *maximum*, not a definite height. `h-full` on the `<img>` therefore resolves against an indefinite containing block and computes to `auto`, so the image lays out at its intrinsic aspect ratio and `overflow-hidden` clips whatever exceeds 160px. A 4:1 rescue-center banner loses most of its height.

**Fix:** give the parent a definite `h-40`, keep `object-contain` on the image, and put a neutral backdrop behind it so a wide banner letterboxes gracefully at any viewport.

**Files:**
- Modify: `components/adopt/adopt-pet-page.tsx:91-99`

- [ ] **Step 1: Reproduce the bug**

Open http://localhost:3000/adopt?id=<a real pet id from /pets> at 1440px, then at 375px. The rescue-center banner is visibly cut off at both widths. Screenshot it for comparison.

- [ ] **Step 2: Apply the fix**

Replace lines 91–99 of `components/adopt/adopt-pet-page.tsx`:

```tsx
      {/*
        h-40 must be a DEFINITE height, not max-h-40: with a max-height the
        child's h-full resolves to auto, the image lays out at its intrinsic
        ratio, and overflow-hidden crops it. bg-muted letterboxes wide banners.
      */}
      <div className="sticky top-0 z-10 w-full h-40 overflow-hidden bg-muted">
        {rc.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={rc.logo_url} alt={rc.name} className="w-full h-full object-contain" />
        ) : (
          <div className="w-full h-full bg-linear-to-r from-pop-500 to-pop-550 flex items-center justify-center">
            <span className="text-foreground text-2xl font-bold">{rc.name}</span>
          </div>
        )}
      </div>
```

- [ ] **Step 3: Verify at both breakpoints**

Reload http://localhost:3000/adopt?id=<same pet id>.
Expected at 1440px **and** 375px: the banner is fully visible, letterboxed on a muted backdrop, never cropped. Compare against the Step 1 screenshots.

Also check a pet whose rescue center has **no** logo — the gradient branch must fill the same 160px band with the centre name legible.

- [ ] **Step 4: Commit**

```bash
git add components/adopt/adopt-pet-page.tsx
git commit -m "fix(adopt): stop cropping the rescue-center banner

max-h-40 gave the container an indefinite height, so h-full on the image
resolved to auto and overflow-hidden clipped it. A definite h-40 plus a
muted backdrop letterboxes wide banners at every viewport."
```

---

## Task 2: `/adopt` — a failed load silently bounces you to `/pets` (spec §7 P0)

**Root cause:** `components/adopt/adopt-pet-page.tsx:37-40` redirects whenever either response has no `data`. Because `lib/api/pets-public.ts` converts network failures into `{ data: null, error: 'Error de conexión' }`, an outage is indistinguishable from a genuine 404 and the user is thrown back to `/pets` with no message.

**Files:**
- Modify: `components/adopt/adopt-pet-page.tsx:25-46,76-82`
- Create: `components/__tests__/adopt/adopt-pet-page.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `components/__tests__/adopt/adopt-pet-page.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../test-utils'

vi.mock('@/lib/api/pets-public', () => ({
  getPublicPet: vi.fn(),
  getPetForm: vi.fn(),
}))
vi.mock('@/lib/api/submissions', () => ({
  submitAdoptionForm: vi.fn(),
  uploadSubmissionFile: vi.fn(),
}))

const mockReplace = vi.fn()
vi.mock('@/lib/contexts/auth-context', () => ({
  useAuth: () => ({ user: { id: 'u1', email: 'a@b.com', role: 'member' }, loading: false }),
}))

import { AdoptPetPage } from '@/components/adopt/adopt-pet-page'
import { getPublicPet, getPetForm } from '@/lib/api/pets-public'

const mockGetPet = vi.mocked(getPublicPet)
const mockGetForm = vi.mocked(getPetForm)

const PET = { id: 'p1', name: 'Luna', age: 24, photos: [], conditions: [] } as never
const FORM = {
  form: { id: 'f1', name: 'Solicitud', fields: [] },
  rc: { id: 'rc1', name: 'Rescate RD', logo_url: null, city: 'Santo Domingo' },
  advisory: false,
} as never

beforeEach(() => {
  vi.clearAllMocks()
  mockReplace.mockClear()
})

describe('AdoptPetPage load states', () => {
  it('shows an error with retry when the request fails', async () => {
    mockGetPet.mockResolvedValue({ data: null, error: 'Error de conexión' })
    mockGetForm.mockResolvedValue({ data: null, error: 'Error de conexión' })

    renderWithProviders(<AdoptPetPage petId="p1" />)

    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
  })

  it('retries the fetch when retry is pressed', async () => {
    mockGetPet.mockResolvedValue({ data: null, error: 'Error de conexión' })
    mockGetForm.mockResolvedValue({ data: null, error: 'Error de conexión' })

    renderWithProviders(<AdoptPetPage petId="p1" />)
    await screen.findByRole('button', { name: 'Reintentar' })

    mockGetPet.mockResolvedValue({ data: PET, error: null })
    mockGetForm.mockResolvedValue({ data: FORM, error: null })
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))

    expect(await screen.findByText('Luna')).toBeInTheDocument()
  })

  it('renders the form when both requests succeed', async () => {
    mockGetPet.mockResolvedValue({ data: PET, error: null })
    mockGetForm.mockResolvedValue({ data: FORM, error: null })

    renderWithProviders(<AdoptPetPage petId="p1" />)

    expect(await screen.findByText('Solicitud')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run components/__tests__/adopt/adopt-pet-page.test.tsx`
Expected: FAIL — the first two tests time out looking for `role="alert"`, because the component redirects instead of rendering an error.

- [ ] **Step 3: Rewrite the load effect**

In `components/adopt/adopt-pet-page.tsx`, update the imports:

```tsx
import { useCallback, useEffect, useState } from 'react'
import { ErrorState } from '@/components/ui/error-state'
import { PeluLoadingLogo } from '@/components/ui/pelu-loading-logo'
```

Add the new state next to the existing ones (line 23 area):

```tsx
  const [loadFailed, setLoadFailed] = useState(false)
```

Replace the whole `useEffect` block at lines 25–46 with a `useCallback` loader plus an effect:

```tsx
  const load = useCallback(() => {
    setLoading(true)
    setLoadFailed(false)

    Promise.all([getPublicPet(petId), getPetForm(petId)])
      .then(([petRes, formRes]) => {
        // A network/server failure and a genuine 404 both arrive as data: null.
        // Only the 404 (error: null) means "this pet does not exist" — the other
        // must not silently bounce the user back to /pets.
        if (petRes.error || formRes.error) {
          setLoadFailed(true)
          setLoading(false)
          return
        }
        if (!petRes.data || !formRes.data) {
          router.replace('/pets')
          return
        }
        setPet(petRes.data)
        setFormData(formRes.data)
        setLoading(false)
      })
      .catch(() => {
        // Belt and braces: pets-public never rejects today, but a future change
        // must not be able to strand the user on a spinner.
        setLoadFailed(true)
        setLoading(false)
      })
  }, [petId, router])

  useEffect(() => {
    if (authLoading) return

    if (!petId) {
      router.replace('/pets')
      return
    }

    if (!user) { router.replace('/auth/login'); return }

    load()
  }, [petId, router, user, authLoading, load])
```

- [ ] **Step 4: Add the error and loading branches**

Replace lines 76–84 (the `if (loading)` block and the `if (!pet || !formData) return null`) with:

```tsx
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <PeluLoadingLogo />
      </div>
    )
  }

  if (loadFailed) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <ErrorState message={t('adopt.load_error')} onRetry={load} />
      </div>
    )
  }

  if (!pet || !formData) return null
```

- [ ] **Step 5: Add the translation key (Spanish first)**

`public/locales/es/pets.json` — inside the existing `"adopt"` object:

```json
    "load_error": "No pudimos cargar esta solicitud. Revisa tu conexión e inténtalo de nuevo.",
```

`public/locales/en/pets.json`:

```json
    "load_error": "We couldn't load this application. Check your connection and try again.",
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npx vitest run components/__tests__/adopt/adopt-pet-page.test.tsx`
Expected: PASS — 3 tests.

- [ ] **Step 7: Verify against the real failure**

Set DevTools → Network → Offline, then load http://localhost:3000/adopt?id=<real pet id>.
Expected: the assembling paw, then an error card with a **Reintentar** button. Go back online, press Reintentar — the form loads.

Then check a genuine 404: http://localhost:3000/adopt?id=00000000-0000-0000-0000-000000000000 while **online**.
Expected: still redirects to `/pets` (correct behavior for a pet that does not exist).

- [ ] **Step 8: Commit**

```bash
git add components/adopt/adopt-pet-page.tsx components/__tests__/adopt/adopt-pet-page.test.tsx \
  public/locales/es/pets.json public/locales/en/pets.json
git commit -m "fix(adopt): distinguish a failed load from a missing pet

A network outage returns data: null just like a 404, so an outage silently
bounced the user to /pets. The loader now branches on error first and shows
an error state with retry; a real 404 still redirects."
```

---

## Task 3: `/adopt` — success and error render at the same time (spec §7 P0)

**Root cause:** `handleSubmit` (`components/adopt/adopt-pet-page.tsx:63-73`) calls `setError(fileErr)` when a file upload fails, but it does **not** re-throw. `FormRenderer` therefore sets `submitted = true` and shows the success screen, while the page-level error banner at `:133-137` is still mounted above it. The user sees "¡Solicitud enviada!" and a red error at once, with no idea which is true.

**The truth is: the submission succeeded, only the attachment failed.** So the outcome should be success plus a distinct, actionable warning — not a contradiction.

**Files:**
- Modify: `components/adopt/adopt-pet-page.tsx:48-74,133-137`
- Modify: `components/forms/form-renderer.tsx:19,65-81`
- Modify: `components/__tests__/adopt/adopt-pet-page.test.tsx`
- Modify: `public/locales/{es,en}/pets.json`

- [ ] **Step 1: Write the failing test**

Append to `components/__tests__/adopt/adopt-pet-page.test.tsx`:

```tsx
import { submitAdoptionForm, uploadSubmissionFile } from '@/lib/api/submissions'

const mockSubmit = vi.mocked(submitAdoptionForm)
const mockUpload = vi.mocked(uploadSubmissionFile)

const FORM_WITH_FILE = {
  form: {
    id: 'f1',
    name: 'Solicitud',
    fields: [
      { id: 'q1', type: 'file_upload', label: 'Cédula', required: false, options: [], section: '' },
    ],
  },
  rc: { id: 'rc1', name: 'Rescate RD', logo_url: null, city: 'Santo Domingo' },
  advisory: false,
} as never

describe('AdoptPetPage submit outcomes', () => {
  it('shows success with a file warning when only the upload fails', async () => {
    mockGetPet.mockResolvedValue({ data: PET, error: null })
    mockGetForm.mockResolvedValue({ data: FORM_WITH_FILE, error: null })
    mockSubmit.mockResolvedValue({ data: { submission_id: 's1' }, error: null } as never)
    mockUpload.mockResolvedValue({ data: null, error: 'boom' } as never)

    renderWithProviders(<AdoptPetPage petId="p1" />)
    fireEvent.click(await screen.findByRole('button', { name: /Enviar solicitud/ }))

    expect(await screen.findByText('¡Solicitud enviada!')).toBeInTheDocument()
    expect(
      screen.getByText(/no se pudo subir/i)
    ).toBeInTheDocument()
    // The page-level error banner must NOT also be showing.
    expect(screen.queryByText('No pudimos cargar esta solicitud. Revisa tu conexión e inténtalo de nuevo.')).not.toBeInTheDocument()
  })

  it('shows no warning when everything succeeds', async () => {
    mockGetPet.mockResolvedValue({ data: PET, error: null })
    mockGetForm.mockResolvedValue({ data: FORM_WITH_FILE, error: null })
    mockSubmit.mockResolvedValue({ data: { submission_id: 's1' }, error: null } as never)
    mockUpload.mockResolvedValue({ data: { ok: true }, error: null } as never)

    renderWithProviders(<AdoptPetPage petId="p1" />)
    fireEvent.click(await screen.findByRole('button', { name: /Enviar solicitud/ }))

    expect(await screen.findByText('¡Solicitud enviada!')).toBeInTheDocument()
    expect(screen.queryByText(/no se pudo subir/i)).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run components/__tests__/adopt/adopt-pet-page.test.tsx`
Expected: FAIL — the warning text does not exist yet.

- [ ] **Step 3: Add the translation keys (Spanish first)**

`public/locales/es/pets.json` — inside `"forms"`:

```json
    "success_file_warning": "Tu solicitud se envió, pero el archivo adjunto no se pudo subir. El centro puede pedírtelo por chat.",
```

`public/locales/en/pets.json`:

```json
    "success_file_warning": "Your application was sent, but the attachment couldn't be uploaded. The centre may ask you for it over chat.",
```

- [ ] **Step 4: Give FormRenderer a warning slot**

In `components/forms/form-renderer.tsx`, extend the props (line 12–17):

```tsx
interface FormRendererProps {
  form: Form
  rc: { name: string; logo_url: string | null }
  preview?: boolean
  onSubmit?: (answers: Answers, files: FileMap) => Promise<void>
  /**
   * Shown on the success screen when the submission itself succeeded but a
   * secondary step (e.g. a file upload) did not. Distinct from submitError,
   * which means the submission failed and there is no success to show.
   */
  submitWarning?: string | null
}
```

```tsx
export function FormRenderer({ form, rc: _rc, preview = false, onSubmit, submitWarning }: FormRendererProps) {
```

Then replace the success block (lines 65–81) — this also swaps the 🐾 emoji for `faPaw` and the raw `<a>` for `TransitionLink`, both house rules:

```tsx
  if (submitted) {
    return (
      <div className="text-center py-12 space-y-4">
        <FontAwesomeIcon icon={faPaw} className="text-4xl text-pop-550" />
        <h2 className="text-xl font-bold">{t('forms.success_title')}</h2>
        <p className="text-muted-foreground text-sm">
          {t('forms.success_description')}
        </p>
        <div className="p-4 bg-muted rounded-2xl text-sm text-muted-foreground">
          {t('submission.pending', { ns: 'pets' })}: <span className="font-medium text-foreground">{t('forms.success_status')}</span>
        </div>
        {submitWarning && (
          <div role="alert" className="p-4 bg-warning-bg border border-warning/40 rounded-2xl text-sm text-warning-foreground text-left">
            {submitWarning}
          </div>
        )}
        <TransitionLink
          href="/pets"
          className="focus-ring inline-block px-6 py-2.5 bg-pop-solid text-white rounded-xl text-sm font-medium transition-[opacity,transform] hover:opacity-90 active:scale-[0.98]"
        >
          {t('forms.back_to_pets')}
        </TransitionLink>
      </div>
    )
  }
```

Update the imports at the top of the file:

```tsx
import { faArrowUpFromBracket, faPaw } from '@fortawesome/free-solid-svg-icons'
import { TransitionLink } from '@/components/transitions/transition-link'
```

- [ ] **Step 5: Make the page's two outcomes mutually exclusive**

In `components/adopt/adopt-pet-page.tsx`, rename the submit-side state so it can never collide with the load error. Replace the `error` state declaration (line 23) with:

```tsx
  const [fileWarning, setFileWarning] = useState<string | null>(null)
```

Replace `handleSubmit` (lines 48–74):

```tsx
  const handleSubmit = async (
    answers: Record<string, string | string[]>,
    files: Record<string, File>
  ) => {
    if (!formData) return
    setFileWarning(null)

    const { data, error: submitErr } = await submitAdoptionForm(petId, {
      form_id: formData.form.id,
      answers,
    })

    // Throwing keeps FormRenderer on the form with its own error banner — there
    // is no success to show, so the success screen must never render.
    if (submitErr || !data) {
      throw new Error(submitErr || t('adopt.submit_error'))
    }

    // The submission succeeded. A failed attachment is a warning ON the success
    // screen, not a competing error banner.
    for (const [fieldId, file] of Object.entries(files)) {
      const { error: fileErr } = await uploadSubmissionFile(data.submission_id, fieldId, file)
      if (fileErr) {
        setFileWarning(t('forms.success_file_warning'))
        break
      }
    }
  }
```

Delete the page-level error banner at lines 133–137 entirely — the load error now has its own full-page branch (Task 2) and the submit error lives inside `FormRenderer`.

Finally, pass the warning through (line 139):

```tsx
        <FormRenderer
          form={formData.form}
          rc={{ name: rc.name, logo_url: rc.logo_url }}
          onSubmit={handleSubmit}
          submitWarning={fileWarning}
        />
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npx vitest run components/__tests__/adopt/adopt-pet-page.test.tsx`
Expected: PASS — 5 tests.

- [ ] **Step 7: Run the full suite**

Run: `npx vitest run`
Expected: PASS.

- [ ] **Step 8: Verify manually**

Submit an adoption form on a pet whose form has a file field. With DevTools → Network, block only the `POST /api/v1/submissions/*/files/*` request (right-click → Block request URL).
Expected: the success screen appears **with** an amber warning explaining the attachment failed — and no red error banner anywhere.

- [ ] **Step 9: Commit**

```bash
git add components/adopt/adopt-pet-page.tsx components/forms/form-renderer.tsx \
  components/__tests__/adopt/adopt-pet-page.test.tsx \
  public/locales/es/pets.json public/locales/en/pets.json
git commit -m "fix(adopt): make submit outcomes mutually exclusive

A failed attachment upload showed the success screen and a page-level error
banner at once. The submission succeeding with a failed upload is now one
outcome: success plus a distinct warning. Also swaps the paw emoji for
faPaw and the raw anchor for TransitionLink."
```

---

## Task 4: `/chat` — a failed conversation fetch renders the empty state (spec §8 P0)

**Root cause:** `components/chat/chat-conversation-list.tsx:41` destructures only `{ data }`. On failure `data` is null, `conversations` stays `[]`, and the user is told "No tienes conversaciones aún" — which is a lie. Observed live: a transient failure also left an infinite sidebar spinner when the promise never settled.

**Files:**
- Modify: `components/chat/chat-conversation-list.tsx:39-47,94-109`
- Create: `components/__tests__/chat/chat-conversation-list.test.tsx`
- Modify: `public/locales/{es,en}/pets.json`

- [ ] **Step 1: Add the translation keys (Spanish first)**

`public/locales/es/pets.json` — inside `"chat"`:

```json
    "load_error": "No pudimos cargar tus conversaciones",
    "empty_hint": "Cuando un centro apruebe tu solicitud, podrás chatear aquí.",
    "empty_cta": "Ver mascotas",
    "select_conversation": "Selecciona una conversación para empezar",
    "thread_error": "No pudimos cargar los mensajes",
```

`public/locales/en/pets.json`:

```json
    "load_error": "We couldn't load your conversations",
    "empty_hint": "When a rescue centre approves your application, you'll be able to chat here.",
    "empty_cta": "Browse pets",
    "select_conversation": "Pick a conversation to get started",
    "thread_error": "We couldn't load these messages",
```

- [ ] **Step 2: Write the failing test**

Create `components/__tests__/chat/chat-conversation-list.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../test-utils'

vi.mock('@/lib/api/chat', () => ({ listConversations: vi.fn() }))
vi.mock('@/lib/contexts/websocket-context', () => ({
  useWebSocket: () => ({ subscribe: () => () => {} }),
}))

import ChatConversationList from '@/components/chat/chat-conversation-list'
import { listConversations } from '@/lib/api/chat'

const mockList = vi.mocked(listConversations)

beforeEach(() => vi.clearAllMocks())

describe('ChatConversationList', () => {
  it('shows an error with retry when the fetch fails', async () => {
    mockList.mockResolvedValue({ data: null, error: 'Error de conexión' })

    renderWithProviders(<ChatConversationList onSelectConversation={() => {}} />)

    expect(await screen.findByText('No pudimos cargar tus conversaciones')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
    // The empty state must NOT be what a failure looks like.
    expect(screen.queryByText('No tienes conversaciones aún')).not.toBeInTheDocument()
  })

  it('retries the fetch when retry is pressed', async () => {
    mockList.mockResolvedValue({ data: null, error: 'Error de conexión' })
    renderWithProviders(<ChatConversationList onSelectConversation={() => {}} />)
    await screen.findByRole('button', { name: 'Reintentar' })

    mockList.mockResolvedValue({ data: [], error: null })
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))

    expect(await screen.findByText('No tienes conversaciones aún')).toBeInTheDocument()
  })

  it('explains how conversations start when there are genuinely none', async () => {
    mockList.mockResolvedValue({ data: [], error: null })

    renderWithProviders(<ChatConversationList onSelectConversation={() => {}} />)

    expect(await screen.findByText('No tienes conversaciones aún')).toBeInTheDocument()
    expect(
      screen.getByText('Cuando un centro apruebe tu solicitud, podrás chatear aquí.')
    ).toBeInTheDocument()
  })
})
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx vitest run components/__tests__/chat/chat-conversation-list.test.tsx`
Expected: FAIL — all three; the component has no error branch and no empty-state hint.

- [ ] **Step 4: Add the error branch**

In `components/chat/chat-conversation-list.tsx`, update the imports:

```tsx
import { useCallback, useEffect, useState } from 'react'
import { ErrorState } from '@/components/ui/error-state'
import { Spinner } from '@/components/ui/spinner'
import { TransitionLink } from '@/components/transitions/transition-link'
```

Add the error state next to `loading` (line 37):

```tsx
  const [loadError, setLoadError] = useState(false)
```

Replace the fetch effect (lines 39–47) with a callback plus effect:

```tsx
  const load = useCallback(() => {
    setLoading(true)
    setLoadError(false)
    listConversations()
      .then(({ data, error }) => {
        if (error || !data) {
          setLoadError(true)
        } else {
          setConversations(data)
        }
        setLoading(false)
      })
      .catch(() => {
        setLoadError(true)
        setLoading(false)
      })
  }, [])

  useEffect(() => { load() }, [load])
```

> Dropping the `cancelled` flag is safe here: `load` has no dependencies, so the effect runs once per mount and the old cleanup only guarded a StrictMode double-invoke that now re-runs the same idempotent fetch.

Replace the loading and empty branches (lines 94–109):

```tsx
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner className={`text-2xl ${darkBg ? 'text-sidebar-foreground' : 'text-muted-foreground'}`} />
      </div>
    )
  }

  if (loadError) {
    return <ErrorState message={t('chat.load_error')} onRetry={load} />
  }

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 px-6 text-center">
        <FontAwesomeIcon icon={faComments} className={`text-4xl ${darkBg ? 'text-sidebar-foreground/30' : 'text-muted-foreground/30'}`} />
        <p className={`text-sm ${darkBg ? 'text-sidebar-foreground/60' : 'text-muted-foreground'}`}>{t('chat.empty')}</p>
        <p className={`text-xs ${darkBg ? 'text-sidebar-foreground/50' : 'text-muted-foreground/70'} max-w-[15rem]`}>
          {t('chat.empty_hint')}
        </p>
        <TransitionLink
          href="/pets"
          className="focus-ring rounded-xl border border-input px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
        >
          {t('chat.empty_cta')}
        </TransitionLink>
      </div>
    )
  }
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run components/__tests__/chat/chat-conversation-list.test.tsx`
Expected: PASS — 3 tests.

- [ ] **Step 6: Verify against the real failure**

Log in as a member, open http://localhost:3000/chat, set DevTools → Network → Offline, and reload.
Expected: an error card with **Reintentar** in the sidebar — not a spinner, not "No tienes conversaciones aún". Go back online and press Reintentar.

- [ ] **Step 7: Commit**

```bash
git add components/chat/chat-conversation-list.tsx \
  components/__tests__/chat/chat-conversation-list.test.tsx \
  public/locales/es/pets.json public/locales/en/pets.json
git commit -m "fix(chat): stop rendering fetch failures as an empty sidebar

listConversations' error was destructured away, so an outage told the user
they had no conversations. Adds a distinct error state with retry, and
explains in the real empty state how conversations get created."
```

---

## Task 5: `/chat` — the message thread has the same bug (spec §8 P0)

**Root cause:** `components/chat/chat-message-thread.tsx:76` also destructures only `{ data }`. On failure the thread renders as an empty conversation with no indication anything went wrong.

**Files:**
- Modify: `components/chat/chat-message-thread.tsx:56-87,241-244`

- [ ] **Step 1: Add the error state**

In `components/chat/chat-message-thread.tsx`, update the imports:

```tsx
import { ErrorState } from '@/components/ui/error-state'
import { Spinner } from '@/components/ui/spinner'
```

Add the state next to `loading` (line 57):

```tsx
  const [loadError, setLoadError] = useState(false)
```

Replace the initial-fetch effect (lines 70–87):

```tsx
  const loadMessages = useCallback(() => {
    setLoading(true)
    setLoadError(false)
    setMessages([])
    setHasMore(true)

    listMessages(conversation.id)
      .then(({ data, error }) => {
        if (error || !data) {
          setLoadError(true)
          setLoading(false)
          return
        }
        // API returns newest first; reverse for display (oldest at top)
        setMessages(data.reverse())
        if (data.length < 50) setHasMore(false)
        setLoading(false)
      })
      .catch(() => {
        setLoadError(true)
        setLoading(false)
      })
  }, [conversation.id])

  useEffect(() => { loadMessages() }, [loadMessages])
```

- [ ] **Step 2: Branch three ways in the message area**

Replace the `{loading ? (...) : (` opening at lines 241–245 with a three-way branch:

```tsx
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Spinner className="text-2xl text-muted-foreground" />
          </div>
        ) : loadError ? (
          <ErrorState message={t('chat.thread_error')} onRetry={loadMessages} />
        ) : (
```

The rest of the block (the `<>...</>` fragment with `loadingOlder`, the message map, the typing indicator and `messagesEndRef`) is unchanged.

- [ ] **Step 3: Replace the older-messages spinner**

Lines 247–251 — use the shared `Spinner`:

```tsx
            {loadingOlder && (
              <div className="flex justify-center py-2">
                <Spinner className="text-sm text-muted-foreground" />
              </div>
            )}
```

- [ ] **Step 4: Verify**

Open a conversation on http://localhost:3000/chat, set Network → Offline, then click a **different** conversation.
Expected: an error card with Reintentar in the thread pane. Go back online and press it — the messages load.

- [ ] **Step 5: Run the full suite**

Run: `npx vitest run`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add components/chat/chat-message-thread.tsx
git commit -m "fix(chat): show an error with retry when messages fail to load

listMessages' error was discarded, so a failed fetch rendered as an empty
conversation. Also moves both thread spinners onto the shared Spinner."
```

---

## Task 6: `/chat` — "select a conversation" is not "you have no conversations" (spec §8 P0)

**Root cause:** `components/chat/chat-page.tsx:58` reuses `t('chat.empty')` ("No tienes conversaciones aún") for the *no-selection* panel. Once the user actually has conversations, the right-hand panel tells them they have none.

The `chat.select_conversation` key was added in Task 4.

**Files:**
- Modify: `components/chat/chat-page.tsx:56-59`

- [ ] **Step 1: Use the right key**

Replace lines 56–59 of `components/chat/chat-page.tsx`:

```tsx
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3">
              <FontAwesomeIcon icon={faComments} className="text-4xl text-muted-foreground/20" />
              <p className="text-sm">{t('chat.select_conversation')}</p>
            </div>
```

- [ ] **Step 2: Verify**

Log in as a member with at least one conversation and open http://localhost:3000/chat on desktop (≥768px) without selecting anything.
Expected: the right pane reads "Selecciona una conversación para empezar", while the sidebar lists the conversations.

- [ ] **Step 3: Run the full suite**

Run: `npx vitest run`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add components/chat/chat-page.tsx
git commit -m "fix(chat): use a distinct label for the no-selection panel

The right pane reused chat.empty, so users with conversations were told
they had none."
```

---

## Task 7: `/mis-mascotas` — a failed fetch says you have no pets (spec §9 P0)

**Root cause:** `app/mis-mascotas/page.tsx:28` destructures only `{ data }` from `listUserPets()`, so `pets` stays `[]` and the user gets the "add your first pet" empty state after an API failure.

> Note: the "72 Months" age bug from §9 P0 was fixed in Plan A Task 1.

**Files:**
- Modify: `app/mis-mascotas/page.tsx:20-33,75-88`
- Modify: `public/locales/{es,en}/pets.json`

- [ ] **Step 1: Add the translation key (Spanish first)**

`public/locales/es/pets.json` — inside `"member"`:

```json
    "load_error": "No pudimos cargar tus mascotas",
```

`public/locales/en/pets.json`:

```json
    "load_error": "We couldn't load your pets",
```

- [ ] **Step 2: Add the error state**

In `app/mis-mascotas/page.tsx`, update the imports:

```tsx
import { faPaw, faPen, faTrash, faPlus } from '@fortawesome/free-solid-svg-icons'
import { ErrorState } from '@/components/ui/error-state'
```

(`faSpinner` is no longer needed — the skeleton grid replaces it in Plan C. Until then, keep the load state on the shared `Spinner`; add `import { Spinner } from '@/components/ui/spinner'`.)

Add the state (line 21 area):

```tsx
  const [loadError, setLoadError] = useState(false)
```

Replace the `load` callback (lines 26–31):

```tsx
  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(false)
    const { data, error } = await listUserPets()
    if (error || !data) {
      setLoadError(true)
      setPets([])
    } else {
      setPets(data)
    }
    setLoading(false)
  }, [])
```

- [ ] **Step 3: Branch three ways in the render**

Replace the `{loading ? (...) : pets.length === 0 ? (` chain at lines 75–88 so the error case comes **before** the empty case:

```tsx
        {loading ? (
          <div className="flex justify-center py-24">
            <Spinner className="text-3xl text-muted-foreground/40" />
          </div>
        ) : loadError ? (
          <ErrorState message={t('member.load_error')} onRetry={load} />
        ) : pets.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-24 gap-4">
            <FontAwesomeIcon icon={faPaw} className="text-5xl text-muted-foreground/20" />
            <p className="text-muted-foreground max-w-sm">{t('member.my_pets_empty')}</p>
            <Button onClick={openCreate}>
              <FontAwesomeIcon icon={faPlus} className="text-xs mr-1.5" />
              {t('member.add_pet')}
            </Button>
          </div>
        ) : (
```

- [ ] **Step 4: Verify**

Log in as a member, open http://localhost:3000/mis-mascotas, set Network → Offline, reload.
Expected: "No pudimos cargar tus mascotas" with a Reintentar button — not "Aún no has añadido ninguna mascota". Go back online and press Reintentar.

- [ ] **Step 5: Run the full suite**

Run: `npx vitest run`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add app/mis-mascotas/page.tsx public/locales/es/pets.json public/locales/en/pets.json
git commit -m "fix(mis-mascotas): stop rendering fetch failures as an empty state

listUserPets' error was discarded, so an API failure told the user they had
no pets and invited them to add their first one."
```

---

## Task 8: MFA TOTP setup traps the user on a spinner (spec §11 P0)

**Root cause:** `components/auth/mfa/mfa-totp-setup.tsx:26-34` calls `setError(...)` when `totpSetup()` fails but never advances `step` off `'loading'`. The render at `:55-61` returns only a spinner for that step, so the error is set and invisible. There is no back button on that branch either — the user is stuck.

**Files:**
- Modify: `components/auth/mfa/mfa-totp-setup.tsx:19-34,55-67`
- Modify: `public/locales/{es,en}/auth.json`

- [ ] **Step 1: Add the back label (Spanish first)**

Spec §11 P1 notes that `mfa.settings.cancel` is being misused as a *back* label. Add the correct key now so this task's error branch uses it.

`public/locales/es/auth.json` — inside `"mfa.enrollment"`:

```json
      "back": "Atrás",
```

`public/locales/en/auth.json`:

```json
      "back": "Back",
```

- [ ] **Step 2: Add an error step**

In `components/auth/mfa/mfa-totp-setup.tsx`, update the imports:

```tsx
import { useCallback, useState, useEffect } from 'react'
import { faCopy, faCheck, faArrowLeft } from '@fortawesome/free-solid-svg-icons'
import { ErrorState } from '@/components/ui/error-state'
import { Spinner } from '@/components/ui/spinner'
import { useMfaError } from './use-mfa-error'
```

Widen the step union and extract the fetch so retry can re-run it. Replace lines 19–34:

```tsx
  const [step, setStep] = useState<'loading' | 'scan' | 'confirm' | 'failed'>('loading')
  const [secret, setSecret] = useState('')
  const [qrUri, setQrUri] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [verifying, setVerifying] = useState(false)
  const [copiedSecret, setCopiedSecret] = useState(false)
  const resolveError = useMfaError()

  const startSetup = useCallback(() => {
    setStep('loading')
    setError(null)
    mfaApi.totpSetup().then(({ data, error: err }) => {
      if (err || !data) {
        // Was: setError(err) with step stuck on 'loading', which rendered a
        // spinner forever and trapped the user with no way back.
        setError(resolveError(err) ?? null)
        setStep('failed')
        return
      }
      setSecret(data.secret)
      setQrUri(data.qr_uri)
      setStep('scan')
    })
  }, [resolveError])

  useEffect(() => { startSetup() }, [startSetup])
```

- [ ] **Step 3: Render the loading and failed branches**

Replace the `if (step === 'loading')` block (lines 55–61) with:

```tsx
  if (step === 'loading') {
    return (
      <div className="text-center py-8">
        <Spinner className="text-2xl text-pop-550" />
      </div>
    )
  }

  if (step === 'failed') {
    return (
      <div className="space-y-6">
        <button onClick={onBack} className="focus-ring flex items-center gap-2 rounded-xl text-sm text-muted-foreground hover:text-foreground">
          <FontAwesomeIcon icon={faArrowLeft} className="text-xs" />
          {t('mfa.enrollment.back')}
        </button>
        <ErrorState message={error ?? undefined} onRetry={startSetup} />
      </div>
    )
  }
```

- [ ] **Step 4: Fix the back button on the normal branch**

Replace lines 65–67 (the `← {t('mfa.settings.cancel')}` button) with the correct label and a Font Awesome glyph:

```tsx
      <button onClick={onBack} className="focus-ring flex items-center gap-2 rounded-xl text-sm text-muted-foreground hover:text-foreground">
        <FontAwesomeIcon icon={faArrowLeft} className="text-xs" />
        {t('mfa.enrollment.back')}
      </button>
```

- [ ] **Step 5: Verify the trap is gone**

Stop the local API (`docker compose stop` inside `pelu/api/`), then open http://localhost:3000/auth/mfa/enrollment and pick **App de autenticación**.
Expected: a translated error message with **Reintentar** and an **Atrás** link — not an endless spinner. Restart the API and press Reintentar; the QR appears.

Note the spinner is now `text-pop-550` rather than `border-primary`, which was nearly invisible on the forced-dark MFA background (spec §11 P2).

- [ ] **Step 6: Run the full suite**

Run: `npx vitest run`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add components/auth/mfa/mfa-totp-setup.tsx public/locales/es/auth.json public/locales/en/auth.json
git commit -m "fix(mfa): stop trapping users on the TOTP setup spinner

A failed /totp/setup set an error but left step on 'loading', which renders
only a spinner — the error was invisible and there was no way back. Adds a
failed step with a message, retry and a back link."
```

---

## Task 9: MFA email OTP fails silently (spec §11 P0)

**Root cause:** `components/auth/mfa/mfa-enrollment.tsx:41-47` does `if (error) return` — the user taps "Código por email", nothing visibly happens, and there is no pending state on the card while the request is in flight.

**Files:**
- Modify: `components/auth/mfa/mfa-enrollment.tsx:22-48,95-114`

- [ ] **Step 1: Add pending and error handling**

In `components/auth/mfa/mfa-enrollment.tsx`, update the imports:

```tsx
import { toast } from 'sonner'
import { Spinner } from '@/components/ui/spinner'
import { useMfaError } from './use-mfa-error'
```

Add state next to the existing hooks (line 23 area):

```tsx
  const [pendingMethod, setPendingMethod] = useState<MfaMethod | null>(null)
  const resolveError = useMfaError()
```

Replace `handleSelectMethod` (lines 40–48):

```tsx
  const handleSelectMethod = async (method: MfaMethod) => {
    if (method !== 'email') {
      setSelectedMethod(method)
      return
    }

    // Email OTP has no configure screen — it enables in place, so the card
    // itself has to carry the pending and failure feedback.
    setPendingMethod('email')
    const { data, error } = await mfaApi.emailEnable()
    setPendingMethod(null)

    if (error) {
      toast.error(resolveError(error) ?? t('mfa.errors.generic'))
      return
    }
    handleSuccess(data?.recovery_codes)
  }
```

- [ ] **Step 2: Show the pending state on the card**

Replace the method-card button (lines 96–113):

```tsx
            {methods.map((m) => {
              const pending = pendingMethod === m.key
              return (
                <button
                  key={m.key}
                  onClick={() => handleSelectMethod(m.key)}
                  disabled={pendingMethod !== null}
                  aria-busy={pending}
                  className="focus-ring w-full p-4 bg-background/90 backdrop-blur-xl rounded-2xl border border-input hover:border-pop-450/50 transition-all text-left flex items-center gap-4 inset-shadow-[1px_1px_1px_var(--color-input)] disabled:opacity-60"
                >
                  {pending ? (
                    <Spinner className="text-xl text-pop-550" />
                  ) : (
                    <FontAwesomeIcon icon={m.icon} className="text-xl text-pop-550" />
                  )}
                  <div className="flex-1">
                    <div className="font-medium text-foreground">{m.label}</div>
                    <div className="text-sm text-muted-foreground">{m.desc}</div>
                  </div>
                  {m.recommended && (
                    <span className="text-xs px-2 py-1 bg-pop-550/20 text-pop-450 rounded-full font-medium">
                      {t('mfa.enrollment.recommended')}
                    </span>
                  )}
                </button>
              )
            })}
```

(This also switches the "Recomendado" badge to `rounded-full`, per spec §11 P1 — the pill shape is the house rule for status chips.)

- [ ] **Step 2b: Fix the badge contrast**

`text-pop-450` on `bg-pop-550/20` is light teal on light teal. Inside the forced-`dark` MFA panel the surrounding background is dark, so the tint reads as dark and `pop-450` is legible — verify this in Step 3 and, if it is not, change the badge to `bg-pop-solid text-white`.

- [ ] **Step 3: Verify**

Stop the local API, open http://localhost:3000/auth/mfa/enrollment and click **Código por email**.
Expected: the card shows a spinner and all three cards disable while the request is in flight, then a toast with a translated error message. Restart the API and repeat — the flow proceeds to the recovery codes.

While you are there, confirm the "Recomendado" badge is readable against the panel.

- [ ] **Step 4: Run the full suite**

Run: `npx vitest run`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/auth/mfa/mfa-enrollment.tsx
git commit -m "fix(mfa): surface email OTP failures instead of swallowing them

Selecting 'Código por email' returned silently on error with no pending
state. The card now shows a spinner while the request runs and an error
toast when it fails. Badge moves to rounded-full."
```

---

## Task 10: `/auth/mfa/enrollment` is unguarded (spec §11 P0)

**Root cause:** the route has no `ProtectedRoute` wrapper and no layout guard, so an anonymous visitor renders the full enrollment UI and every method fires a 401. Every other protected route in the app uses a `layout.tsx` that wraps children in `<ProtectedRoute>`.

**Files:**
- Create: `app/auth/mfa/enrollment/layout.tsx`

- [ ] **Step 1: Confirm the bug**

Open an incognito window at http://localhost:3000/auth/mfa/enrollment.
Expected today: the full three-method UI renders. Click a method — the Network tab shows a 401.

- [ ] **Step 2: Check the existing layout pattern**

```bash
cat app/mis-mascotas/layout.tsx
```

Match whatever that file does.

- [ ] **Step 3: Add the guard**

Create `app/auth/mfa/enrollment/layout.tsx`:

```tsx
'use client'

import { ProtectedRoute } from '@/components/auth/protected-route'

export default function MfaEnrollmentLayout({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute>{children}</ProtectedRoute>
}
```

No `requireRole` — every authenticated role may enroll an MFA method. `ProtectedRoute` redirects anonymous visitors to `/auth/login`.

- [ ] **Step 4: Verify**

Reload http://localhost:3000/auth/mfa/enrollment in the incognito window.
Expected: the assembling-paw loader briefly, then a redirect to `/auth/login` — no 401s in the Network tab.

Then log in and reach the page from the account sheet → "Configurar MFA".
Expected: the enrollment UI renders normally.

Finally, confirm the **forced**-MFA path still works: `ProtectedRoute` itself renders `<MfaEnrollment>` for `rescue_center`/`business` when `mfaSetupRequired` is true (`components/auth/protected-route.tsx:57`). Log in as a rescue-center account that has no MFA and confirm you still get the enrollment screen — not a redirect loop.

- [ ] **Step 5: Run the full suite**

Run: `npx vitest run`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add app/auth/mfa/enrollment/layout.tsx
git commit -m "fix(mfa): guard the enrollment route

Anonymous visitors rendered the full enrollment UI and fired 401s on every
method. Adds the layout.tsx + ProtectedRoute pattern used by every other
protected route."
```

---

## Final verification

- [ ] **Step 1: Full test suite**

Run: `npx vitest run`
Expected: PASS, including the new `adopt-pet-page` and `chat-conversation-list` tests and the Plan A tests (`format-age`, `user-pet-card` with the "6 años" assertion).

- [ ] **Step 2: Lint and build**

Run: `bun run lint && bun run build`
Expected: both succeed.

- [ ] **Step 3: Walk every P0 path**

With DevTools → Network → Offline as the failure trigger:

| route | expected under failure |
| --- | --- |
| `/adopt?id=<real>` | error card + Reintentar (not a redirect to /pets) |
| `/adopt?id=<garbage>` **online** | still redirects to /pets |
| `/chat` sidebar | error card + Reintentar (not "no conversations") |
| `/chat` thread | error card + Reintentar (not an empty conversation) |
| `/mis-mascotas` | error card + Reintentar (not "add your first pet") |
| `/auth/mfa/enrollment` TOTP (API stopped) | message + Reintentar + Atrás (not a spinner) |
| `/auth/mfa/enrollment` email (API stopped) | pending spinner then an error toast |
| `/auth/mfa/enrollment` **logged out** | redirect to /auth/login, zero 401s |

And with everything healthy:

| route | expected |
| --- | --- |
| `/adopt?id=<real>` | banner un-cropped at 1440px **and** 375px |
| `/adopt` submit with a blocked file upload | success screen **plus** an amber attachment warning, no red banner |
| `/chat` with conversations, none selected | "Selecciona una conversación para empezar" |
| `/mis-mascotas` with an adult pet | "N años", not "72 Meses" |

- [ ] **Step 4: Update the task log**

Append a "Plan B review" section to `tasks/todo.md`.

- [ ] **Step 5: Merge**

Follow the `superpowers:finishing-a-development-branch` skill to open a PR from `fix/ui-pass-p0-bugs` or merge to `main`.

---

## Deferred to Plan C

Everything else in spec §7–§11 is P1/P2 and belongs to Plan C:

- §7 P1/P2 — form section cards, progress indicator, touch targets, label association, dropzone keyboard access, double-container dedupe, sticky pet chip
- §8 P1/P2 — send feedback and connection status, chat a11y (`role="log"`, input label, typing-indicator text), panel/bubble treatment, header-height math
- §9 P1/P2 — pet photo alt text, add-pet modal dialog semantics, skeleton grid, double-mounted modal, meta-row legibility, shadow scale, carousel first-paint flash
- §11 P1/P2 — stepper progress, TOTP back-to-QR sub-step, recovery-codes gate, OTP input a11y, success moment, panel-shell dedupe, skip-link affordance, QR title
