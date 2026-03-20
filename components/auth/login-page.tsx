'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/contexts/auth-context'
import { googleRedirect } from '@/lib/api/auth'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faGoogle } from '@fortawesome/free-brands-svg-icons'
import { MfaVerify } from '@/components/auth/mfa/mfa-verify'
import { MfaChallengeResponse } from '@/lib/types/user'
import { AuthLayout } from './auth-layout'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mfaChallenge, setMfaChallenge] = useState<MfaChallengeResponse | null>(null)
  const router = useRouter()
  const { login } = useAuth()

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error: authError, mfaChallenge: challenge } = await login(email, password)

    if (authError) {
      setError(authError)
      setLoading(false)
      return
    }

    if (challenge) {
      setMfaChallenge(challenge)
      setLoading(false)
      return
    }

    router.push('/auth/role-selection')
    setLoading(false)
  }

  const handleGoogleSignIn = () => {
    googleRedirect()
  }

  return (
    <>
      <AuthLayout accent="amber" heroTagline="Bienvenido de vuelta">
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Inicia sesión</h2>
            <p className="text-xs text-muted-foreground mt-1">Ingresa tus credenciales</p>
          </div>

          <form onSubmit={handleEmailAuth} className="space-y-3">
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
              className="w-full py-3 px-4 bg-amber-500 text-background rounded-xl font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Cargando...' : 'Iniciar sesión'}
            </button>
          </form>

          <div className="text-center text-sm">
            <Link href="/auth/register">
              ¿No tienes cuenta? <span className="text-pop-550 hover:opacity-80 transition-opacity">Regístrate</span>
            </Link>
          </div>

          <div className="relative">
            <hr className="my-4"></hr>
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

      {mfaChallenge && (
        <MfaVerify
          challenge={mfaChallenge}
          loginEmail={email}
          onSuccess={() => router.push('/auth/role-selection')}
          onExpired={() => {
            setMfaChallenge(null)
            setError('Tu sesión expiró, inicia sesión de nuevo')
          }}
        />
      )}
    </>
  )
}
