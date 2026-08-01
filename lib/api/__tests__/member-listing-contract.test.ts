/*
  Contract fixtures for the member-adoption-listings payloads, typed against the
  interfaces they describe. The type annotations are the teeth here: `npx tsc
  --noEmit` fails if `Pet`, `UserPet` or `AuthUser` drift away from what
  `api/docs/api/swagger.yaml` actually sends. The runtime assertions pin the two
  things a reader would otherwise guess wrong — which publisher block is set, and
  that an absent field is absent rather than null.
*/
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Pet } from '../pets'
import type { UserPet } from '../user-pets'
import type { AuthUser } from '@/lib/types/user'

vi.mock('../client', () => ({ apiClient: vi.fn() }))

import { apiClient } from '../client'
import { listPets } from '../pets'
import { updateUserPet } from '../user-pets'

const mockApiClient = vi.mocked(apiClient)

beforeEach(() => {
  vi.restoreAllMocks()
})

/*
  A member-published listing exactly as `GET /pets` renders it
  (api: internal/pets/handler.go petResponse). Note what is here and what is
  not: `owner` is set and `rescue_center` is absent — `omitempty` on both means
  exactly one is ever present. `rescue_center_id` is the empty string rather
  than missing, and `short_slug` is not a field on petResponse at all.
*/
const MEMBER_LISTING: Pet = {
  id: 'p1',
  rescue_center_id: '',
  name: 'Luna',
  description: 'Busca hogar',
  age: 24,
  gender: 'female',
  species: 'dog',
  status: 'available',
  photos: [],
  conditions: [],
  condition_notes: null,
  vaccinated: true,
  castrated: true,
  size: 'medium',
  owner: {
    id: 'u1',
    display_name: 'Ana',
    email: 'ana@pelu.do',
    phone: '+1 809 555 0100',
    avatar_url: null,
  },
}

const RC_LISTING: Pet = {
  id: 'p2',
  rescue_center_id: 'rc1',
  name: 'Milo',
  description: 'Rescatado en Santiago',
  age: 12,
  gender: 'male',
  species: 'cat',
  status: 'available',
  short_slug: 'ab12cd',
  photos: [],
  conditions: [],
  condition_notes: null,
  vaccinated: true,
  castrated: false,
  size: 'small',
  rescue_center: { id: 'rc1', name: 'Rescate RD' },
}

describe('public pet payload', () => {
  it('carries an owner block and no rescue_center on a member listing', async () => {
    mockApiClient.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([MEMBER_LISTING, RC_LISTING]),
    } as Response)

    const [member, rc] = await listPets('rc-1')

    // Exactly one publisher block per pet — the three public surfaces branch on
    // which one is set, so a payload with both (or neither) is a backend bug.
    expect(member.owner?.id).toBe('u1')
    expect(member.rescue_center).toBeUndefined()
    expect(rc.rescue_center?.id).toBe('rc1')
    expect(rc.owner).toBeUndefined()
  })

  // A Google sign-up can skip the wizard that sets display_name, so the field is
  // nullable on the wire and must never be rendered without a fallback.
  it('allows a nameless owner', () => {
    const nameless: Pet = { ...MEMBER_LISTING, owner: { id: 'u2', email: 'sin@pelu.do' } }
    expect(nameless.owner?.display_name ?? nameless.owner?.email).toBe('sin@pelu.do')
  })
})

describe('user pet adoption_status', () => {
  /*
    `undefined` is the private state, not a missing value: the onboarding wizard
    and the transport picker write rows with no adoption_status, and those must
    never reach the public feed.
  */
  it('is absent on a private pet', () => {
    const priv: UserPet = {
      id: 'up1',
      user_id: 'u1',
      name: 'Max',
      age: 36,
      species: 'dog',
      gender: 'male',
      created_at: '2026-01-01T00:00:00Z',
    }
    expect(priv.adoption_status).toBeUndefined()
  })

  // The PATCH payload is a Partial of UserPet, so this is the check that the
  // field is actually reachable through /mis-mascotas' publish and retire actions.
  it('rides along in the update payload', async () => {
    mockApiClient.mockResolvedValue({ ok: true, json: () => Promise.resolve({}) } as Response)

    await updateUserPet('up1', { adoption_status: 'available' })

    expect(mockApiClient).toHaveBeenCalledWith('/api/v1/user-pets/up1', {
      method: 'PATCH',
      body: JSON.stringify({ adoption_status: 'available' }),
    })
  })
})

describe('auth user phone', () => {
  /*
    `phone` is the only omitempty field on the auth userResponse
    (api: internal/auth/handler.go) — display_name and avatar_url serialise as
    null, phone disappears entirely. Hence optional, not `string | null`.
  */
  it('is absent rather than null when the user has not set one', () => {
    const withoutPhone: AuthUser = {
      id: 'u1',
      email: 'ana@pelu.do',
      role: 'member',
      auth_provider: 'password',
      preferred_lang: 'es',
      display_name: 'Ana',
      avatar_url: null,
    }
    const withPhone: AuthUser = { ...withoutPhone, phone: '+1 809 555 0100' }

    expect('phone' in withoutPhone).toBe(false)
    expect(withPhone.phone).toBe('+1 809 555 0100')
  })
})
