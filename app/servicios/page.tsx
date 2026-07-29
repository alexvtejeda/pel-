'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faHourglassHalf, faCircleCheck, faCircleXmark, faHandHoldingHeart } from '@fortawesome/free-solid-svg-icons'
import { PetsHeader } from '@/components/pets/pets-header'
import { ServiceProviderForm } from '@/components/service-providers/service-provider-form'
import { StatusCard } from '@/components/service-providers/status-card'
import { ErrorState } from '@/components/ui/error-state'
import { getMyServiceProvider, ServiceProvider } from '@/lib/api/service-providers'

export default function ServiciosPage() {
  const { t } = useTranslation(['business', 'common'])
  const [provider, setProvider] = useState<ServiceProvider | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error: err } = await getMyServiceProvider()
    setProvider(data)
    // Assigned unconditionally, never `if (err)`: a retry that succeeds has to
    // clear the previous failure, otherwise the error branch latches forever.
    setError(err)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <div className="min-h-screen bg-muted/30">
      <PetsHeader />

      <main className="container mx-auto max-w-2xl px-4 py-8">
        <header className="mb-6 flex items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-pop-550/10">
            <FontAwesomeIcon icon={faHandHoldingHeart} className="text-xl text-pop-550" aria-hidden="true" />
          </span>
          <div>
            <h1 className="text-2xl font-bold">{t('service_providers.title')}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{t('service_providers.subtitle')}</p>
          </div>
        </header>

        {loading ? (
          <div className="space-y-4" role="status" aria-label={t('common:loading')}>
            <div className="h-32 animate-pulse rounded-2xl bg-card" />
            <div className="h-64 animate-pulse rounded-2xl bg-card" />
          </div>
        ) : error ? (
          <ErrorState message={t('service_providers.load_error')} onRetry={load} />
        ) : !provider ? (
          <div className="space-y-6 rounded-2xl border bg-card p-6">
            <p className="text-sm text-muted-foreground">{t('service_providers.intro')}</p>
            <ServiceProviderForm mode="register" onSaved={setProvider} />
          </div>
        ) : provider.status === 'pending' ? (
          <StatusCard
            icon={faHourglassHalf}
            tone="text-warning"
            title={t('service_providers.pending_title')}
            body={t('service_providers.pending_body')}
          >
            <p className="text-sm text-muted-foreground">{t('service_providers.pending_next')}</p>
          </StatusCard>
        ) : provider.status === 'active' ? (
          <div className="space-y-6">
            <StatusCard
              icon={faCircleCheck}
              tone="text-success"
              title={t('service_providers.active_title')}
              body={t('service_providers.active_body')}
            />
            <div className="rounded-2xl border bg-card p-6">
              <ServiceProviderForm mode="edit" provider={provider} onSaved={setProvider} />
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <StatusCard
              icon={faCircleXmark}
              tone="text-destructive"
              title={t('service_providers.rejected_title')}
              body={t('service_providers.rejected_body')}
            >
              {provider.rejection_reason && (
                <p className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
                  <span className="font-medium">{t('service_providers.rejected_reason')} </span>
                  <span>{provider.rejection_reason}</span>
                </p>
              )}
            </StatusCard>
            <div className="rounded-2xl border bg-card p-6">
              <ServiceProviderForm mode="reapply" provider={provider} onSaved={setProvider} />
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
