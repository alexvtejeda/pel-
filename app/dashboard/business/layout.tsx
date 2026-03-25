import { ProtectedRoute } from '@/components/auth/protected-route'

export default function BusinessDashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute requireRole={['business']}>
      {children}
    </ProtectedRoute>
  )
}
