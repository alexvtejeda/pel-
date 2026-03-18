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
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Pelú</h1>
          <p className="text-muted-foreground">Inicia sesión para continuar</p>
        </div>

        <div className="bg-card rounded-2xl p-6 space-y-4 shadow-xs border">
          {/* Email/Password Form */}
          <form onSubmit={handleEmailAuth} className="space-y-3">
            <div>
              <input
                type="email"
                placeholder="Correo electrónico"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 border border-input rounded-xl focus:outline-hidden focus:ring-2 focus:ring-ring focus:border-transparent"
              />
            </div>
            <div>
              <input
                type="password"
                placeholder="Contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-4 py-3 border border-input rounded-xl focus:outline-hidden focus:ring-2 focus:ring-ring focus:border-transparent"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Cargando...' : 'Iniciar sesión'}
            </button>
          </form>

          <div className="text-center text-sm">
            <Link href="/auth/register" className="text-muted-foreground hover:text-foreground">
              ¿No tienes cuenta? Regístrate
            </Link>
          </div>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-card text-muted-foreground">O continúa con</span>
            </div>
          </div>

          {/* OAuth Buttons */}
          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-background border border-input rounded-xl hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FontAwesomeIcon icon={faGoogle} className="text-xl" />
            <span className="font-medium">Google</span>
          </button>

          {error && (
            <div className="mt-4 p-3 bg-destructive/10 border border-destructive/30 rounded-xl text-destructive text-sm">
              {error}
            </div>
          )}
        </div>
      </div>
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
    </div>
  )
}
