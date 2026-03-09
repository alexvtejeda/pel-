import { ProtectedRoute } from '@/components/auth/protected-route'
import { RescueCenterGuard } from '@/components/auth/rescue-center-guard'

export default function RescueCenterLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute requireRole={['rescue_center']}>
      <RescueCenterGuard>
        {children}
      </RescueCenterGuard>
    </ProtectedRoute>
  )
}
