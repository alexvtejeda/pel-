import { ProtectedRoute } from '@/components/auth/protected-route'

export default function ServiciosLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute requireRole={['member']}>
      {children}
    </ProtectedRoute>
  )
}
