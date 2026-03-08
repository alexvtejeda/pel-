'use client'

import { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCalendarDays } from '@fortawesome/free-solid-svg-icons'
import { Calendar } from '@/components/ui/calendar'

export interface AgendaItem {
  id: string
  personName: string
  petName: string
  date: Date
  type: 'meeting' | 'transport' | 'followup'
}

const typeLabels: Record<AgendaItem['type'], string> = {
  meeting:   'Reunión',
  transport: 'Transporte',
  followup:  'Seguimiento',
}

const typeColors: Record<AgendaItem['type'], string> = {
  meeting:   'bg-blue-100 text-blue-800',
  transport: 'bg-yellow-100 text-yellow-800',
  followup:  'bg-purple-100 text-purple-800',
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
}

export function AgendaTab({ items }: AgendaTabProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())

  const datesWithEvents = items.map(
    item => new Date(item.date.getFullYear(), item.date.getMonth(), item.date.getDate())
  )

  const dayEvents = items.filter(item => isSameDay(item.date, selectedDate))

  return (
    <div className="flex flex-col md:flex-row gap-6 items-start">
      {/* Calendar */}
      <div className="rounded-2xl border bg-card p-8 space-y-3">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={(date) => date && setSelectedDate(date)}
          modifiers={{ hasEvent: datesWithEvents }}
          modifiersClassNames={{ hasEvent: 'border border-primary/50 rounded-md' }}
          style={{ '--cell-size': '3rem' } as React.CSSProperties}
          classNames={{
            month_caption: 'flex h-[--cell-size] w-full items-center justify-center px-14',
            button_previous: 'absolute left-2 h-8 w-8 flex items-center justify-center rounded-xl border border-input hover:bg-muted transition-colors',
            button_next: 'absolute right-2 h-8 w-8 flex items-center justify-center rounded-xl border border-input hover:bg-muted transition-colors',
          }}
        />
      </div>

      {/* Events for selected date */}
      <div className="w-full md:w-72 shrink-0 space-y-3 flex-1">
        <h3 className="font-medium text-sm text-muted-foreground capitalize">
          {selectedDate.toLocaleDateString('es-DO', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
          })}
        </h3>

        {dayEvents.length === 0 ? (
          <div className="rounded-2xl border border-dashed flex flex-col items-center justify-center py-16 gap-2 text-muted-foreground">
            <FontAwesomeIcon icon={faCalendarDays} className="w-7 h-7" />
            <p className="text-sm">No hay eventos este día</p>
          </div>
        ) : (
          dayEvents.map(item => (
            <div key={item.id} className="rounded-2xl border bg-card p-4 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{item.personName}</p>
                <p className="text-xs text-muted-foreground">Mascota: {item.petName}</p>
              </div>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-xl shrink-0 ${typeColors[item.type]}`}>
                {typeLabels[item.type]}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
