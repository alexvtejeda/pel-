'use client'

import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/contexts/auth-context'

export function AdminSettingsTab() {
  const { user, logout } = useAuth()
  const router = useRouter()

  const handleLogout = async () => {
    await logout()
    router.push('/')
  }

  return (
    <div className="max-w-lg space-y-8">
      {/* Account info */}
      <div className="rounded-2xl border bg-card p-6 space-y-4">
        <h2 className="font-semibold">Cuenta</h2>
        <div className="text-sm">
          <p className="text-muted-foreground">Email</p>
          <p className="font-medium">{user?.email}</p>
        </div>
      </div>

      {/* Session */}
      <div className="rounded-2xl border bg-card p-6 space-y-4">
        <h2 className="font-semibold">Sesión</h2>
        <button
          onClick={handleLogout}
          className="px-4 py-2 border border-input rounded-xl text-sm hover:bg-muted transition-colors"
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  )
}
