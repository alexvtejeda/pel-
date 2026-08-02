# Member Adoption Listings — Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn "Publicar mascota" into a real adoption listing — published member pets appear in `/pets` attributed to the member (name, phone, email) with no verified badge and a chat button, and `/mis-mascotas` becomes the place to manage them.

**Architecture:** The public `Pet` payload gains an optional `owner` block; exactly one of `owner` / `rescue_center` is ever set. The verified badge and publisher avatar are **already** gated on `pet.rescue_center` in all three surfaces, so the work is adding the owner branch beside those guards, not adding defenses. Visibility is driven by `adoption_status` on `user_pets`, which the publish modal sets and `/mis-mascotas` toggles.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind v4, Bun, Vitest + React Testing Library, react-i18next, Font Awesome, Sonner.

**Spec:** `../../../../docs/superpowers/specs/2026-08-01-member-adoption-listings-design.md` (at the `pelu/` root — this feature spans both repos).

---

## Before you start

**Repo:** all work happens in `/home/noob_master/pelu/frontend`. Commit **inside this repo** — use `git -C /home/noob_master/pelu/frontend` for every git write. A bare `cd` can leak commits into the parent `/home/noob_master` repo, which tracks something unrelated.

**Backend must land first.** This plan consumes the contract from `../../../../api/docs/superpowers/plans/2026-08-01-member-adoption-listings-api.md`. Verify it is live before starting Task 2:

```bash
curl -s http://localhost:2701/api/v1/pets | head -5
```

Tasks 1 and 5 (types, chat routing) need no live API; everything else does.

**Tests:** there is **no `test` npm script**.

```bash
cd /home/noob_master/pelu/frontend && npx vitest run                        # all
cd /home/noob_master/pelu/frontend && npx vitest run components/__tests__/pets/pet-detail.test.tsx   # one file
```

Use `renderWithProviders()` from `components/__tests__/test-utils.tsx`, never raw `render()` — it wraps i18n and mocks `next/navigation` + `next/image`.

**Known flake:** the about-scenes smoke test is flaky in full runs and passes alone. If it fails, re-run that file by itself before assuming you broke it.

**Dev server:** assume `bun run dev` is already running on port 3000. Do not start it.

**Package manager is Bun** (`bun install`, `bun run`) — but `npx vitest` for tests.

---

## Conventions this plan follows

Non-negotiable in this codebase — a reviewer will send it back otherwise:

- **Font Awesome only.** Never lucide-react, never inline SVG, outside `components/ui/`.
- **Icon sizing with `text-*`**, never `w-*`/`h-*`.
- **`rounded-2xl` for cards, `rounded-xl` for buttons/inputs.** No other radii.
- **API modules return `{ data, error }` and never throw** — except `lib/api/pets.ts`, which throws. That is a known exception; do not "fix" it here.
- **Spanish first**, then English, in `public/locales/{es,en}/`.

---

## File structure

| File | Responsibility | Task |
|---|---|---|
| `lib/api/pets.ts` | `PetOwner` type, `owner` on `Pet` | 1 |
| `lib/api/user-pets.ts` | `adoption_status` on `UserPet` + payloads | 1 |
| `lib/types/user.ts` | `phone` on `AuthUser` | 1 |
| `lib/api/chat.ts` | `createConversation({ pet_id })` | 2 |
| `lib/api/auth.ts` (or inline) | profile PATCH with phone | 5 |
| `components/pets/pet-owner-card.tsx` | **new** — owner identity + contacts, shared by detail surfaces | 3 |
| `components/pets/pet-detail.tsx` | owner card + chat CTA fork | 3, 4 |
| `components/pets/pet-grid.tsx` | owner avatar/name in the overlay | 3 |
| `components/pets/pet-feed-card.tsx` | owner publisher row | 3 |
| `components/chat/chat-page.tsx` | read `?conversation_id=` | 5 |
| `components/chat/chat-conversation-list.tsx` | `autoSelectId` prop | 5 |
| `components/pets/member-add-pet-modal.tsx` | publish + phone field | 6 |
| `app/mis-mascotas/page.tsx` | status chips + publish/retire actions | 7 |
| `components/pets/user-pet-card.tsx` | optional status chip slot | 7 |
| `public/locales/{es,en}/pets.json` | new copy | 3–7 |

`pet-owner-card.tsx` is a new file rather than more branches inside `pet-detail.tsx` (already 310 lines): the owner block is a self-contained unit with its own contact rows, and giving it a file keeps the detail panel readable.

---

## Task 1: Types for the new contract

Pure type changes — no behaviour. Landing them first means every later task type-checks as it goes.

**Files:**
- Modify: `lib/api/pets.ts:11-38`
- Modify: `lib/api/user-pets.ts:5-18`
- Modify: `lib/types/user.ts:4-14`

- [ ] **Step 1: Add `PetOwner` and `owner` to the Pet type**

In `lib/api/pets.ts`, add after the `PetRescueCenter` interface:

```ts
/**
 * Publisher block for a member-published adoption listing — the counterpart of
 * `PetRescueCenter`. Exactly one of `owner` / `rescue_center` is set on a pet:
 * a listing belongs either to a verified centre or to a person.
 *
 * `display_name` is nullable in the database, and a Google sign-up can skip the
 * onboarding wizard that sets it — never render it without a fallback.
 */
export interface PetOwner {
  id: string
  display_name?: string | null
  email: string
  phone?: string | null
  avatar_url?: string | null
}
```

Then add the field to `Pet`, beside `rescue_center`:

```ts
  rescue_center?: PetRescueCenter
  owner?: PetOwner
```

And loosen the three fields member listings do not carry:

```ts
  rescue_center_id?: string
  short_slug?: string
  condition_notes: string | null
```

- [ ] **Step 2: Add `adoption_status` to UserPet**

In `lib/api/user-pets.ts`, add to the `UserPet` interface after `castrated`:

```ts
  castrated?: boolean
  /**
   * Public visibility of this pet. `undefined`/`null` means private — the
   * onboarding wizard and the transport picker write rows that must never
   * reach the public feed. Only `'available'` is listed.
   */
  adoption_status?: 'available' | 'adopted' | null
```

Because `createUserPets` takes `Omit<UserPet, 'id' | 'user_id' | 'created_at'>[]` and `updateUserPet` takes a `Partial<...>` of the same, both payloads pick the field up with no further change. Verify by reading their signatures — if either lists fields explicitly, add it there too.

- [ ] **Step 3: Add `phone` to AuthUser**

In `lib/types/user.ts`, add to `AuthUser`:

```ts
  display_name: string | null
  phone: string | null
  avatar_url: string | null
```

