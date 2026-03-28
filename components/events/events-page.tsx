'use client'

import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCalendarDays } from '@fortawesome/free-solid-svg-icons'
import { PetsHeader } from '@/components/pets/pets-header'
import { Footer } from '@/components/footer'
import { EventBlock } from '@/components/events/event-block'
import { getEvents, EventItem } from '@/lib/api/events'

export function EventsPage() {
  const { t } = useTranslation('common')
  const [events, setEvents] = useState<EventItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getEvents().then(({ data }) => {
      if (data) setEvents(data)
      setLoading(false)
    })
  }, [])

  return (
    <div className="min-h-screen bg-background">
      <PetsHeader />

      <section className="px-4 pt-16 pb-8 text-center">
        <h1 className="text-3xl md:text-4xl font-extrabold mb-3">{t('events.title')}</h1>
        <p className="text-muted-foreground max-w-md mx-auto">{t('events.subtitle')}</p>
      </section>

      <section className="px-4 pb-16">
        <div className="container mx-auto max-w-5xl space-y-16">
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="w-8 h-8 border-2 border-muted-foreground/30 border-t-foreground rounded-full animate-spin" />
            </div>
          ) : events.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4 text-muted-foreground">
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
                <FontAwesomeIcon icon={faCalendarDays} className="text-2xl text-muted-foreground/40" />
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
