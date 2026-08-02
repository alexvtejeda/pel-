# Aliados "Contactar" → Chat — Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reintroduce **Contactar** on `/aliados` as a working button — tapping it opens a real conversation with the provider and lands the user in `/chat` on that thread.

**Architecture:** The button calls a new shared endpoint with the provider's id, then navigates to `/chat?conversation_id=<id>`; the chat page auto-selects that conversation once its list loads. Three adjacent bugs the spec found in the same code paths get fixed alongside: a field-name mismatch that silently disables every business-only UI branch, a stale `Conversation` interface, and an attach menu gated on the wrong thing.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind v4, Bun, Vitest + React Testing Library, react-i18next, Font Awesome, Sonner.

**Spec:** `../../../../docs/superpowers/specs/2026-07-28-aliados-contactar-chat-design.md` (approved 2026-07-28; at the `pelu/` root because it spans both repos).

---

## ⚠️ Shared work with member adoption listings

This plan **owns** two pieces that the member-listings frontend plan (`2026-08-01-member-adoption-listings-frontend.md`) also describes:

| Piece | Owned here | Effect on the other plan |
|---|---|---|
| `createConversation` in `lib/api/chat.ts` | Task 2 — takes `{ provider_id }` **or** `{ pet_id }` | Its Task 2 becomes a no-op; its Task 4 must call `createConversation({ pet_id: pet.id })` |
| `/chat?conversation_id=` deep link | Task 5 | Its Task 5 becomes a no-op |

Whichever plan runs second should check for the function/prop before building it. The signature below is the canonical one — **an object argument, not a positional string** — because there are two branches.

**Backend dependency:** Tasks 2–5 need `POST /api/v1/conversations` from `../../../../api/docs/superpowers/plans/2026-08-01-aliados-contactar-chat-api.md` (its Tasks 1–3). Task 1 here is a pure frontend bug fix and needs nothing.

---

## Before you start

**Repo:** all work happens in `/home/noob_master/pelu/frontend`. Commit **inside this repo** — `git -C /home/noob_master/pelu/frontend ...` for every git write. Stage specific files; never `git add -A`.

```bash
cd /home/noob_master/pelu/frontend && npx vitest run                    # all tests
cd /home/noob_master/pelu/frontend && npx vitest run path/to/file.test.tsx
```

There is **no `test` npm script**. Use `renderWithProviders()` from `components/__tests__/test-utils.tsx`, never raw `render()`.

**Known flake:** the about-scenes smoke test is flaky in full runs and passes alone. Re-run it by itself before assuming you broke it.

**Dev server** is assumed already running on port 3000. Do not start it.

**Conventions** (a reviewer will send it back otherwise): Font Awesome only, never lucide-react or inline SVG outside `components/ui/`; icon sizing with `text-*` not `w-*`/`h-*`; `rounded-2xl` cards, `rounded-xl` buttons; API modules return `{ data, error }` and never throw; Spanish first then English.

---

## File structure

| File | Responsibility | Task |
|---|---|---|
| `lib/api/providers.ts` | rename `type` → `provider_type` | 1 |
| `components/aliados/provider-detail.tsx` | 3 call sites + the Contactar button | 1, 4 |
| `components/providers/provider-card.tsx` | 1 call site | 1 |
| `lib/api/chat.ts` | `Conversation` sync + `createConversation` | 2, 3 |
| `components/chat/chat-conversation-list.tsx` | `autoSelectId` prop; drop dead `pet_name` badge | 3, 5 |
| `components/chat/chat-page.tsx` | read `?conversation_id=` | 5 |
| `components/chat/chat-message-thread.tsx` | gate the attach menu on `type` | 6 |
| `public/locales/{es,en}/business.json` | Contactar copy | 4 |

---

## Task 1: Fix the `provider_type` field-name bug

`lib/api/providers.ts:7` declares `type: 'business' | 'member'`, but the API sends **`provider_type`** (`internal/serviceproviders/repository.go:182`). So `provider.type` is always `undefined`, and every `provider.type === 'business'` check is permanently false — the business badge, operating hours and Instagram have never rendered on `/aliados`.

