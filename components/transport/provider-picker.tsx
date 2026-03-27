'use client'

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ProviderCard } from '@/components/providers/provider-card'
import { listProviders, UnifiedProvider } from '@/lib/api/providers'

interface ProviderPickerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (userId: string) => void
  lat?: number
  lng?: number
}

export function ProviderPicker({ open, onOpenChange, onSelect }: ProviderPickerProps) {
  const { t } = useTranslation('business')
  const [providers, setProviders] = useState<UnifiedProvider[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    setError(null)
    listProviders({ service: 'taxi' }).then(({ data, error: err }) => {
      if (err || !data) {
        setError(err || 'Error')
        setLoading(false)
        return
      }
      setProviders(data)
      setLoading(false)
    })
  }, [open])

  const handleSelect = (provider: UnifiedProvider) => {
    onSelect(provider.user_id)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('provider.select_title')}</DialogTitle>
        </DialogHeader>

        {loading && (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        )}

        {error && (
          <p className="text-destructive text-sm py-8 text-center">{error}</p>
        )}

        {!loading && !error && providers.length === 0 && (
          <p className="text-muted-foreground text-sm py-8 text-center">
            {t('provider.no_providers')}
          </p>
        )}

        {!loading && !error && providers.length > 0 && (
          <div className="grid grid-cols-1 gap-3">
            {providers.map(provider => (
              <ProviderCard
                key={provider.id}
                provider={provider}
                onClick={() => handleSelect(provider)}
              />
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
