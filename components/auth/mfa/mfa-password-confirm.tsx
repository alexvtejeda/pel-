'use client'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'

interface MfaPasswordConfirmProps {
  onConfirm: (password: string) => Promise<void>
  onCancel: () => void
  error?: string | null
}

export function MfaPasswordConfirm({ onConfirm, onCancel, error }: MfaPasswordConfirmProps) {
  const { t } = useTranslation('auth')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    await onConfirm(password)
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-card rounded-2xl p-6 w-full max-w-sm space-y-4 border shadow-lg">
        <h3 className="font-semibold">{t('mfa.settings.delete_confirm_title')}</h3>
        <p className="text-sm text-muted-foreground">{t('mfa.settings.delete_confirm_desc')}</p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t('mfa.settings.password_placeholder')}
            required
            className="w-full px-4 py-2 border border-input rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-ring focus:border-transparent"
          />
          {error && <p className="text-destructive text-sm">{error}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading || !password}
              className="flex-1 py-2 px-4 bg-destructive text-destructive-foreground rounded-xl text-sm font-medium hover:bg-destructive/90 transition-colors disabled:opacity-50"
            >
              {loading ? '...' : t('mfa.settings.confirm_button')}
            </button>
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="flex-1 py-2 px-4 border border-input rounded-xl text-sm hover:bg-muted transition-colors"
            >
              {t('mfa.settings.cancel')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
