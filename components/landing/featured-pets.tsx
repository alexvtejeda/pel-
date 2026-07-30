'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { useTranslation } from 'react-i18next'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowRight, faPaw } from '@fortawesome/free-solid-svg-icons'
import { Pet } from '@/lib/api/pets'
import { listPublicPets } from '@/lib/api/pets-public'
import { TransitionLink } from '@/components/transitions/transition-link'
import { ErrorState } from '@/components/ui/error-state'
import { formatAge } from '@/lib/utils/format-age'
import { VerifiedBadge } from '@/components/pets/verified-badge'

const MAX = 8

type Status = 'loading' | 'error' | 'ready'

/**
 * Real adoptable pets on the landing page — Pelú's actual social proof, and a
 * far stronger opening than placeholder partner logos.
 *
 * The public endpoint is unauthenticated, so this works for logged-out
 * visitors, which is the only kind the landing page is designed for.
 */
export function FeaturedPets() {
  const { t } = useTranslation(['landing', 'pets'])
  const [pets, setPets] = useState<Pet[]>([])
  const [status, setStatus] = useState<Status>('loading')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    setStatus('loading')
    listPublicPets().then(({ data, error }) => {
      if (cancelled) return
      // listPublicPets never rejects — a dead API comes back as
      // { data: null, error: 'Error de conexión' }. Branching on `error` rather
      // than on an empty array is the whole point: "we could not reach the
      // server" and "no pets are listed yet" are different facts and must not
      // share a surface.
      if (error) {
        setPets([])
        setStatus('error')
        return
      }
      setPets((data ?? []).slice(0, MAX))
      setStatus('ready')
    })
    return () => {
      cancelled = true
    }
  }, [attempt])

  // A genuinely empty catalogue is not a failure. There is nothing to feature,
  // so the strip steps aside rather than shouting on the landing page. A failed
  // fetch takes the other branch below and gets a way out.
  if (status === 'ready' && pets.length === 0) return null

  return (
    // Deliberately unlabelled: a <section> only becomes a region landmark once
    // it has an accessible name, and the public layout already owns the page's
    // landmarks. This matches the other landing sections.
    <section className="px-4 py-16">
      <div className="container mx-auto max-w-6xl">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold md:text-3xl">{t('featured.title')}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t('featured.subtitle')}</p>
          </div>
          <TransitionLink
            href="/pets"
            className="focus-ring group inline-flex shrink-0 items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-medium transition-colors hover:border-muted-foreground"
          >
            {t('featured.see_all')}
            <FontAwesomeIcon icon={faArrowRight} className="text-xs transition-transform duration-200 group-hover:translate-x-0.5" />
          </TransitionLink>
        </div>

        {status === 'loading' && (
          // Placeholder tiles rather than nothing: the strip sits between the
          // hero and How-it-works, and popping in would shove the page down.
          <div
            data-testid="featured-pets-skeleton"
            aria-hidden="true"
            className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"
          >
            {Array.from({ length: MAX }).map((_, i) => (
              <div key={i} className="aspect-square animate-pulse rounded-2xl bg-secondary" />
            ))}
          </div>
        )}

        {status === 'error' && <ErrorState message={t('featured.error')} onRetry={() => setAttempt((n) => n + 1)} />}

        {status === 'ready' && (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {pets.map((pet) => {
              const age = formatAge(pet.age)
              return (
                <li key={pet.id}>
                  {/*
                    Every card goes to /pets. There is no per-pet route to deep
                    link to: /pets?id= is not read anywhere, and /p?slug= lands
                    on the same grid without opening the detail sheet. Adding
                    query-param routing here would be a drive-by.
                  */}
                  <TransitionLink
                    href="/pets"
                    className="focus-ring group relative block aspect-square overflow-hidden rounded-2xl bg-secondary"
                  >
                    {pet.photos.length > 0 ? (
                      <Image
                        src={pet.photos[0].url}
                        alt=""
                        fill
                        className="object-cover transition-transform duration-200 group-hover:scale-[1.03]"
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                      />
                    ) : (
                      <span className="flex h-full items-center justify-center">
                        <FontAwesomeIcon icon={faPaw} className="text-2xl text-muted-foreground/30" />
                      </span>
                    )}
                    {/* No hover dodge here: the strip has no ⋯ menu to make room for. */}
                    {pet.rescue_center && (
                      <span className="pointer-events-none absolute top-2 right-2 z-10">
                        <VerifiedBadge className="text-xl" onPhoto />
                      </span>
                    )}
                    {/* Spans, not <p>: an <a> may only contain phrasing content. */}
                    <span className="absolute inset-x-0 bottom-0 flex items-center gap-2 bg-linear-to-t from-primary to-transparent p-2 pt-6">
                      {pet.rescue_center?.avatar_url && (
                        <Image
                          src={pet.rescue_center.avatar_url}
                          alt=""
                          width={30}
                          height={30}
                          className="h-[30px] w-[30px] shrink-0 rounded-full border-[1.5px] border-white/90 object-cover"
                        />
                      )}
                      <span className="block min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-background">{pet.name}</span>
                        <span className="block truncate text-[11px] text-background/80">
                          {t(`detail.${age.unit}`, { ns: 'pets', count: age.count })}
                        </span>
                      </span>
                    </span>
                  </TransitionLink>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </section>
  )
}
