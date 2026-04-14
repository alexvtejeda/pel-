'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'
import { useAuth } from '@/lib/contexts/auth-context'
import { googleRedirect } from '@/lib/api/auth'
import { mfaChallenge as mfaChallengeApi } from '@/lib/api/mfa'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faGoogle } from '@fortawesome/free-brands-svg-icons'
import { MfaVerify } from '@/components/auth/mfa/mfa-verify'
import { MfaChallengeResponse, AuthUser } from '@/lib/types/user'
import { postLoginRedirect } from '@/lib/auth/post-login-redirect'
import { AuthLayout } from './auth-layout'

type LoginMode = 'credentials' | 'loading' | 'mfa'

const shrinkExpandProps = {
  initial: { opacity: 0, height: 0 },
  animate: { opacity: 1, height: 'auto' as const },
  exit: { opacity: 0, height: 0 },
  transition: { duration: 0.2, ease: 'easeInOut' as const },
  style: { overflow: 'hidden' },
}

export function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { login } = useAuth()

  const [mode, setMode] = useState<LoginMode>(
    searchParams?.get('mfa') === '1' ? 'loading' : 'credentials'
  )
  const [challenge, setChallenge] = useState<MfaChallengeResponse | null>(null)
  const [challengeEmail, setChallengeEmail] = useState<string>('')
  const [credentialsError, setCredentialsError] = useState<string | null>(null)

  // Guard against React strict-mode double-fire in development.
  const challengeFetched = useRef(false)

  useEffect(() => {
    if (mode !== 'loading') return
    if (challengeFetched.current) return
    challengeFetched.current = true

    ;(async () => {
      const { data, error } = await mfaChallengeApi()
      if (error || !data) {
        setCredentialsError('Tu sesión MFA expiró, inicia sesión de nuevo')
        setMode('credentials')
        return
      }
      setChallenge(data)
      setChallengeEmail(data.email)
      setMode('mfa')
    })()
  }, [mode])

  const handleMfaRequired = (ch: MfaChallengeResponse, email: string) => {
    setChallenge(ch)
    setChallengeEmail(email)
    setMode('mfa')
  }

  const handleSuccess = (user: AuthUser) => {
    postLoginRedirect(user, router)
  }

  const handleCancel = () => {
    setChallenge(null)
    setMode('credentials')
  }

  return (
    <AuthLayout accent="amber" heroTagline="Bienvenido de vuelta">
      <AnimatePresence mode="wait" initial={false}>
        {mode === 'credentials' && (
          <motion.div key="credentials" {...shrinkExpandProps}>
            <CredentialsForm
              initialError={credentialsError}
              onMfaRequired={handleMfaRequired}
              onSuccess={handleSuccess}
              login={login}
            />
          </motion.div>
        )}
        {mode === 'loading' && (
          <motion.div key="loading" {...shrinkExpandProps}>
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pop-550" />
            </div>
          </motion.div>
        )}
        {mode === 'mfa' && challenge && (
          <motion.div key="mfa" {...shrinkExpandProps}>
            <MfaVerify
              challenge={challenge}
              loginEmail={challengeEmail}
              onSuccess={handleSuccess}
              onExpired={() => {
                setChallenge(null)
                setCredentialsError('Tu sesión MFA expiró, inicia sesión de nuevo')
                setMode('credentials')
              }}
              onCancel={handleCancel}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </AuthLayout>
  )
}

interface CredentialsFormProps {
  initialError: string | null
  onMfaRequired: (challenge: MfaChallengeResponse, email: string) => void
  onSuccess: (user: AuthUser) => void
  login: (email: string, password: string) => Promise<{ error: string | null; mfaChallenge: MfaChallengeResponse | null; user: AuthUser | null }>
}

function CredentialsForm({ initialError, onMfaRequired, onSuccess, login }: CredentialsFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(initialError)

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error: authError, mfaChallenge: ch, user } = await login(email, password)

    if (authError) {
      setError(authError)
      setLoading(false)
      return
    }

    if (ch) {
      onMfaRequired(ch, email)
      setLoading(false)
      return
    }

    if (user) {
      onSuccess(user)
    }
    setLoading(false)
  }

  const handleGoogleSignIn = () => {
    googleRedirect()
  }

  return (
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
        <hr className="my-4" />
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
  )
}
