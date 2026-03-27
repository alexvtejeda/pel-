import { ProtectedRoute } from '@/components/auth/protected-route'
import { BusinessGuard } from '@/components/auth/business-guard'

export default function BusinessDashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute requireRole={['business']}>
      <BusinessGuard>
        {children}
      </BusinessGuard>
    </ProtectedRoute>
  )
}
