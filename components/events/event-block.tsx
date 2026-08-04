'use client'

import { useState } from 'react'
import { useLocaleRouter } from '@/lib/i18n/use-locale'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCalendarDays, faLocationDot, faClock } from '@fortawesome/free-solid-svg-icons'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/lib/contexts/auth-context'
import { toggleAttendance, EventItem } from '@/lib/api/events'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

interface EventBlockProps {
  event: EventItem
  index: number
}

export function EventBlock({ event, index }: EventBlockProps) {
  const { t } = useTranslation('common')
  const { user } = useAuth()
  const router = useLocaleRouter()
  const [attending, setAttending] = useState(event.is_attending)
  const [count, setCount] = useState(event.attendee_count)
  const [toggling, setToggling] = useState(false)

  const isReversed = index % 2 !== 0

  const handleAttend = async () => {
    if (!user) {
      router.push('/auth/login')
      return
    }
    setToggling(true)
    const { data } = await toggleAttendance(event.id)
    if (data) {
      setAttending(data.attending)
      setCount(data.attendee_count)
    }
    setToggling(false)
  }

  const formattedDate = format(parseISO(event.date), "d 'de' MMMM, yyyy", { locale: es })

  return (
    <div className={`border-input border border-l-2 border-b-2 flex flex-col bg-background rounded-2xl md:flex-row gap-8 md:gap-12 items-center ${isReversed ? 'md:flex-row-reverse' : ''}`}>
      {/* Image */}
      <div className="flex-1 w-full">
        {event.photo_url ? (
          <img src={event.photo_url} alt={event.title} className="w-full aspect-3/2 object-cover rounded-2xl shadow-[8px_0px_10px_var(--color-input)]" />
        ) : (
          <div className="w-full aspect-3/2 rounded-2xl bg-background border-input border-l-2 flex items-center justify-center shadow-xl">
            <FontAwesomeIcon icon={faCalendarDays} className="text-4xl text-muted-foreground/30" />
          </div>
        )}
      </div>

      {/* Text */}
      <div className="flex-1 items-center flex flex-col justify-center gap-3">
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
          {event.rescue_center.name}
        </p>
        <h3 className="text-2xl font-bold">{event.title}</h3>
        <p className="text-muted-foreground leading-relaxed">{event.description}</p>
        <div className="flex flex-col gap-1.5 text-sm text-muted-foreground">
          <span className="flex items-center gap-2">
            <FontAwesomeIcon icon={faCalendarDays} className="text-xs" />
            {formattedDate}
          </span>
          <span className="flex items-center gap-2">
            <FontAwesomeIcon icon={faClock} className="text-xs" />
            {event.time}
          </span>
          <span className="flex items-center gap-2">
            <FontAwesomeIcon icon={faLocationDot} className="text-xs" />
            {event.location}
          </span>
        </div>
        <div className="mt-2">
          <button
            onClick={handleAttend}
            disabled={toggling}
            className={`px-5 py-2 rounded-xl text-sm font-medium transition-colors ${
              attending
                ? 'bg-pop-550 text-white hover:bg-pop-500'
                : 'border border-border text-foreground hover:bg-muted'
            }`}
          >
            {t('events.attending')} · {count}
          </button>
        </div>
      </div>
    </div>
  )
}
