'use client'

import { useTranslation } from 'react-i18next'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faHandshake } from '@fortawesome/free-solid-svg-icons'
import { UnifiedProvider } from '@/lib/api/providers'
import { ProviderCard } from '@/components/providers/provider-card'

type FilterKey = 'all' | 'transport' | 'walking' | 'grooming' | 'sitting' | 'training'

const FILTERS: { key: FilterKey }[] = [
  { key: 'all' },
  { key: 'transport' },
  { key: 'walking' },
  { key: 'grooming' },
  { key: 'sitting' },
  { key: 'training' },
]

interface ProviderGridProps {
  providers: UnifiedProvider[]
  loading: boolean
  error: string | null
  selectedId: string | null
  onSelect: (provider: UnifiedProvider) => void
}

export function ProviderGrid({
  providers,
  loading,
  error,
  selectedId,
  onSelect,
}: ProviderGridProps) {
  const { t } = useTranslation('business')

  return (
    <div className="flex flex-col flex-1">
      {/* Filter pills */}
      <div className="flex items-center gap-2 px-2 py-3 overflow-x-auto shrink-0">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            disabled
            className="shadow-xl flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-xl whitespace-nowrap bg-background text-foreground opacity-60 cursor-default"
          >
            {t(`aliados.filters.${f.key}`)}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-4 inset-shadow-2xl rounded-t-2xl shadow-2xl bg-background">
        {loading && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded-xl overflow-hidden bg-secondary animate-pulse">
                <div className="h-24 bg-muted" />
                <div className="p-3 space-y-2">
                  <div className="h-3.5 bg-muted rounded w-2/3" />
                  <div className="h-3 bg-muted rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        )}

        {error && !loading && (
          <div className="flex items-center justify-center h-48 text-destructive">
            {error}
          </div>
        )}

        {!loading && !error && providers.length === 0 && (
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-3">
            <FontAwesomeIcon icon={faHandshake} className="text-4xl opacity-30" />
            <p className="text-sm">{t('aliados.empty')}</p>
          </div>
        )}

        {!loading && !error && providers.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {providers.map((provider) => (
              <div
                key={provider.id}
                className={selectedId === provider.id ? 'outline outline-pop-550 rounded-xl' : ''}
              >
                <ProviderCard
                  provider={provider}
                  onClick={() => onSelect(provider)}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