- [ ] **Step 4: Type-check**

```bash
cd /home/noob_master/pelu/frontend && npx tsc --noEmit
```

Expected: PASS. If `rescue_center_id` or `short_slug` becoming optional breaks a call site, that call site was assuming a field member listings lack — fix it by guarding, not by reverting the type.

- [ ] **Step 5: Commit**

```bash
git -C /home/noob_master/pelu/frontend add lib/api/pets.ts lib/api/user-pets.ts lib/types/user.ts
git -C /home/noob_master/pelu/frontend commit -m "feat(types): add owner, adoption_status and phone to the API types"
```

---

## Task 2: `createConversation` API function

> **⚠️ Superseded — check first.** The aliados plan
> (`2026-08-01-aliados-contactar-chat-frontend.md`, its Task 2) **owns** this
> function and builds it with both branches. Run:
>
> ```bash
> grep -n "createConversation" /home/noob_master/pelu/frontend/lib/api/chat.ts
> ```
>
> If it exists, **skip this task entirely** — it already accepts `{ pet_id }`.
> Only build it here if aliados has not landed, and use the object signature
> below so the two plans converge rather than conflict.

**Files:**
- Modify: `lib/api/chat.ts`
- Test: `lib/api/__tests__/chat.test.ts`

- [ ] **Step 1: Write the failing test**

Create `lib/api/__tests__/chat.test.ts` (or append if it exists):

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const apiClient = vi.fn()
vi.mock('@/lib/api/client', () => ({ apiClient: (...args: unknown[]) => apiClient(...args) }))

import { createConversation } from '@/lib/api/chat'

