'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSpinner, faHourglassHalf, faCircleCheck, faCircleXmark } from '@fortawesome/free-solid-svg-icons'
import { PetsHeader } from '@/components/pets/pets-header'
import { ServiceProviderForm } from '@/components/service-providers/service-provider-form'
import { getMyServiceProvider, ServiceProvider } from '@/lib/api/service-providers'

export default function ServiciosPage() {
  const { t } = useTranslation('business')
  const [provider, setProvider] = useState<ServiceProvider | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error: err } = await getMyServiceProvider()
    setProvider(data)
    setError(err)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <div className="min-h-screen bg-background">
      <PetsHeader />

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <h1 className="text-2xl font-bold mb-6">{t('service_providers.title')}</h1>

        {loading ? (
          <div className="flex justify-center py-24">
            <FontAwesomeIcon icon={faSpinner} className="text-3xl text-muted-foreground/40 animate-spin" />
          </div>
        ) : error ? (
          <p className="text-destructive text-sm py-8 text-center">{t('service_providers.load_error')}</p>
        ) : !provider ? (
          <div className="space-y-6">
            <p className="text-sm text-muted-foreground">{t('service_providers.intro')}</p>
            <ServiceProviderForm mode="register" onSaved={setProvider} />
          </div>
        ) : provider.status === 'pending' ? (
          <div className="rounded-2xl border bg-card p-6 space-y-3">
            <div className="flex items-center gap-3">
              <FontAwesomeIcon icon={faHourglassHalf} className="text-lg text-yellow-500" />
              <h2 className="font-semibold">{t('service_providers.pending_title')}</h2>
            </div>
            <p className="text-sm text-muted-foreground">{t('service_providers.pending_body')}</p>
          </div>
        ) : provider.status === 'active' ? (
          <div className="space-y-6">
            <div className="rounded-2xl border bg-card p-6 space-y-3">
              <div className="flex items-center gap-3">
                <FontAwesomeIcon icon={faCircleCheck} className="text-lg text-green-500" />
                <h2 className="font-semibold">{t('service_providers.active_title')}</h2>
              </div>
              <p className="text-sm text-muted-foreground">{t('service_providers.active_body')}</p>
            </div>
            <ServiceProviderForm mode="edit" provider={provider} onSaved={setProvider} />
          </div>
        ) : (
          <div className="space-y-6">
            <div className="rounded-2xl border bg-card p-6 space-y-3">
              <div className="flex items-center gap-3">
                <FontAwesomeIcon icon={faCircleXmark} className="text-lg text-destructive" />
                <h2 className="font-semibold">{t('service_providers.rejected_title')}</h2>
              </div>
              {provider.rejection_reason && (
                <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-xl">
                  <span className="font-medium">{t('service_providers.rejected_reason')} </span>
                  <span>{provider.rejection_reason}</span>
                </p>
              )}
              <p className="text-sm text-muted-foreground">{t('service_providers.rejected_body')}</p>
            </div>
            <ServiceProviderForm mode="reapply" provider={provider} onSaved={setProvider} />
          </div>
        )}
      </main>
    </div>
  )
}
