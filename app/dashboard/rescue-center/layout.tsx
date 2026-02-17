import { ProtectedRoute } from '@/components/auth/protected-route'

export default function RescueCenterLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute requireRole={['rescue_center']}>
      {children}
    </ProtectedRoute>
  )
}
