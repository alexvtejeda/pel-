import { ProtectedRoute } from '@/components/auth/protected-route'
import { AdminGuard } from '@/components/dashboard/admin/admin-guard'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <AdminGuard>
        {children}
      </AdminGuard>
    </ProtectedRoute>
  )
}
