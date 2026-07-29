'use client'

import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faHandshake } from '@fortawesome/free-solid-svg-icons'
import { UnifiedProvider } from '@/lib/api/providers'
import { SERVICE_TYPES } from '@/lib/api/service-providers'
import { ProviderCard } from '@/components/providers/provider-card'
import { ErrorState } from '@/components/ui/error-state'
import { TransitionLink } from '@/components/transitions/transition-link'

/*
  Filter keys come from SERVICE_TYPES — the values providers actually store in
  services[]. The older aliados.filters.* list (walking/sitting) never matched
  those values, so the pills could not have filtered anything even if they had
  been enabled. Labels come from service_providers.services.*, which is an
  exact match for SERVICE_TYPES.
*/
type FilterKey = 'all' | (typeof SERVICE_TYPES)[number]

const FILTERS: FilterKey[] = ['all', ...SERVICE_TYPES]

interface ProviderGridProps {
  providers: UnifiedProvider[]
  loading: boolean
  error: string | null
  selectedId: string | null
  onSelect: (provider: UnifiedProvider) => void
  onRetry: () => void
}

export function ProviderGrid({
  providers,
  loading,
  error,
  selectedId,
  onSelect,
  onRetry,
}: ProviderGridProps) {
  const { t } = useTranslation('business')
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all')

  const filtered = useMemo(
    () => (activeFilter === 'all' ? providers : providers.filter((p) => p.services.includes(activeFilter))),
    [providers, activeFilter]
  )

  const filterLabel = (key: FilterKey) =>
    key === 'all' ? t('aliados.filters.all') : t(`service_providers.services.${key}`)

  return (
    <div className="flex flex-col flex-1">
      {/* A <div>, not a <header>: the public layout's PetsHeader already owns the banner landmark. */}
      <div className="px-4 pt-6 pb-2 sm:px-2">
        <h1 className="text-2xl font-bold sm:text-3xl">{t('aliados.title')}</h1>
        <p className="mt-1 max-w-xl text-sm text-muted-foreground">{t('aliados.subtitle')}</p>
        {/* Kept mounted (content varies) so screen readers announce the count when it changes. */}
        <p aria-live="polite" className="mt-2 min-h-4 text-xs font-medium text-muted-foreground">
          {!loading && !error ? t('aliados.count', { count: filtered.length }) : ''}
        </p>
      </div>

      {/* Filter pills */}
      <div className="flex items-center gap-2 px-2 py-3 overflow-x-auto shrink-0">
        {FILTERS.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveFilter(key)}
            aria-pressed={activeFilter === key}
            className={`focus-ring flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors ${
              activeFilter === key
                ? 'bg-pop-solid border-pop-solid text-white'
                : 'bg-background border-input text-foreground hover:bg-secondary/80'
            }`}
          >
            {filterLabel(key)}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-4 pb-20 sm:pb-4 sm:inset-shadow-2xl rounded-t-2xl sm:shadow-2xl bg-background">
        {loading && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              // Mirrors ProviderCard: avatar left, two text lines, chips, price.
              <div key={i} className="rounded-2xl border bg-card p-4 space-y-3 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 shrink-0 rounded-full bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 w-2/3 rounded bg-muted" />
                    <div className="h-3 w-1/3 rounded bg-muted" />
                  </div>
                </div>
                <div className="h-3 w-full rounded bg-muted" />
                <div className="flex gap-1.5">
                  <div className="h-5 w-16 rounded-full bg-muted" />
                  <div className="h-5 w-20 rounded-full bg-muted" />
                </div>
                <div className="h-4 w-24 rounded bg-muted" />
              </div>
            ))}
          </div>
        )}

        {error && !loading && (
          <ErrorState message={t('aliados.load_error')} onRetry={onRetry} />
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center text-muted-foreground">
            <FontAwesomeIcon icon={faHandshake} className="text-4xl opacity-30" />
            <p className="text-sm">{t('aliados.empty')}</p>
            {activeFilter !== 'all' ? (
              <button
                type="button"
                onClick={() => setActiveFilter('all')}
                className="focus-ring rounded-xl border border-input px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
              >
                {t('aliados.clear_filters')}
              </button>
            ) : (
              <TransitionLink
                href="/servicios"
                className="focus-ring rounded-xl border border-input px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
              >
                {t('aliados.empty_cta')}
              </TransitionLink>
            )}
          </div>
        )}

        {!loading && !error && filtered.length > 0 && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((provider) => (
              <ProviderCard
                key={provider.id}
                provider={provider}
                selected={selectedId === provider.id}
                onClick={() => onSelect(provider)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