Pre-existing display bug, fixed here because Contactar depends on correct provider identity. **No backend dependency.**

**Files:**
- Modify: `lib/api/providers.ts:7`
- Modify: `components/aliados/provider-detail.tsx:68,106,134`
- Modify: `components/providers/provider-card.tsx:69`
- Test: `components/__tests__/aliados/provider-detail.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `components/__tests__/aliados/provider-detail.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../test-utils'
import { ProviderDetail } from '@/components/aliados/provider-detail'

const provider = (overrides: Record<string, unknown> = {}) =>
  ({
    id: 'pr1',
    user_id: 'u1',
    name: 'Guardería Canina',
    provider_type: 'business',
    services: ['boarding'],
    description: 'Cuidamos a tu mascota',
    instagram: 'guarderia',
    ...overrides,
  }) as never

describe('ProviderDetail identity', () => {
  // The API sends `provider_type`; the interface used to declare `type`, so
  // every business-only branch was permanently false and these never rendered.
  it('shows the business badge for a business provider', () => {
    renderWithProviders(<ProviderDetail provider={provider()} />)
    expect(screen.getByText('Empresa verificada')).toBeInTheDocument()
  })

  it('shows the member badge for a member provider', () => {
    renderWithProviders(<ProviderDetail provider={provider({ provider_type: 'member' })} />)
    expect(screen.getByText('Proveedor verificado')).toBeInTheDocument()
  })

  it('renders the Instagram link for a business', () => {
    renderWithProviders(<ProviderDetail provider={provider()} />)
    expect(screen.getByRole('link', { name: /guarderia/ })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

```bash
cd /home/noob_master/pelu/frontend && npx vitest run components/__tests__/aliados/provider-detail.test.tsx
```

Expected: FAIL — the business badge and Instagram link are absent (the member badge test passes for the wrong reason: `undefined !== 'business'` falls to the member branch).

- [ ] **Step 3: Rename the field on the interface**

In `lib/api/providers.ts`, in `UnifiedProvider`:

```ts
export interface UnifiedProvider {
  id: string
  user_id: string
  name: string
  /**
   * Wire name is `provider_type` (api: internal/serviceproviders/repository.go).
   * This used to be declared as `type`, which silently disabled every
   * business-only UI branch — the value was always undefined.
   */
  provider_type: 'business' | 'member'
  services: string[]
  // …rest unchanged
}
```

- [ ] **Step 4: Update the four call sites**

In `components/aliados/provider-detail.tsx`, lines 68, 106 and 134 — change each `provider.type === 'business'` to `provider.provider_type === 'business'`.

In `components/providers/provider-card.tsx:69` — same change.

Verify none remain:

```bash
cd /home/noob_master/pelu/frontend && grep -rn "provider\.type\b" components/ lib/
```

Expected: no output.

- [ ] **Step 5: Run the tests**

```bash
cd /home/noob_master/pelu/frontend && npx vitest run components/__tests__/aliados/ && npx tsc --noEmit
```

Expected: PASS, and the type-check catches any call site the grep missed.

- [ ] **Step 6: Commit**

```bash
git -C /home/noob_master/pelu/frontend add lib/api/providers.ts components/aliados/provider-detail.tsx components/providers/provider-card.tsx components/__tests__/aliados/
git -C /home/noob_master/pelu/frontend commit -m "fix(aliados): read provider_type, not type, so business branches render"
```

---

## Task 2: `createConversation`

**Files:**
- Modify: `lib/api/chat.ts`
- Test: `lib/api/__tests__/chat.test.ts`

- [ ] **Step 1: Write the failing test**

Create `lib/api/__tests__/chat.test.ts` (append if it exists):

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const apiClient = vi.fn()
vi.mock('@/lib/api/client', () => ({ apiClient: (...args: unknown[]) => apiClient(...args) }))

import { createConversation } from '@/lib/api/chat'

describe('createConversation', () => {
  beforeEach(() => apiClient.mockReset())

  it('posts a provider id', async () => {
    apiClient.mockResolvedValue({ ok: true, json: async () => ({ id: 'c1' }) })

    const { data, error } = await createConversation({ provider_id: 'pr1' })

    expect(error).toBeNull()
    expect(data).toEqual({ id: 'c1' })
    const [path, options] = apiClient.mock.calls[0]
    expect(path).toBe('/api/v1/conversations')
    expect(options.method).toBe('POST')
    expect(JSON.parse(options.body)).toEqual({ provider_id: 'pr1' })
  })

  it('posts a pet id', async () => {
    apiClient.mockResolvedValue({ ok: true, json: async () => ({ id: 'c2' }) })

    await createConversation({ pet_id: 'p1' })

    expect(JSON.parse(apiClient.mock.calls[0][1].body)).toEqual({ pet_id: 'p1' })
  })

  it('returns the API error message instead of throwing', async () => {
    apiClient.mockResolvedValue({ ok: false, json: async () => ({ error: 'not found' }) })

    const { data, error } = await createConversation({ provider_id: 'gone' })

    expect(data).toBeNull()
    expect(error).toBe('not found')
  })

  it('returns a connection error when the request throws', async () => {
    apiClient.mockRejectedValue(new Error('network down'))

    const { data, error } = await createConversation({ provider_id: 'pr1' })

    expect(data).toBeNull()
    expect(error).toBe('Error de conexión')
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

```bash
cd /home/noob_master/pelu/frontend && npx vitest run lib/api/__tests__/chat.test.ts
```

Expected: FAIL — `createConversation is not a function`.

- [ ] **Step 3: Implement it**

Append to `lib/api/chat.ts`:

```ts
/**
 * Target of a new conversation. A **resource** id, never a user id — the
 * backend resolves the owner and only lets you reach someone who is publicly
 * listed right now. Exactly one key.
 */
export type ConversationTarget = { provider_id: string } | { pet_id: string }

/**
 * Opens (or reuses) a conversation with a listing's owner.
 *
 * Idempotent — calling it twice for the same target returns the same
 * conversation, so the button needs no "already contacted" state.
 */
export async function createConversation(
  target: ConversationTarget
): Promise<{ data: { id: string } | null; error: string | null }> {
  try {
    const res = await apiClient('/api/v1/conversations', {
      method: 'POST',
      body: JSON.stringify(target),
    })
    const json = await res.json()
    if (!res.ok) return { data: null, error: json.error || 'Error al iniciar la conversación' }
    return { data: json, error: null }
  } catch {
    return { data: null, error: 'Error de conexión' }
  }
}
```

- [ ] **Step 4: Run the test**

```bash
cd /home/noob_master/pelu/frontend && npx vitest run lib/api/__tests__/chat.test.ts
```

Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git -C /home/noob_master/pelu/frontend add lib/api/chat.ts lib/api/__tests__/chat.test.ts
git -C /home/noob_master/pelu/frontend commit -m "feat(chat): add createConversation for providers and adoption listings"
```

---

## Task 3: Sync the stale `Conversation` interface

`lib/api/chat.ts:3-16` still declares `rescue_center_id`, `member_id`, `pet_name` and `pet_photo_url` — none of which the backend has sent since migration `000042` — and lacks `other_user_id`, `type` and `other_avatar_url`, which it does send (`internal/chat/repository.go:101-129`).

**Files:**
- Modify: `lib/api/chat.ts:3-16`
- Modify: `components/chat/chat-conversation-list.tsx:158` (dead `pet_name` badge)

- [ ] **Step 1: Replace the interface**

In `lib/api/chat.ts`:

```ts
/**
 * Mirrors the backend's ConversationSummary
 * (api: internal/chat/repository.go). Note what is NOT here: `rescue_center_id`
 * and `member_id` were dropped by migration 000042, and `pet_name` /
 * `pet_photo_url` have never been sent — the interface declared them for years
 * and the UI rendered a badge that was always empty.
 */
export interface Conversation {
  id: string
  type: 'adoption' | 'transport' | 'service'
  /** Derived from the linked submission; null for service and direct chats. */
  pet_id?: string | null
  other_user_id: string
  other_user_name: string | null
  other_user_email: string
  other_avatar_url?: string | null
  last_message_body: string | null
  last_message_at: string | null
  unread_count: number
  created_at: string
}
```

- [ ] **Step 2: Remove the dead `pet_name` badge**

In `components/chat/chat-conversation-list.tsx` around line 158, delete the badge that renders `conversation.pet_name`. The field has never had a value; the row's name line (`other_user_name || other_user_email`) is the real content.

- [ ] **Step 3: Type-check and find fallout**

```bash
cd /home/noob_master/pelu/frontend && npx tsc --noEmit
```

Expected: errors at every place that read a removed field. Fix each by using the real field — `other_user_name` for display, `pet_id` for the transport shortcut. If something genuinely needs a pet name, it must come from a different source; do not re-add the dead field.

- [ ] **Step 4: Run the chat tests**

```bash
cd /home/noob_master/pelu/frontend && npx vitest run components/__tests__/chat/ && npx tsc --noEmit
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git -C /home/noob_master/pelu/frontend add lib/api/chat.ts components/chat/chat-conversation-list.tsx
git -C /home/noob_master/pelu/frontend commit -m "fix(chat): sync the Conversation type with what the API actually sends"
```

---

## Task 4: The Contactar button

The button was **removed** by the UI improvement pass — `components/aliados/provider-detail.tsx` now ends with a comment explaining that a permanently-disabled button promises something that never happens, and pointing at this spec. Reintroduce it, functional.

**Files:**
- Modify: `components/aliados/provider-detail.tsx` (replace the trailing comment)
- Modify: `public/locales/{es,en}/business.json`
- Test: `components/__tests__/aliados/provider-detail.test.tsx`

- [ ] **Step 1: Write the failing test**

Append to `components/__tests__/aliados/provider-detail.test.tsx`:

```tsx
describe('ProviderDetail Contactar', () => {
  beforeEach(() => {
    mockUser = null
    createConversation.mockReset()
    push.mockReset()
  })

  // /aliados is public and the button is the conversion path — a logged-out
  // visitor must see it, not have it hidden.
  it('sends a logged-out visitor to login', () => {
    renderWithProviders(<ProviderDetail provider={provider()} />)
    fireEvent.click(screen.getByRole('button', { name: /contactar/i }))

    expect(createConversation).not.toHaveBeenCalled()
    expect(push).toHaveBeenCalledWith('/auth/login')
  })

  it('opens a conversation and navigates to chat', async () => {
    mockUser = { id: 'u2', role: 'member' }
    createConversation.mockResolvedValue({ data: { id: 'c1' }, error: null })

    renderWithProviders(<ProviderDetail provider={provider()} />)
    fireEvent.click(screen.getByRole('button', { name: /contactar/i }))

    await waitFor(() => expect(createConversation).toHaveBeenCalledWith({ provider_id: 'pr1' }))
    await waitFor(() => expect(push).toHaveBeenCalledWith('/chat?conversation_id=c1'))
  })

  it('hides the button on your own listing', () => {
    mockUser = { id: 'u1', role: 'member' }   // same id as provider.user_id

    renderWithProviders(<ProviderDetail provider={provider()} />)

    expect(screen.queryByRole('button', { name: /contactar/i })).toBeNull()
  })

  it('surfaces an error without navigating', async () => {
    mockUser = { id: 'u2', role: 'member' }
    createConversation.mockResolvedValue({ data: null, error: 'not found' })

    renderWithProviders(<ProviderDetail provider={provider()} />)
    fireEvent.click(screen.getByRole('button', { name: /contactar/i }))

    await waitFor(() => expect(toastError).toHaveBeenCalled())
    expect(push).not.toHaveBeenCalled()
  })
})
```

Add these mocks at the top of the file, above the existing imports of the component:

```tsx
let mockUser: { id: string; role: string } | null = null
vi.mock('@/lib/contexts/auth-context', () => ({ useAuth: () => ({ user: mockUser, loading: false }) }))

const createConversation = vi.fn()
vi.mock('@/lib/api/chat', () => ({ createConversation: (...a: unknown[]) => createConversation(...a) }))

const push = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace: vi.fn(), back: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => '/aliados',
  useSearchParams: () => new URLSearchParams(),
}))

const toastError = vi.fn()
vi.mock('sonner', () => ({ toast: { error: toastError, success: vi.fn() } }))
```

Import `fireEvent` and `waitFor` from `@testing-library/react` and `beforeEach` from `vitest`.

- [ ] **Step 2: Run it to verify it fails**

```bash
cd /home/noob_master/pelu/frontend && npx vitest run components/__tests__/aliados/provider-detail.test.tsx
```

Expected: FAIL — there is no Contactar button.

- [ ] **Step 3: Add the handler**

In `components/aliados/provider-detail.tsx`, inside the component:

```tsx
  const { user } = useAuth()
  const router = useRouter()
  const [contacting, setContacting] = useState(false)

  // Own listing → no button. Everyone else, including logged-out visitors, sees
  // it: /aliados is public and this is the conversion path.
  const isOwnListing = user?.id === provider.user_id

  const handleContact = async () => {
    if (!user) {
      // No return-URL convention exists — postLoginRedirect is role-based only —
      // so a logged-out visitor lands on their normal post-login destination and
      // navigates back. Worth revisiting when login grows a `next` param.
      router.push('/auth/login')
      return
    }
    if (contacting) return
    setContacting(true)
    const { data, error } = await createConversation({ provider_id: provider.id })
    if (error || !data) {
      toast.error(error === 'not found' ? t('provider.contact_unavailable') : t('provider.contact_error'))
      setContacting(false)
      return
    }
    router.push(`/chat?conversation_id=${data.id}`)
  }
```

Imports to add: `useState` from `react`, `useRouter` from `next/navigation`, `toast` from `sonner`, `useAuth` from `@/lib/contexts/auth-context`, `createConversation` from `@/lib/api/chat`, and `faComments` from `@fortawesome/free-solid-svg-icons`.

- [ ] **Step 4: Replace the placeholder comment with the button**

At the bottom of `provider-detail.tsx`, replace the whole `{/* The "Contactar" CTA is intentionally absent... */}` comment block with:

```tsx
      {!isOwnListing && (
        <div className="shrink-0 border-t border-border p-4">
          <button
            onClick={handleContact}
            disabled={contacting}
            className="focus-ring w-full py-2.5 bg-pop-solid text-white font-semibold rounded-xl hover:bg-pop-850 transition-[background-color,transform] active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2"
          >
            <FontAwesomeIcon icon={faComments} className="text-sm" />
            {contacting ? t('provider.contacting') : t('provider.contact')}
          </button>
        </div>
      )}
```

It sits outside the scrolling `<div className="flex-1 overflow-y-auto p-4 space-y-4">` so it pins to the panel floor, matching `pet-detail.tsx`'s CTA.

- [ ] **Step 5: Add the i18n keys**

`public/locales/es/business.json`, in `provider`:

```json
    "contact": "Contactar",
    "contacting": "Abriendo chat...",
    "contact_error": "No pudimos iniciar la conversación",
    "contact_unavailable": "Este aliado ya no está disponible",
```

`public/locales/en/business.json`, in `provider`:

```json
    "contact": "Contact",
    "contacting": "Opening chat...",
    "contact_error": "We couldn't start the conversation",
    "contact_unavailable": "This partner is no longer available",
```

- [ ] **Step 6: Run the tests**

```bash
cd /home/noob_master/pelu/frontend && npx vitest run components/__tests__/aliados/
```

Expected: PASS, all 7 tests in the file.

- [ ] **Step 7: Commit**

```bash
git -C /home/noob_master/pelu/frontend add components/aliados/provider-detail.tsx public/locales components/__tests__/aliados/
git -C /home/noob_master/pelu/frontend commit -m "feat(aliados): wire the Contactar button to real chat"
```

---

## Task 5: `/chat?conversation_id=` deep link

`components/chat/chat-page.tsx` handles `?welcome=1` but not `?conversation_id=`, so Task 4 would land users on the chat page with nothing selected.

There is no `GET /conversations/{id}` endpoint. Matching against the loaded list is the intended mechanism — do not add a backend route for it.

> **Shared with** member-listings frontend Task 5. Identical; do it once here.

**Files:**
- Modify: `components/chat/chat-conversation-list.tsx` (props + effect)
- Modify: `components/chat/chat-page.tsx`
- Test: `components/__tests__/chat/chat-deep-link.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `components/__tests__/chat/chat-deep-link.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'

const listConversations = vi.fn()
const listMessages = vi.fn().mockResolvedValue({ data: [], error: null })
vi.mock('@/lib/api/chat', () => ({
  listConversations: () => listConversations(),
  listMessages: () => listMessages(),
}))
vi.mock('@/lib/contexts/websocket-context', () => ({
  useWebSocket: () => ({ subscribe: () => () => {}, send: vi.fn() }),
}))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => '/chat',
  useSearchParams: () => new URLSearchParams('conversation_id=c2'),
}))

import { renderWithProviders } from '../test-utils'
import { ChatPage } from '@/components/chat/chat-page'

const conv = (id: string, name: string) => ({
  id, type: 'service', pet_id: null, other_user_id: 'u' + id,
  other_user_name: name, other_user_email: name + '@example.com',
  last_message_body: null, last_message_at: null, unread_count: 0,
  created_at: '2026-01-01T00:00:00Z',
})

describe('chat deep link', () => {
  beforeEach(() => listConversations.mockReset())

  it('opens the conversation named in the URL', async () => {
    listConversations.mockResolvedValue({ data: [conv('c1', 'Ana'), conv('c2', 'María')], error: null })

    renderWithProviders(<ChatPage />)

    // Selected → the name appears in the list row AND the thread header.
    await waitFor(() => expect(screen.getAllByText('María').length).toBeGreaterThan(1))
  })

  it('ignores an id that is not in the list', async () => {
    listConversations.mockResolvedValue({ data: [conv('c1', 'Ana')], error: null })

    renderWithProviders(<ChatPage />)

    await waitFor(() => expect(screen.getByText('Ana')).toBeInTheDocument())
    expect(screen.getAllByText('Ana')).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

```bash
cd /home/noob_master/pelu/frontend && npx vitest run components/__tests__/chat/chat-deep-link.test.tsx
```

Expected: FAIL — nothing is auto-selected.

- [ ] **Step 3: Add `autoSelectId` to the list**

In `components/chat/chat-conversation-list.tsx`, add to `ChatConversationListProps`:

```ts
  /**
   * Conversation to open once the list has loaded — backs the
   * `/chat?conversation_id=` deep link. Fires at most once per mount so the
   * user stays free to navigate away afterwards.
   */
  autoSelectId?: string
```

Destructure it in the component signature, then add after the conversations state:

```tsx
  const autoSelectedRef = useRef(false)

  useEffect(() => {
    if (!autoSelectId || autoSelectedRef.current || conversations.length === 0) return
    autoSelectedRef.current = true
    const match = conversations.find((c) => c.id === autoSelectId)
    // A missing id is not an error — the conversation may have been reaped by
    // the 30-day empty-conversation GC. Drop it silently rather than toasting.
    if (match) onSelectConversation(match)
  }, [autoSelectId, conversations, onSelectConversation])
```

`useRef` and `useEffect` are already imported in this file.

- [ ] **Step 4: Read the param in the page**

In `components/chat/chat-page.tsx`, after the `welcome` effect:

```tsx
  const deepLinkId = searchParams?.get('conversation_id') ?? undefined
```

and pass it down:

```tsx
            <ChatConversationList onSelectConversation={setActive} autoSelectId={deepLinkId} />
```

Do **not** `router.replace` the param away like the `welcome` handler does — the id is harmless in the URL, and stripping it races the list's load.

- [ ] **Step 5: Run the tests**

```bash
cd /home/noob_master/pelu/frontend && npx vitest run components/__tests__/chat/
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git -C /home/noob_master/pelu/frontend add components/chat/ components/__tests__/chat/
git -C /home/noob_master/pelu/frontend commit -m "feat(chat): open the conversation named in the URL"
```

---

## Task 6: Gate the attach menu on conversation type

`components/chat/chat-message-thread.tsx:426` gates the `+` attach menu on `conversation.pet_id`, which happens to be null in service conversations — so it already disappears, by accident. Now that `type` exists on the frontend interface (Task 3), make the intent explicit.

**Files:**
- Modify: `components/chat/chat-message-thread.tsx:426`

- [ ] **Step 1: Make the gate explicit**

Change:

```tsx
        {conversation.pet_id && (
```

to:

```tsx
        {/* Explicit, not incidental: the shortcut behind this menu is the
            adoption transport request, which needs both an adoption thread and
            a pet. Service conversations have neither. A future iteration may
            offer transport inside service threads — transport_trips already
            accepts any conversation_id — but not today. */}
        {conversation.type === 'adoption' && conversation.pet_id && (
```

- [ ] **Step 2: Verify the tests still pass**

```bash
cd /home/noob_master/pelu/frontend && npx vitest run components/__tests__/chat/ && npx tsc --noEmit
```

Expected: PASS. If a test constructs a conversation without `type`, add it — the interface now requires it.

- [ ] **Step 3: Commit**

```bash
git -C /home/noob_master/pelu/frontend add components/chat/chat-message-thread.tsx
git -C /home/noob_master/pelu/frontend commit -m "refactor(chat): gate the attach menu on conversation type"
```

---

## Task 7: Full suite

- [ ] **Step 1: Verify locale parity**

```bash
cd /home/noob_master/pelu/frontend && python3 -c "
import json
es = json.load(open('public/locales/es/business.json'))
en = json.load(open('public/locales/en/business.json'))
a, b = set(es.get('provider', {})), set(en.get('provider', {}))
print('only in es:', sorted(a - b), '| only in en:', sorted(b - a))
"
```

Expected: both lists empty.

- [ ] **Step 2: Run everything**

```bash
cd /home/noob_master/pelu/frontend && npx vitest run
```

Expected: PASS. If about-scenes fails, re-run it alone — known flake. Any other failure is yours; report it with the output.

- [ ] **Step 3: Type-check and build**

```bash
cd /home/noob_master/pelu/frontend && npx tsc --noEmit && bun run build
```

Expected: both PASS.

---

## Task 8: Manual verification in the browser

- [ ] **Step 1: Business branches now render**

Open `/aliados` and select a **business** provider.

Expected: "Empresa verificada" badge, operating hours, and the Instagram link — none of which have ever rendered before Task 1.

- [ ] **Step 2: Logged-out Contactar**

In a private window, open a provider and tap **Contactar**.

Expected: lands on `/auth/login`. Log in, navigate back to `/aliados`, tap again — this time it opens the chat.

- [ ] **Step 3: Contact round trip**

As a member, tap **Contactar** on an active provider.

Expected: button shows the pending label, then `/chat` opens **with that conversation selected**. Send "Hola"; reload and confirm it persisted. Check the provider's account — the conversation is listed with an unread badge (member-owned providers use `/chat`; business providers use the dashboard ChatTab).

- [ ] **Step 4: Idempotency**

Go back to `/aliados` and tap **Contactar** on the same provider again.

Expected: the **same** conversation, no duplicate in either account's list.

- [ ] **Step 5: Own listing**

Log in as the provider's owner and view their own public listing.

Expected: no Contactar button.

- [ ] **Step 6: Offline notification is clickable**

With the provider's account logged out, send them a message. Log back in.

Expected: a notification whose body does **not** say "de adopción", and clicking it opens the conversation.

- [ ] **Step 7: Regressions**

- The attach `+` menu still appears in an adoption conversation with a pet, and not in a service one.
- Transport system messages still broadcast (backend Task 4 touched that path).
- The chat list rows still show names correctly after the Task 3 interface change.

---

## Dependency summary

| Task | Needs |
|---|---|
| 1 | nothing — pure frontend bug fix |
| 2, 4 | API Tasks 1–3 (`POST /conversations`) |
| 3 | nothing — type sync against what the API already sends |
| 5, 6 | Task 3 (the `type` field) |
| 7 | all frontend tasks |
| 8 | everything, deployed, plus API Tasks 4–5 for step 6 |
