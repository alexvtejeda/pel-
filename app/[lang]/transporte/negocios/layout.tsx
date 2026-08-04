import { ProtectedRoute } from '@/components/auth/protected-route'

export default function NegociosLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute requireRole={['member', 'rescue_center']}>
      {children}
    </ProtectedRoute>
  )
}
