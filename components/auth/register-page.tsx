'use client'

import { useState } from 'react'
import { useLocaleRouter } from '@/lib/i18n/use-locale'
import { useTranslation } from 'react-i18next'
import Link from '@/components/locale-link'
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
  const router = useLocaleRouter()
  const { t } = useTranslation('auth')
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
          { label: t('home', { ns: 'common' }), href: '/' },
          { label: t('register', { ns: 'common' }), href: '/auth/register' },
          { label: t('security', { ns: 'common' }), current: true },
        ]}
      />
    )
  }

  const handleGoogleSignIn = () => {
    googleRedirect()
  }

  return (
    <AuthLayout accent="pop" heroTagline={t('signup.hero')}>
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{t('signup.title')}</h2>
          <p className="text-xs text-muted-foreground mt-1">{t('signup.subtitle')}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="email"
            placeholder={t('login.email')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-3 border border-input bg-background/50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <input
            type="password"
            placeholder={t('login.password')}
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
            {loading ? t('loading', { ns: 'common' }) : t('signup.submit')}
          </button>
        </form>

        <div className="text-center text-sm">
          <Link href="/auth/login">
            {t('signup.already_have')} <span className="text-amber-500 hover:opacity-80 transition-opacity">{t('signup.login')}</span>
          </Link>
        </div>

        <div className="relative">
          <hr className="my-4"></hr>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-transparent text-muted-foreground">{t('login.or_continue')}</span>
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
