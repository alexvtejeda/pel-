'use client'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCalendarDays, faClock, faPlus } from '@fortawesome/free-solid-svg-icons'
import { Calendar } from '@/components/ui/calendar'
import { es, enUS } from 'react-day-picker/locale'
import { Button } from '@/components/ui/button'
import { AddEventModal } from './add-event-modal'

export interface AgendaItem {
  id: string
  personName: string
  petName: string
  date: Date
  type: 'meeting' | 'transport' | 'followup' | 'event'
}

const typeLabelKeys: Record<AgendaItem['type'], string> = {
  meeting:   'agenda.type_meeting',
  transport: 'agenda.type_transport',
  followup:  'agenda.type_followup',
  event:     'agenda.type_event',
}

const typeColors: Record<AgendaItem['type'], string> = {
  meeting:   'bg-blue-100 text-blue-800',
  transport: 'bg-amber-100 text-amber-800',
  followup:  'bg-purple-100 text-purple-800',
  event:     'bg-pop-550/10 text-pop-550',
}

const typeBorderColors: Record<AgendaItem['type'], string> = {
  meeting:   'border-l-blue-500',
  transport: 'border-l-amber-500',
  followup:  'border-l-purple-500',
  event:     'border-l-pop-550',
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth()    === b.getMonth()    &&
    a.getDate()     === b.getDate()
  )
}

interface AgendaTabProps {
  items: AgendaItem[]
  onEventCreated?: (event: any) => void
}

export function AgendaTab({ items, onEventCreated }: AgendaTabProps) {
  const { t, i18n } = useTranslation('pets')
  const calendarLocale = i18n.language?.startsWith('en') ? enUS : es
  const dateLocale = i18n.language?.startsWith('en') ? 'en-US' : 'es-DO'
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [addEventOpen, setAddEventOpen] = useState(false)
  const today = new Date()
  const isToday = isSameDay(selectedDate, today)

  const datesWithEvents = items.map(
    item => new Date(item.date.getFullYear(), item.date.getMonth(), item.date.getDate())
  )

  const dayEvents = items.filter(item => isSameDay(item.date, selectedDate))

  // Next upcoming events (up to 3, from today onwards)
  const upcomingEvents = items
    .filter(item => item.date >= today && !isSameDay(item.date, selectedDate))
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, 3)

  return (
    <>
    <div className="flex flex-col lg:flex-row gap-6 lg:items-stretch">
      {/* Left column: Calendar + upcoming */}
      <div className="w-full lg:w-85 shrink-0 space-y-4">
        <div className="rounded-2xl border bg-card p-3">
          <Calendar
            mode="single"
            locale={calendarLocale}
            selected={selectedDate}
            onSelect={(date) => date && setSelectedDate(date)}
            classNames={{ root: 'w-full' }}
          />
        </div>

        {/* Upcoming events (only when there are items not on selected date) */}
        {upcomingEvents.length > 0 && (
          <div className="rounded-2xl border bg-card p-4 space-y-3">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t('agenda.upcoming')}</h4>
            {upcomingEvents.map(item => (
              <button
                key={item.id}
                onClick={() => setSelectedDate(item.date)}
                className="w-full text-left flex items-center gap-3 px-2 py-1.5 rounded-xl hover:bg-accent/50 transition-colors"
              >
                <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${typeColors[item.type].split(' ')[0].replace('100', '500')}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{item.personName} — {item.petName}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.date.toLocaleDateString(dateLocale, { weekday: 'short', day: 'numeric', month: 'short' })}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Right column: Selected date events */}
      <div className="w-full flex-1 flex flex-col gap-4">
        {/* Date header */}
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-base first-letter:uppercase">
            {selectedDate.toLocaleDateString(dateLocale, {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })}
          </h3>
          <div className="flex items-center gap-2">
            {!isToday && (
              <button
                onClick={() => setSelectedDate(new Date())}
                className="text-xs font-medium text-pop-550 hover:text-pop-450 transition-colors"
              >
                {t('agenda.today')}
              </button>
            )}
            <Button onClick={() => setAddEventOpen(true)} className="gap-2 shrink-0">
              <FontAwesomeIcon icon={faPlus} className="text-sm" />
              {t('events.create', { ns: 'common' })}
            </Button>
          </div>
        </div>

        {dayEvents.length === 0 ? (
          <div className="rounded-2xl border border-dashed flex flex-col items-center justify-center flex-1 gap-3 text-muted-foreground">
            <div className="w-12 h-12 rounded-2xl bg-muted/50 flex items-center justify-center">
              <FontAwesomeIcon icon={faCalendarDays} className="text-lg text-muted-foreground/60" />
            </div>
            <div className="text-center space-y-1">
              <p className="text-sm font-medium">{t('agenda.no_events')}</p>
              <p className="text-xs text-muted-foreground/60">
                {isToday ? t('agenda.no_events_today') : t('agenda.no_events_day')}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {dayEvents.map(item => (
              <div
                key={item.id}
                className={`rounded-2xl border border-l-[3px] ${typeBorderColors[item.type]} bg-card p-4 flex items-center gap-3`}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{item.personName}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <FontAwesomeIcon icon={faClock} className="text-[10px]" />
                    {item.date.toLocaleTimeString(dateLocale, { hour: '2-digit', minute: '2-digit' })}
                    <span className="mx-0.5">·</span>
                    {t('agenda.pet_label')} {item.petName}
                  </p>
                </div>
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-xl shrink-0 ${typeColors[item.type]}`}>
                  {t(typeLabelKeys[item.type])}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>

    <AddEventModal
      open={addEventOpen}
      onConfirm={(event) => {
        setAddEventOpen(false)
        onEventCreated?.(event)
      }}
      onClose={() => setAddEventOpen(false)}
    />
    </>
  )
}
