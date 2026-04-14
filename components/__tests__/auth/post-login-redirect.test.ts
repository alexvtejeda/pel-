import { describe, it, expect, vi, beforeEach } from 'vitest'
import { postLoginRedirect } from '@/lib/auth/post-login-redirect'
import { AuthUser } from '@/lib/types/user'

vi.mock('@/lib/api/client', () => ({
  apiClient: vi.fn(),
}))

import { apiClient } from '@/lib/api/client'
const mockApiClient = apiClient as unknown as ReturnType<typeof vi.fn>

const baseUser: AuthUser = {
  id: 'u1',
  email: 'u@example.com',
  role: 'member',
  auth_provider: 'email',
  preferred_lang: 'es',
  display_name: null,
  avatar_url: null,
}

const makeRouter = () => ({ push: vi.fn() })

const meResponse = (body: object) =>
  ({ ok: true, json: async () => body } as Response)

describe('postLoginRedirect', () => {
  beforeEach(() => {
    mockApiClient.mockReset()
  })

  it('redirects to enrollment when mfa_setup_required is true', async () => {
    mockApiClient.mockResolvedValueOnce(meResponse({ mfa_setup_required: true }))
    const router = makeRouter()
    await postLoginRedirect(baseUser, router)
    expect(router.push).toHaveBeenCalledWith('/auth/mfa/enrollment?mfa=1')
  })

  it('redirects to admin dashboard when is_admin is true and mfa_setup_required is false', async () => {
    mockApiClient.mockResolvedValueOnce(meResponse({ is_admin: true, mfa_setup_required: false }))
    const router = makeRouter()
    await postLoginRedirect(baseUser, router)
    expect(router.push).toHaveBeenCalledWith('/dashboard/admin')
  })

  it('redirects to /pets for a member when not admin and no mfa required', async () => {
    mockApiClient.mockResolvedValueOnce(meResponse({ is_admin: false, mfa_setup_required: false }))
    const router = makeRouter()
    await postLoginRedirect(baseUser, router)
    expect(router.push).toHaveBeenCalledWith('/pets')
  })

  it('redirects to role-selection when user has no role', async () => {
    mockApiClient.mockResolvedValueOnce(meResponse({ is_admin: false, mfa_setup_required: false }))
    const router = makeRouter()
    await postLoginRedirect({ ...baseUser, role: null }, router)
    expect(router.push).toHaveBeenCalledWith('/auth/role-selection')
  })

  it('redirects rescue_center to /dashboard/rescue-center', async () => {
    mockApiClient.mockResolvedValueOnce(meResponse({ is_admin: false, mfa_setup_required: false }))
    const router = makeRouter()
    await postLoginRedirect({ ...baseUser, role: 'rescue_center' }, router)
    expect(router.push).toHaveBeenCalledWith('/dashboard/rescue-center')
  })

  it('redirects business to /dashboard/business', async () => {
    mockApiClient.mockResolvedValueOnce(meResponse({ is_admin: false, mfa_setup_required: false }))
    const router = makeRouter()
    await postLoginRedirect({ ...baseUser, role: 'business' }, router)
    expect(router.push).toHaveBeenCalledWith('/dashboard/business')
  })

  it('falls through to role-based redirect when /auth/me throws', async () => {
    mockApiClient.mockRejectedValueOnce(new Error('network'))
    const router = makeRouter()
    await postLoginRedirect({ ...baseUser, role: 'member' }, router)
    expect(router.push).toHaveBeenCalledWith('/pets')
  })

  it('prioritizes role-selection over admin dashboard when role is null even if is_admin', async () => {
    mockApiClient.mockResolvedValueOnce(meResponse({ is_admin: true, mfa_setup_required: false }))
    const router = makeRouter()
    await postLoginRedirect({ ...baseUser, role: null }, router)
    expect(router.push).toHaveBeenCalledWith('/auth/role-selection')
  })
})
