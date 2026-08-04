import { ProtectedRoute } from '@/components/auth/protected-route'

export default function MisMascotasLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute requireRole={['member']}>
      {children}
    </ProtectedRoute>
  )
}