describe('createConversation', () => {
  beforeEach(() => apiClient.mockReset())

  it('posts the pet id and returns the conversation', async () => {
    apiClient.mockResolvedValue({ ok: true, json: async () => ({ id: 'c1' }) })

    const { data, error } = await createConversation({ pet_id: 'p1' })

    expect(error).toBeNull()
    expect(data).toEqual({ id: 'c1' })
    const [path, options] = apiClient.mock.calls[0]
    expect(path).toBe('/api/v1/conversations')
    expect(options.method).toBe('POST')
    expect(JSON.parse(options.body)).toEqual({ pet_id: 'p1' })
  })

  it('returns the API error message instead of throwing', async () => {
    apiClient.mockResolvedValue({ ok: false, json: async () => ({ error: 'listing not found' }) })

    const { data, error } = await createConversation({ pet_id: 'gone' })

    expect(data).toBeNull()
    expect(error).toBe('listing not found')
  })

  it('returns a connection error when the request throws', async () => {
    apiClient.mockRejectedValue(new Error('network down'))

    const { data, error } = await createConversation({ pet_id: 'p1' })

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
 *
 * `provider_id` is the aliados "Contactar" branch, sharing this one endpoint.
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

Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git -C /home/noob_master/pelu/frontend add lib/api/chat.ts lib/api/__tests__/chat.test.ts
git -C /home/noob_master/pelu/frontend commit -m "feat(chat): add createConversation for adoption listings"
```

---

## Task 3: Owner identity on the three public surfaces

The badge and avatar guards already exist (`pet-grid.tsx:139,169`, `pet-feed-card.tsx:39`, `pet-detail.tsx:206`). This task adds the **positive** owner branch beside them.

**Files:**
- Create: `components/pets/pet-owner-card.tsx`
- Modify: `components/pets/pet-detail.tsx:206-278`
- Modify: `components/pets/pet-grid.tsx:136-152`
- Modify: `components/pets/pet-feed-card.tsx:39-61`
- Test: `components/__tests__/pets/pet-owner-card.test.tsx`, and the three existing card tests

- [ ] **Step 1: Write the failing test for the owner card**

Create `components/__tests__/pets/pet-owner-card.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../test-utils'
import { PetOwnerCard } from '@/components/pets/pet-owner-card'

const owner = (overrides: Record<string, unknown> = {}) =>
  ({ id: 'u1', display_name: 'María', email: 'maria@example.com', phone: '809-555-0134', ...overrides }) as never

describe('PetOwnerCard', () => {
  // The badge means "verified rescue centre". A private person publishing a pet
  // has not been verified by anyone, so rendering it here would be a lie.
  it('never renders the verified badge', () => {
    const { container } = renderWithProviders(<PetOwnerCard owner={owner()} />)
    expect(container.querySelector('[role="img"]')).toBeNull()
  })

  it('links the phone and email as real controls', () => {
    renderWithProviders(<PetOwnerCard owner={owner()} />)
    expect(screen.getByRole('link', { name: /809-555-0134/ })).toHaveAttribute('href', 'tel:809-555-0134')
    expect(screen.getByRole('link', { name: /maria@example.com/ })).toHaveAttribute('href', 'mailto:maria@example.com')
  })

  it('omits the phone row when the owner has no phone', () => {
    renderWithProviders(<PetOwnerCard owner={owner({ phone: null })} />)
    expect(screen.queryByRole('link', { name: /tel:/ })).toBeNull()
    expect(screen.getByRole('link', { name: /maria@example.com/ })).toBeInTheDocument()
  })

  // display_name is nullable and a Google sign-up can skip the wizard that sets
  // it. A blank attribution line is worse than a derived one.
  it('falls back to the email local part when there is no display name', () => {
    renderWithProviders(<PetOwnerCard owner={owner({ display_name: null })} />)
    expect(screen.getByText('maria')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

```bash
cd /home/noob_master/pelu/frontend && npx vitest run components/__tests__/pets/pet-owner-card.test.tsx
```

Expected: FAIL — cannot resolve `@/components/pets/pet-owner-card`.

- [ ] **Step 3: Add the display-name helper**

Append to `lib/utils.ts`:

```ts
/**
 * The name to show for a member-published listing. `display_name` is nullable
 * (a Google sign-up can skip the onboarding wizard that sets it), and a blank
 * attribution line reads as a broken card — so fall back to the email's local
 * part rather than showing nothing or the full address.
 */
export function ownerDisplayName(owner: { display_name?: string | null; email: string }): string {
  const name = owner.display_name?.trim()
  if (name) return name
  return owner.email.split('@')[0]
}
```

- [ ] **Step 4: Create the owner card**

Create `components/pets/pet-owner-card.tsx`:

```tsx
'use client'

import Image from 'next/image'
import { useTranslation } from 'react-i18next'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faUser, faPhone, faEnvelope } from '@fortawesome/free-solid-svg-icons'
import { PetOwner } from '@/lib/api/pets'
import { ownerDisplayName } from '@/lib/utils'

interface PetOwnerCardProps {
  owner: PetOwner
}

/**
 * Publisher block for a member-published listing — the counterpart of the
 * rescue-centre card in `pet-detail.tsx`, sharing its geometry so the two read
 * as one system.
 *
 * Deliberately has **no** VerifiedBadge: that mark means "verified rescue
 * centre", and nobody has verified a private person.
 *
 * Phone and email are controls with their own hit areas, not 14px anchors
 * crowding the name — the same reasoning as the centre card's link row.
 */
export function PetOwnerCard({ owner }: PetOwnerCardProps) {
  const { t } = useTranslation('pets')
  const name = ownerDisplayName(owner)

  return (
    <div className="rounded-2xl border border-border bg-muted p-3">
      <div className="flex items-start gap-3">
        {owner.avatar_url ? (
          <Image
            src={owner.avatar_url}
            alt=""
            width={56}
            height={56}
            className="h-14 w-14 shrink-0 rounded-xl border border-border bg-background object-cover"
          />
        ) : (
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-border bg-background">
            <FontAwesomeIcon icon={faUser} className="text-base text-muted-foreground" />
          </span>
        )}

        <div className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-semibold">{name}</span>
          <p className="mt-0.5 text-[11.5px] uppercase tracking-wide text-muted-foreground">
            {t('detail.published_by_member')}
          </p>
        </div>
      </div>

      <div className="mt-3.5 flex flex-col gap-2">
        {owner.phone && (
          <a
            href={`tel:${owner.phone}`}
            className="focus-ring flex h-[38px] items-center justify-center gap-2 rounded-xl border border-border bg-background text-sm font-medium transition-colors hover:bg-secondary"
          >
            <FontAwesomeIcon icon={faPhone} className="text-sm" />
            {owner.phone}
          </a>
        )}
        <a
          href={`mailto:${owner.email}`}
          className="focus-ring flex h-[38px] items-center justify-center gap-2 rounded-xl border border-border bg-background text-sm font-medium transition-colors hover:bg-secondary"
        >
          <FontAwesomeIcon icon={faEnvelope} className="text-sm" />
          <span className="truncate">{owner.email}</span>
        </a>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Add the i18n key this needs**

In `public/locales/es/pets.json`, inside the `detail` object:

```json
    "published_by_member": "Publicado por un miembro",
```

In `public/locales/en/pets.json`, same place:

```json
    "published_by_member": "Published by a member",
```

- [ ] **Step 6: Run the owner-card test**

```bash
cd /home/noob_master/pelu/frontend && npx vitest run components/__tests__/pets/pet-owner-card.test.tsx
```

Expected: PASS, 4 tests.

- [ ] **Step 7: Write the failing test for the grid and feed surfaces**

Append to `components/__tests__/pets/pet-grid-card.test.tsx`:

```tsx
describe('PetGrid member listings', () => {
  it('shows the owner name and no verified badge', () => {
    const memberPet = {
      id: 'p9', name: 'Luna', age: 12, gender: 'female', species: 'dog',
      status: 'available', photos: [], conditions: [], condition_notes: null,
      vaccinated: true, castrated: false,
      owner: { id: 'u1', display_name: 'María', email: 'maria@example.com' },
    }

    renderWithProviders(<PetGrid pets={[memberPet] as never} onSelect={() => {}} />)

    expect(screen.getByText('María')).toBeInTheDocument()
    expect(screen.queryByLabelText(/verificad/i)).toBeNull()
  })
})
```

Match the existing file's imports and the real `PetGrid` props — read the top of `components/__tests__/pets/pet-grid-card.test.tsx` and mirror how it already renders the grid. Add the equivalent block to `pet-feed-card.test.tsx` for `PetFeedCard`.

- [ ] **Step 8: Run to verify it fails**

```bash
cd /home/noob_master/pelu/frontend && npx vitest run components/__tests__/pets/pet-grid-card.test.tsx components/__tests__/pets/pet-feed-card.test.tsx
```

Expected: FAIL — "María" is not rendered.

- [ ] **Step 9: Render the owner in the grid overlay**

In `components/pets/pet-grid.tsx`, replace the avatar guard at line 139:

```tsx
                      {pet.rescue_center?.avatar_url && (
                        <Image
                          src={pet.rescue_center.avatar_url}
                          alt=""
                          width={30}
                          height={30}
                          className="h-[30px] w-[30px] shrink-0 rounded-full border-[1.5px] border-white/90 object-cover"
                        />
                      )}
```

with:

```tsx
                      {pet.rescue_center?.avatar_url ? (
                        <Image
                          src={pet.rescue_center.avatar_url}
                          alt=""
                          width={30}
                          height={30}
                          className="h-[30px] w-[30px] shrink-0 rounded-full border-[1.5px] border-white/90 object-cover"
                        />
                      ) : pet.owner?.avatar_url ? (
                        <Image
                          src={pet.owner.avatar_url}
                          alt=""
                          width={30}
                          height={30}
                          className="h-[30px] w-[30px] shrink-0 rounded-full border-[1.5px] border-white/90 object-cover"
                        />
                      ) : null}
```

Then, inside the same overlay `<span>` that carries the name and meta line, add the owner's name below the meta line so the listing is attributed:

```tsx
                        <span className="block truncate text-[11px] text-background/80">
                          {t(`detail.${age.unit}`, { count: age.count })}
                          {' · '}
                          {t(`gender.${pet.gender}`)}
                        </span>
                        {/* Attribution for member listings. Centre pets carry
                            the verified badge top-right instead. */}
                        {pet.owner && (
                          <span className="block truncate text-[11px] text-background/80">
                            {ownerDisplayName(pet.owner)}
                          </span>
                        )}
```

Import the helper: `import { instagramUrl, ensureUrl, ownerDisplayName } from '@/lib/utils'` (extend the existing import).

The badge block at line 169 already reads `{pet.rescue_center && (...)}` — leave it exactly as is. That is what keeps member listings unbadged.

- [ ] **Step 10: Render the owner in the feed card**

In `components/pets/pet-feed-card.tsx`, after the `publisher` const (line 47), add:

```tsx
  // Member listings get the same publisher row without the badge and without
  // the links dropdown — a private person has no website or Instagram on file.
  const ownerPublisher = pet.owner && (
    <>
      {pet.owner.avatar_url ? (
        <Image
          src={pet.owner.avatar_url}
          alt=""
          width={26}
          height={26}
          className="h-[26px] w-[26px] shrink-0 rounded-full object-cover"
        />
      ) : (
        <span className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full bg-secondary">
          <FontAwesomeIcon icon={faUser} className="text-[11px] text-muted-foreground" />
        </span>
      )}
      <span className="truncate text-[13px] font-semibold">{ownerDisplayName(pet.owner)}</span>
    </>
  )
```

Then, immediately after the existing `{rc && (...)}` publisher block, add:

```tsx
      {ownerPublisher && (
        <div className="flex min-h-11 items-center gap-2 px-3 py-2.5">{ownerPublisher}</div>
      )}
```

Add `faUser` to the `@fortawesome/free-solid-svg-icons` import and `ownerDisplayName` to the `@/lib/utils` import.

- [ ] **Step 11: Run the tests**

```bash
cd /home/noob_master/pelu/frontend && npx vitest run components/__tests__/pets/
```

Expected: PASS across the pets test directory.

- [ ] **Step 12: Commit**

```bash
git -C /home/noob_master/pelu/frontend add components/pets/pet-owner-card.tsx components/pets/pet-grid.tsx components/pets/pet-feed-card.tsx lib/utils.ts public/locales components/__tests__/pets/
git -C /home/noob_master/pelu/frontend commit -m "feat(pets): attribute member listings to their owner without a verified badge"
```

---

## Task 4: Detail panel — owner card and chat CTA

**Files:**
- Modify: `components/pets/pet-detail.tsx:206-307`
- Test: `components/__tests__/pets/pet-detail.test.tsx`

- [ ] **Step 1: Write the failing test**

Append to `components/__tests__/pets/pet-detail.test.tsx`. Note the existing file mocks `useAuth` to a null user at module scope — override per test with `vi.mocked`, or add a second describe with its own mock module; the version below assumes you hoist a mutable user:

```tsx
describe('PetDetail member listings', () => {
  const memberPet = () =>
    pet({
      rescue_center: undefined,
      owner: { id: 'u1', display_name: 'María', email: 'maria@example.com', phone: '809-555-0134' },
    })

  it('shows the owner contacts and no verified badge', () => {
    renderWithProviders(<PetDetail pet={memberPet()} />)

    expect(screen.getByText('María')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /809-555-0134/ })).toHaveAttribute('href', 'tel:809-555-0134')
    expect(screen.queryByLabelText(/verificad/i)).toBeNull()
  })

  it('offers chat instead of the adoption form for a logged-in member', () => {
    // The adoption form belongs to rescue centres; a member listing has none,
    // so routing to /adopt would land on a form that cannot exist.
    renderWithProviders(<PetDetail pet={memberPet()} />)

    expect(screen.queryByRole('button', { name: /adoptar/i })).toBeNull()
  })
})
```

For the logged-in cases, change the `useAuth` mock at the top of the file to read from a mutable variable so individual tests can set it:

```tsx
let mockUser: { id: string; role: string } | null = null
vi.mock('@/lib/contexts/auth-context', () => ({
  useAuth: () => ({ user: mockUser, loading: false }),
}))
```

Then set `mockUser = { id: 'u2', role: 'member' }` inside the tests that need it and reset it in `beforeEach`. Update the existing tests in the file if they relied on the old constant mock — they expect `user: null`, which is the default.

Add the chat-CTA cases:

```tsx
  it('starts a conversation and navigates to chat', async () => {
    mockUser = { id: 'u2', role: 'member' }
    createConversation.mockResolvedValue({ data: { id: 'c1' }, error: null })

    renderWithProviders(<PetDetail pet={memberPet()} />)
    fireEvent.click(screen.getByRole('button', { name: /chatear/i }))

    await waitFor(() => expect(createConversation).toHaveBeenCalledWith({ pet_id: 'p1' }))
    await waitFor(() => expect(push).toHaveBeenCalledWith('/chat?conversation_id=c1'))
  })

  it('hides the chat button on your own listing', () => {
    mockUser = { id: 'u1', role: 'member' }   // same id as the owner

    renderWithProviders(<PetDetail pet={memberPet()} />)

    expect(screen.queryByRole('button', { name: /chatear/i })).toBeNull()
  })
```

with these mocks at the top of the file:

```tsx
const createConversation = vi.fn()
vi.mock('@/lib/api/chat', () => ({ createConversation: (...a: unknown[]) => createConversation(...a) }))

const push = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace: vi.fn(), back: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}))
```

The local `next/navigation` mock overrides `test-utils`' one for this file, which is what lets you assert on `push`. Import `fireEvent` and `waitFor` from `@testing-library/react`.

- [ ] **Step 2: Run to verify it fails**

```bash
cd /home/noob_master/pelu/frontend && npx vitest run components/__tests__/pets/pet-detail.test.tsx
```

Expected: FAIL — no owner block, no chat button.

- [ ] **Step 3: Render the owner card**

In `components/pets/pet-detail.tsx`, immediately after the closing `)}` of the `{pet.rescue_center && (...)}` block (ends line 278), add:

```tsx
        {/* A listing has either a centre or an owner, never both. */}
        {pet.owner && <PetOwnerCard owner={pet.owner} />}
```

Add the import: `import { PetOwnerCard } from './pet-owner-card'`.

- [ ] **Step 4: Add the chat handler**

Inside the `PetDetail` component, after `handleAdopt` (line 104):

```tsx
  const [startingChat, setStartingChat] = useState(false)

  const handleChat = async () => {
    if (startingChat || !pet.owner) return
    setStartingChat(true)
    const { data, error } = await createConversation({ pet_id: pet.id })
    if (error || !data) {
      toast.error(error || t('detail.chat_error'))
      setStartingChat(false)
      return
    }
    router.push(`/chat?conversation_id=${data.id}`)
  }
```

Add imports: `useRouter` from `next/navigation`, `toast` from `sonner`, `createConversation` from `@/lib/api/chat`; and `const router = useRouter()` beside the existing hooks.

- [ ] **Step 5: Fork the CTA**

Replace the CTA block at `pet-detail.tsx:283-297`:

```tsx
        {user && user.role !== 'rescue_center' && user.role !== 'business' ? (
          <button
            onClick={handleAdopt}
            className="focus-ring w-full py-2.5 bg-pop-solid text-white font-semibold rounded-xl hover:bg-pop-850 transition-[background-color,transform] active:scale-[0.98]"
          >
            {t('detail.adopt')}
          </button>
        ) : !user ? (
```

with:

```tsx
        {/* Member listings have no adoption form — forms belong to rescue
            centres — so chat is the whole funnel here. Your own listing gets
            no button at all. */}
        {user && pet.owner && user.id !== pet.owner.id ? (
          <button
            onClick={handleChat}
            disabled={startingChat}
            className="focus-ring w-full py-2.5 bg-pop-solid text-white font-semibold rounded-xl hover:bg-pop-850 transition-[background-color,transform] active:scale-[0.98] disabled:opacity-60"
          >
            {startingChat
              ? t('detail.chat_starting')
              : t('detail.chat_with', { name: ownerDisplayName(pet.owner) })}
          </button>
        ) : user && pet.owner ? null : user && user.role !== 'rescue_center' && user.role !== 'business' ? (
          <button
            onClick={handleAdopt}
            className="focus-ring w-full py-2.5 bg-pop-solid text-white font-semibold rounded-xl hover:bg-pop-850 transition-[background-color,transform] active:scale-[0.98]"
          >
            {t('detail.adopt')}
          </button>
        ) : !user ? (
```

Leave the `!user` login-prompt branch and the share button below it untouched — the share button is already gated on `pet.short_slug`, which member listings lack, so it self-hides.

Add `ownerDisplayName` to the `@/lib/utils` import.

- [ ] **Step 6: Add the i18n keys**

`public/locales/es/pets.json`, in `detail`:

```json
    "chat_with": "Chatear con {{name}}",
    "chat_starting": "Abriendo chat...",
    "chat_error": "No pudimos iniciar la conversación",
```

`public/locales/en/pets.json`, in `detail`:

```json
    "chat_with": "Chat with {{name}}",
    "chat_starting": "Opening chat...",
    "chat_error": "We couldn't start the conversation",
```

- [ ] **Step 7: Run the tests**

```bash
cd /home/noob_master/pelu/frontend && npx vitest run components/__tests__/pets/pet-detail.test.tsx
```

Expected: PASS — including the pre-existing layout and facts tests in that file.

- [ ] **Step 8: Commit**

```bash
git -C /home/noob_master/pelu/frontend add components/pets/pet-detail.tsx public/locales components/__tests__/pets/pet-detail.test.tsx
git -C /home/noob_master/pelu/frontend commit -m "feat(pets): show the owner card and a chat CTA on member listings"
```

---

## Task 5: `/chat?conversation_id=` deep link

> **⚠️ Superseded — check first.** The aliados plan
> (`2026-08-01-aliados-contactar-chat-frontend.md`, its Task 5) **owns** this.
> Run:
>
> ```bash
> grep -n "autoSelectId" /home/noob_master/pelu/frontend/components/chat/chat-conversation-list.tsx
> ```
>
> If it exists, **skip this task entirely.** Build it here only if aliados has
> not landed — the implementation below is identical.

Task 4 navigates to `/chat?conversation_id=<id>`, but `components/chat/chat-page.tsx` only handles `?welcome=1` today — without this, the chat button lands the user on the chat page with **no conversation selected**.

There is no `GET /conversations/{id}` endpoint. Matching against the loaded list is the intended mechanism — do not add a backend route for it.

**Files:**
- Modify: `components/chat/chat-conversation-list.tsx:31-38` (props), plus its load effect
- Modify: `components/chat/chat-page.tsx:13-28`
- Test: `components/__tests__/chat/chat-deep-link.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `components/__tests__/chat/chat-deep-link.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'

const listConversations = vi.fn()
vi.mock('@/lib/api/chat', () => ({ listConversations: () => listConversations() }))
vi.mock('@/lib/contexts/websocket-context', () => ({
  useWebSocket: () => ({ subscribe: () => () => {} }),
}))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => '/chat',
  useSearchParams: () => new URLSearchParams('conversation_id=c2'),
}))

import { renderWithProviders } from '../test-utils'
import { ChatPage } from '@/components/chat/chat-page'

describe('chat deep link', () => {
  beforeEach(() => listConversations.mockReset())

  it('opens the conversation named in the URL', async () => {
    listConversations.mockResolvedValue({
      data: [
        { id: 'c1', other_user_name: 'Ana', unread_count: 0, created_at: '2026-01-01T00:00:00Z' },
        { id: 'c2', other_user_name: 'María', unread_count: 0, created_at: '2026-01-02T00:00:00Z' },
      ],
      error: null,
    })

    renderWithProviders(<ChatPage />)

    // The thread header shows the selected conversation's counterpart.
    await waitFor(() =>
      expect(screen.getAllByText('María').length).toBeGreaterThan(1))
  })

  it('ignores an id that is not in the list', async () => {
    listConversations.mockResolvedValue({
      data: [{ id: 'c1', other_user_name: 'Ana', unread_count: 0, created_at: '2026-01-01T00:00:00Z' }],
      error: null,
    })

    renderWithProviders(<ChatPage />)

    await waitFor(() => expect(screen.getByText('Ana')).toBeInTheDocument())
    // No thread opened — the empty-state icon is still the right panel's content.
    expect(screen.queryByRole('textbox')).toBeNull()
  })
})
```

`ChatMessageThread` fetches messages on mount; if the first test trips over that, add `vi.mock('@/lib/api/chat', ...)` entries for `listMessages` returning `{ data: [], error: null }` in the same factory.

- [ ] **Step 2: Run to verify it fails**

```bash
cd /home/noob_master/pelu/frontend && npx vitest run components/__tests__/chat/chat-deep-link.test.tsx
```

Expected: FAIL — no conversation is auto-selected.

- [ ] **Step 3: Let the list auto-select once**

In `components/chat/chat-conversation-list.tsx`, add to `ChatConversationListProps`:

```ts
  /**
   * Conversation to open once, as soon as the list has loaded — backs the
   * `/chat?conversation_id=` deep link. Fires at most once per mount: the user
   * must stay free to navigate away afterwards.
   */
  autoSelectId?: string
```

Destructure it in the signature, and after the conversations state is populated, add:

```tsx
  const autoSelectedRef = useRef(false)

  useEffect(() => {
    if (!autoSelectId || autoSelectedRef.current || conversations.length === 0) return
    const match = conversations.find((c) => c.id === autoSelectId)
    // A missing id is not an error: the conversation may have been reaped by the
    // 30-day empty-conversation GC. Drop it silently rather than toasting.
    autoSelectedRef.current = true
    if (match) onSelectConversation(match)
  }, [autoSelectId, conversations, onSelectConversation])
```

`useRef` and `useEffect` are already imported in this file.

- [ ] **Step 4: Read the param in the page**

In `components/chat/chat-page.tsx`, after the `welcome` effect, add:

```tsx
  const deepLinkId = searchParams?.get('conversation_id') ?? undefined
```

and pass it down:

```tsx
            <ChatConversationList onSelectConversation={setActive} autoSelectId={deepLinkId} />
```

Do **not** `router.replace` the param away like the `welcome` one does — the id is harmless in the URL, and stripping it races the list's load.

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

## Task 6: Publish modal — `adoption_status` and the phone field

Per the spec §2.3 there is **no member profile settings page**, so this modal is the only place a member can set a phone. It must therefore write through to the profile, not store the phone on the pet.

**Files:**
- Modify: `components/pets/member-add-pet-modal.tsx:52-215`
- Test: `components/__tests__/pets/member-add-pet-modal.test.tsx`

- [ ] **Step 1: Write the failing test**

Append to `components/__tests__/pets/member-add-pet-modal.test.tsx`:

```tsx
describe('MemberAddPetModal publishing', () => {
  it('publishes the pet as available', async () => {
    createUserPets.mockResolvedValue({ data: [{ id: 'p1' }], error: null })

    renderWithProviders(<MemberAddPetModal open onClose={() => {}} />)
    fireEvent.change(screen.getByPlaceholderText('ej. Luna'), { target: { value: 'Luna' } })
    fireEvent.change(screen.getByPlaceholderText('ej. 6'), { target: { value: '6' } })
    fireEvent.click(screen.getByRole('button', { name: /publicar mascota/i }))

    await waitFor(() => expect(createUserPets).toHaveBeenCalled())
    expect(createUserPets.mock.calls[0][0][0]).toMatchObject({
      name: 'Luna',
      adoption_status: 'available',
    })
  })

  it('saves the phone to the profile, not to the pet', async () => {
    createUserPets.mockResolvedValue({ data: [{ id: 'p1' }], error: null })

    renderWithProviders(<MemberAddPetModal open onClose={() => {}} />)
    fireEvent.change(screen.getByPlaceholderText('ej. Luna'), { target: { value: 'Luna' } })
    fireEvent.change(screen.getByPlaceholderText('ej. 6'), { target: { value: '6' } })
    fireEvent.change(screen.getByLabelText(/teléfono/i), { target: { value: '809-555-0134' } })
    fireEvent.click(screen.getByRole('button', { name: /publicar mascota/i }))

    await waitFor(() => expect(apiClient).toHaveBeenCalled())
    const [path, options] = apiClient.mock.calls.find(([p]: [string]) => p === '/api/v1/auth/profile')
    expect(options.method).toBe('PATCH')
    expect(JSON.parse(options.body)).toEqual({ phone: '809-555-0134' })
    expect(createUserPets.mock.calls[0][0][0]).not.toHaveProperty('phone')
  })

  // Editing must not silently re-list a pet the member already marked adopted.
  it('does not change adoption_status when editing', async () => {
    updateUserPet.mockResolvedValue({ data: { id: 'p1' }, error: null })
    const existing = { id: 'p1', name: 'Luna', age: 6, species: 'dog', gender: 'female',
      adoption_status: 'adopted', photos: [] }

    renderWithProviders(<MemberAddPetModal open onClose={() => {}} pet={existing as never} />)
    fireEvent.click(screen.getByRole('button', { name: /guardar cambios/i }))

    await waitFor(() => expect(updateUserPet).toHaveBeenCalled())
    expect(updateUserPet.mock.calls[0][1]).not.toHaveProperty('adoption_status')
  })
})
```

Mock `apiClient` and the auth context alongside the existing mocks in that file:

```tsx
const apiClient = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ user: {} }) })
vi.mock('@/lib/api/client', () => ({ apiClient: (...a: unknown[]) => apiClient(...a) }))
vi.mock('@/lib/contexts/auth-context', () => ({
  useAuth: () => ({ user: { id: 'u1', phone: null }, updateSession: vi.fn() }),
}))
```

Read the top of the existing file first — `createUserPets` / `updateUserPet` are likely already mocked there; reuse those handles instead of redeclaring them.

- [ ] **Step 2: Run to verify it fails**

```bash
cd /home/noob_master/pelu/frontend && npx vitest run components/__tests__/pets/member-add-pet-modal.test.tsx
```

Expected: FAIL — no phone field, no `adoption_status` in the payload.

- [ ] **Step 3: Add phone state prefilled from the profile**

In `components/pets/member-add-pet-modal.tsx`, beside the other `useState` calls (~line 52):

```tsx
  const { user, updateSession } = useAuth()
  const [phone, setPhone] = useState('')
```

and prefill it when the modal opens — add a `useEffect` next to the existing prefill effect (line 81):

```tsx
  // The publish flow is the only place a member can set a phone (there is no
  // profile settings page), so seed it from the session and write it back on
  // save rather than storing it per-listing.
  useEffect(() => {
    if (!open) return
    setPhone(user?.phone ?? '')
  }, [open, user?.phone])
```

Add the import: `import { useAuth } from '@/lib/contexts/auth-context'`.

Add `setPhone('')` to `reset()`.

- [ ] **Step 4: Render the phone field**

Inside the form, after the description field, add:

```tsx
              <div>
                <label htmlFor="member-pet-phone" className="block text-sm font-medium mb-1.5">
                  {t('member.phone_label')}
                </label>
                <input
                  id="member-pet-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder={t('member.phone_placeholder')}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
                />
                <p className="mt-1 text-xs text-muted-foreground">{t('member.phone_hint')}</p>
              </div>
```

Match the surrounding fields' exact class names — read the name/description inputs above and copy their classes rather than trusting the line above verbatim.

- [ ] **Step 5: Write the phone through on submit**

In `handleSubmit`, at the top of the **create** branch (before the `createUserPets` call at line 187):

```tsx
    // Write the phone to the profile first: if this fails the listing should
    // not go live without a contact number on it.
    const trimmedPhone = phone.trim()
    if (trimmedPhone && trimmedPhone !== (user?.phone ?? '')) {
      const res = await apiClient('/api/v1/auth/profile', {
        method: 'PATCH',
        body: JSON.stringify({ phone: trimmedPhone }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error || t('member.error_phone'))
        setSaving(false)
        return
      }
      if (json.user) updateSession(json.user)
    }
```

Add the import: `import { apiClient } from '@/lib/api/client'`.

Then add the status to the create payload:

```tsx
    const { data, error: createError } = await createUserPets([{
      name: name.trim(),
      age: ageInMonths,
      species,
      gender,
      description: description.trim() || undefined,
      size,
      vaccinated,
      castrated,
      adoption_status: 'available',
    }])
```

Leave the **edit** branch's `updateUserPet` call alone — omitting `adoption_status` is what stops an edit from re-listing an adopted pet.

- [ ] **Step 6: Add the i18n keys**

`public/locales/es/pets.json`, in `member`:

```json
    "phone_label": "Teléfono de contacto",
    "phone_placeholder": "ej. 809-555-0134",
    "phone_hint": "Se mostrará en tu publicación para que puedan contactarte.",
    "error_phone": "No pudimos guardar tu teléfono",
    "publish_notice": "Tu mascota aparecerá públicamente en Pelú con tu nombre y datos de contacto.",
```

`public/locales/en/pets.json`, in `member`:

```json
    "phone_label": "Contact phone",
    "phone_placeholder": "e.g. 809-555-0134",
    "phone_hint": "Shown on your listing so people can reach you.",
    "error_phone": "We couldn't save your phone number",
    "publish_notice": "Your pet will appear publicly on Pelú with your name and contact details.",
```

- [ ] **Step 7: Show the publish notice**

The modal now has public consequences and must say so before the button is pressed. Above the submit button, when **not** editing:

```tsx
              {!isEdit && (
                <p className="text-xs text-muted-foreground">{t('member.publish_notice')}</p>
              )}
```

- [ ] **Step 8: Run the tests**

```bash
cd /home/noob_master/pelu/frontend && npx vitest run components/__tests__/pets/member-add-pet-modal.test.tsx
```

Expected: PASS, including the file's pre-existing tests.

- [ ] **Step 9: Commit**

```bash
git -C /home/noob_master/pelu/frontend add components/pets/member-add-pet-modal.tsx public/locales components/__tests__/pets/member-add-pet-modal.test.tsx
git -C /home/noob_master/pelu/frontend commit -m "feat(pets): publish member pets for adoption and capture a contact phone"
```

---

## Task 7: `/mis-mascotas` — status chips and publish/retire actions

**Files:**
- Modify: `components/pets/user-pet-card.tsx:55-70`
- Modify: `app/mis-mascotas/page.tsx`
- Test: `components/__tests__/pets/mis-mascotas-page.test.tsx`

- [ ] **Step 1: Write the failing test**

Append to `components/__tests__/pets/mis-mascotas-page.test.tsx`:

```tsx
describe('MisMascotas listing management', () => {
  it('marks published pets and offers to retire them', async () => {
    listUserPets.mockResolvedValue({
      data: [{ id: 'p1', name: 'Luna', age: 12, species: 'dog', gender: 'female',
               adoption_status: 'available', photos: [] }],
      error: null,
    })

    renderWithProviders(<MisMascotasPage />)

    expect(await screen.findByText('En adopción')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /marcar como adoptada/i })).toBeInTheDocument()
  })

  it('offers to publish a private pet', async () => {
    listUserPets.mockResolvedValue({
      data: [{ id: 'p2', name: 'Rex', age: 12, species: 'dog', gender: 'male', photos: [] }],
      error: null,
    })

    renderWithProviders(<MisMascotasPage />)

    await screen.findByText('Rex')
    expect(screen.queryByText('En adopción')).toBeNull()
    expect(screen.getByRole('button', { name: /publicar en adopción/i })).toBeInTheDocument()
  })

  it('retires a listing via PATCH', async () => {
    listUserPets.mockResolvedValue({
      data: [{ id: 'p1', name: 'Luna', age: 12, species: 'dog', gender: 'female',
               adoption_status: 'available', photos: [] }],
      error: null,
    })
    updateUserPet.mockResolvedValue({ data: { id: 'p1' }, error: null })

    renderWithProviders(<MisMascotasPage />)
    fireEvent.click(await screen.findByRole('button', { name: /marcar como adoptada/i }))

    await waitFor(() =>
      expect(updateUserPet).toHaveBeenCalledWith('p1', { adoption_status: 'adopted' }))
  })
})
```

Reuse the file's existing mock handles for `listUserPets` / `deleteUserPet` and add `updateUserPet` to that same `vi.mock` factory.

- [ ] **Step 2: Run to verify it fails**

```bash
cd /home/noob_master/pelu/frontend && npx vitest run components/__tests__/pets/mis-mascotas-page.test.tsx
```

Expected: FAIL — no chip, no action buttons.

- [ ] **Step 3: Add a badge slot to the card**

In `components/pets/user-pet-card.tsx`, add to `UserPetCardProps`:

```ts
  /** Optional top-left overlay (e.g. the "En adopción" chip on /mis-mascotas). */
  badge?: React.ReactNode
```

Destructure it in the signature, and render it inside the photo container beside the existing `actions` block:

```tsx
        {badge && (
          <div className="absolute top-2 left-2 z-10">{badge}</div>
        )}
        {actions && (
          <div className="absolute top-2 right-2 z-10 flex gap-1.5">{actions}</div>
        )}
```

Top-left, mirroring the public grid's condition badge — the right side is already the actions column.

- [ ] **Step 4: Add the status toggle to the page**

In `app/mis-mascotas/page.tsx`, add the handler after `handleDelete`:

```tsx
  const handleStatusChange = async (pet: UserPet, next: 'available' | 'adopted') => {
    const previous = pet.adoption_status ?? null
    // Optimistic: the chip flips immediately and rolls back on failure, matching
    // the delete path's behaviour above.
    setPets((prev) => prev.map((p) => (p.id === pet.id ? { ...p, adoption_status: next } : p)))
    const { error } = await updateUserPet(pet.id, { adoption_status: next })
    if (error) {
      setPets((prev) => prev.map((p) => (p.id === pet.id ? { ...p, adoption_status: previous } : p)))
      toast.error(t('member.status_error'))
      return
    }
    toast.success(next === 'adopted' ? t('member.marked_adopted') : t('member.published'))
  }
```

Add `updateUserPet` to the `@/lib/api/user-pets` import.

- [ ] **Step 5: Wire the chip and buttons into the card**

In the `pets.map(...)` render, pass the badge and extend the actions:

```tsx
                badge={
                  pet.adoption_status === 'available' ? (
                    <span className="rounded-full bg-pop-solid px-2 py-0.5 text-[11px] font-medium text-white">
                      {t('member.status_listed')}
                    </span>
                  ) : pet.adoption_status === 'adopted' ? (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                      {t('member.status_adopted')}
                    </span>
                  ) : null
                }
                actions={
                  <>
                    {pet.adoption_status === 'available' ? (
                      <button
                        type="button"
                        onClick={() => handleStatusChange(pet, 'adopted')}
                        aria-label={t('member.mark_adopted')}
                        title={t('member.mark_adopted')}
                        className="h-8 w-8 rounded-full bg-background/90 backdrop-blur text-foreground flex items-center justify-center shadow-sm hover:bg-background transition-colors"
                      >
                        <FontAwesomeIcon icon={faHouseChimneyUser} className="text-xs" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleStatusChange(pet, 'available')}
                        aria-label={t('member.publish_listing')}
                        title={t('member.publish_listing')}
                        className="h-8 w-8 rounded-full bg-background/90 backdrop-blur text-pop-550 flex items-center justify-center shadow-sm hover:bg-background transition-colors"
                      >
                        <FontAwesomeIcon icon={faShareNodes} className="text-xs" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => openEdit(pet)}
                      aria-label={t('member.edit')}
                      className="h-8 w-8 rounded-full bg-background/90 backdrop-blur text-foreground flex items-center justify-center shadow-sm hover:bg-background transition-colors"
                    >
                      <FontAwesomeIcon icon={faPen} className="text-xs" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setPendingDelete(pet)}
                      aria-label={t('member.delete')}
                      className="h-8 w-8 rounded-full bg-background/90 backdrop-blur text-destructive flex items-center justify-center shadow-sm hover:bg-background transition-colors"
                    >
                      <FontAwesomeIcon icon={faTrash} className="text-xs" />
                    </button>
                  </>
                }
```

Add `faHouseChimneyUser, faShareNodes` to the `@fortawesome/free-solid-svg-icons` import.

The buttons are `aria-label`ed rather than text-labelled because they sit in a 32px overlay circle — the label is what the test queries and what a screen reader announces.

- [ ] **Step 6: Add the i18n keys**

`public/locales/es/pets.json`, in `member`:

```json
    "status_listed": "En adopción",
    "status_adopted": "Adoptada",
    "mark_adopted": "Marcar como adoptada",
    "publish_listing": "Publicar en adopción",
    "marked_adopted": "Marcada como adoptada",
    "status_error": "No pudimos actualizar el estado",
```

`public/locales/en/pets.json`, in `member`:

```json
    "status_listed": "Up for adoption",
    "status_adopted": "Adopted",
    "mark_adopted": "Mark as adopted",
    "publish_listing": "Publish for adoption",
    "marked_adopted": "Marked as adopted",
    "status_error": "We couldn't update the status",
```

`member.published` already exists (`"Mascota publicada"`) — reuse it, do not add a duplicate.

- [ ] **Step 7: Run the tests**

```bash
cd /home/noob_master/pelu/frontend && npx vitest run components/__tests__/pets/mis-mascotas-page.test.tsx
```

Expected: PASS, including the file's existing delete and error-state tests.

- [ ] **Step 8: Commit**

```bash
git -C /home/noob_master/pelu/frontend add app/mis-mascotas/page.tsx components/pets/user-pet-card.tsx public/locales components/__tests__/pets/mis-mascotas-page.test.tsx
git -C /home/noob_master/pelu/frontend commit -m "feat(mis-mascotas): manage listing status from the pet grid"
```

---

## Task 8: Verify i18n registration and run the full suite

- [ ] **Step 1: Confirm no new namespace or import is needed**

Every key added in Tasks 3, 4, 6 and 7 lives in the existing `pets` namespace, whose JSON files are already imported in `lib/i18n/index.ts`. Confirm:

```bash
cd /home/noob_master/pelu/frontend && grep -n "pets.json" lib/i18n/index.ts
```

Expected: existing `es`/`en` imports. If you added a key to a **new** namespace, register it there and in `lib/i18n/config.ts` — otherwise nothing to do.

- [ ] **Step 2: Confirm the two locale files have the same shape**

```bash
cd /home/noob_master/pelu/frontend && python3 -c "
import json
es = json.load(open('public/locales/es/pets.json'))
en = json.load(open('public/locales/en/pets.json'))
for section in ('member', 'detail'):
    a, b = set(es.get(section, {})), set(en.get(section, {}))
    print(section, 'only in es:', sorted(a - b), '| only in en:', sorted(b - a))
"
```

Expected: both lists empty for both sections. A key present only in Spanish silently falls back; only in English is dead weight.

- [ ] **Step 3: Run the full suite**

```bash
cd /home/noob_master/pelu/frontend && npx vitest run
```

Expected: PASS. If the about-scenes smoke test fails, re-run it alone (`npx vitest run components/__tests__/landing/`) — it is a known flake in full runs. Any *other* failure is yours; report it with the output rather than moving on.

- [ ] **Step 4: Type-check and build**

```bash
cd /home/noob_master/pelu/frontend && npx tsc --noEmit && bun run build
```

Expected: both PASS. The build matters because `output: 'export'` prerenders these routes.

- [ ] **Step 5: Commit anything outstanding**

```bash
git -C /home/noob_master/pelu/frontend status --short
```

Commit any stragglers; there should be none if each task committed.

---

## Task 9: Manual verification in the browser

Automated tests do not cover the real feed, real photos, or the chat round trip.

- [ ] **Step 1: Publish a listing**

With the API running on 2701 and the dev server on 3000, log in as a member, open **Publicar mascota** from the account sheet, fill in a name/age, add a photo and a phone, and publish.

Expected: success toast, pet appears in `/mis-mascotas` with the **En adopción** chip.

- [ ] **Step 2: Check the public feed, logged out**

Open `/pets` in a private window.

Expected: the pet is listed, attributed to your display name, **with no verified badge**. Compare against a rescue-centre pet in the same grid — that one keeps its badge.

- [ ] **Step 3: Check the detail panel**

Click the pet (desktop ≥640px opens the sheet; below that the feed card shows everything inline).

Expected: owner card with name, phone and email as tappable links; **Chatear con …** as the primary button; no "Adoptar"; no share button.

- [ ] **Step 4: Chat round trip**

As a *different* member, tap **Chatear con …**.

Expected: lands in `/chat` with that conversation selected. Send a message; confirm the owner's account sees it. Tap the button again from the pet — expect the **same** conversation, not a duplicate.

- [ ] **Step 5: Retire the listing**

Back in `/mis-mascotas`, mark it adopted.

Expected: chip flips to **Adoptada**, the pet disappears from `/pets`, and a direct link to it 404s.

- [ ] **Step 6: Regression sweep**

- Onboarding pets (from the member wizard) do **not** appear in `/pets`.
- The transport form still lists all your pets, published or not.
- A rescue-centre pet still shows the badge and routes to the adoption form.
- The RC dashboard roster shows only that centre's pets.

- [ ] **Step 7: Report**

No code change expected. Fix any failure in the owning task and re-run that task's tests before re-verifying.

---

## Dependency on the API

| Frontend task | Needs |
|---|---|
| 1, 8 | nothing — types and copy only |
| 2, 4 | API Task 7 (`POST /conversations`) |
| 3 | API Tasks 4–5 (`owner` on the feed) |
| 5 | nothing — pure frontend routing |
| 6 | API Tasks 2–3 (`phone` on profile, `adoption_status` on create) |
| 7 | API Task 3 (`adoption_status` on PATCH) |
| 9 | all of it, deployed |
