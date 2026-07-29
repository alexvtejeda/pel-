import { ProtectedRoute } from '@/components/auth/protected-route'

export default function MfaEnrollmentLayout({ children }: { children: React.ReactNode }) {
  // No requireRole — every authenticated role may enroll a method. The opt-out
  // keeps the guard from swallowing this route with its own <MfaEnrollment>:
  // the users forced here (rescue_center/business with MFA pending) are exactly
  // the ones that branch fires for, and the page owns the flow, not the guard.
  return (
    <ProtectedRoute allowMfaSetupPending>
      {children}
    </ProtectedRoute>
  )
}
