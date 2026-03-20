'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/contexts/auth-context'
import { googleRedirect } from '@/lib/api/auth'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faGoogle } from '@fortawesome/free-brands-svg-icons'
import { MfaEnrollment } from '@/components/auth/mfa/mfa-enrollment'
import { AuthLayout } from './auth-layout'

export function RegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showMfaEnrollment, setShowMfaEnrollment] = useState(false)
  const router = useRouter()
  const { register } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error: authError } = await register(email, password)

    if (authError) {
      setError(authError)
      setLoading(false)
      return
    }

    setShowMfaEnrollment(true)
    setLoading(false)
  }

  if (showMfaEnrollment) {
    return (
      <MfaEnrollment
        onComplete={() => router.push('/auth/role-selection')}
        onSkip={() => router.push('/auth/role-selection')}
        breadcrumbItems={[
          { label: 'Inicio', href: '/' },
          { label: 'Registro', href: '/auth/register' },
          { label: 'Seguridad', current: true },
        ]}
      />
    )
  }

  const handleGoogleSignIn = () => {
    googleRedirect()
  }

  return (
    <AuthLayout accent="pop" heroTagline="Encuentra a tu compañero ideal">
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Crea tu cuenta</h2>
          <p className="text-xs text-muted-foreground mt-1">Únete a la comunidad</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="email"
            placeholder="Correo electrónico"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-3 border border-input bg-background/50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full px-4 py-3 border border-input bg-background/50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-pop-550 text-background rounded-xl font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Cargando...' : 'Crear cuenta'}
          </button>
        </form>

        <div className="text-center text-sm">
          <Link href="/auth/login" className="text-amber-500 hover:opacity-80 transition-opacity">
            ¿Ya tienes cuenta? Inicia sesión
          </Link>
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-transparent text-muted-foreground">O continúa con</span>
          </div>
        </div>

        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-background/50 border border-input rounded-xl hover:bg-muted/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <FontAwesomeIcon icon={faGoogle} className="text-xl" />
          <span className="font-medium">Google</span>
        </button>

        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-xl text-destructive text-sm">
            {error}
          </div>
        )}
      </div>
    </AuthLayout>
  )
}
