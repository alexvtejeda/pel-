'use client'

import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCalendarDays } from '@fortawesome/free-solid-svg-icons'
import { Footer } from '@/components/footer'
import { EventBlock } from '@/components/events/event-block'
import { getEvents, EventItem } from '@/lib/api/events'
import { useRouteTransition } from '@/components/transitions/route-transition-context'

export function EventsPage() {
  const { t } = useTranslation('common')
  const [events, setEvents] = useState<EventItem[]>([])
  const [loading, setLoading] = useState(true)
  const { status: transitionStatus, type: transitionType } = useRouteTransition()
  const [holdSkeleton, setHoldSkeleton] = useState(
    () => transitionStatus === 'entering' && transitionType === 'skeleton',
  )

  useEffect(() => {
    if (transitionStatus === 'entering' && transitionType === 'skeleton') {
      setHoldSkeleton(true)
      const t = setTimeout(() => setHoldSkeleton(false), 150)
      return () => clearTimeout(t)
    }
  }, [transitionStatus, transitionType])

  useEffect(() => {
    getEvents().then(({ data }) => {
      if (data) setEvents(data)
      setLoading(false)
    })
  }, [])

  return (
    <div data-route="eventos" className="min-h-screen bg-muted">
      <section className="px-4 pt-12 pb-16 text-center bg-background border-input border border-t-0 border-b-2 mb-16">
        <h1 className="text-3xl md:text-4xl font-extrabold mb-3">{t('events.title')}</h1>
        <p className="text-muted-foreground max-w-md mx-auto">{t('events.subtitle')}</p>
      </section>

      <section className="min-h-screen px-4 pb-16 bg-muted">
        <div className="container mx-auto max-w-5xl space-y-16">
          {loading || holdSkeleton ? (
            <div className="flex justify-center py-20">
              <div className="w-8 h-8 border-2 border-muted-foreground/30 border-t-foreground rounded-full animate-spin" />
            </div>
          ) : events.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4 text-muted-foreground">
              <div className="w-16 h-16 rounded-2xl bg-background flex items-center justify-center">
                <FontAwesomeIcon icon={faCalendarDays} className="text-2xl text-foreground" />
              </div>
              <p className="text-sm">{t('events.empty')}</p>
            </div>
          ) : (
              events.map((event, index) => (
                <EventBlock key={event.id} event={event} index={index} />
              ))
            
          )}
        </div>
      </section>

      <Footer />
    </div>
  )
}
