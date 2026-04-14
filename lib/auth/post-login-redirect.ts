import { apiClient } from '@/lib/api/client'
import { AuthUser } from '@/lib/types/user'

type RouterLike = { push: (path: string) => void }

export async function postLoginRedirect(user: AuthUser, router: RouterLike) {
  // `GET /auth/me` returns is_admin + mfa_setup_required (backend-computed, unspoofable).
  // - mfa_setup_required is true when the user is rescue_center/business with no MFA
  //   (non-Google), OR an admin with no MFA (any provider, including Google).
  // - is_admin is true when the user's ID is in ADMIN_USER_IDS. Admin is NOT a UserRole
  //   value — a user can be both an admin and a member, for example.
  //
  // Decision order (highest priority first):
  //   1. mfa_setup_required → forced enrollment
  //   2. no role set → pick a role first (even for admins — admin dashboard needs
  //      an underlying role established)
  //   3. is_admin → admin dashboard (overrides role-specific destination)
  //   4. role-specific dashboard
  let isAdmin = false
  try {
    const res = await apiClient('/api/v1/auth/me')
    if (res.ok) {
      const me = await res.json()
      if (me.mfa_setup_required === true) {
        router.push('/auth/mfa/enrollment?mfa=1')
        return
      }
      isAdmin = me.is_admin === true
    }
  } catch {
    // Fall through to role-based redirect on /auth/me failure
  }

  if (!user.role) {
    router.push('/auth/role-selection')
    return
  }

  if (isAdmin) {
    router.push('/dashboard/admin')
    return
  }

  switch (user.role) {
    case 'rescue_center':
      router.push('/dashboard/rescue-center')
      return
    case 'business':
      router.push('/dashboard/business')
      return
    case 'member':
      router.push('/pets')
      return
    default:
      router.push('/auth/role-selection')
  }
}
