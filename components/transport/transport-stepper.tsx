'use client'

import { useTranslation } from 'react-i18next'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCheck } from '@fortawesome/free-solid-svg-icons'
import { TripStop } from '@/lib/api/transport'

interface TransportStepperProps {
  stops: TripStop[]
  status: string
}

export function TransportStepper({ stops, status }: TransportStepperProps) {
  const { t } = useTranslation('transport')

  const completedCount = (stops ?? []).filter(s => s.completed_at).length
  const isCancelled = status === 'cancelled'
  const isCompleted = status === 'completed'

  return (
    <div className="absolute top-3 left-4 right-4 z-20 bg-sidebar/92 backdrop-blur-xl rounded-2xl border border-border px-4 py-2.5">
      <div className="flex items-center justify-center gap-3">
        {(stops ?? []).map((stop, i) => {
          const isStopCompleted = !!stop.completed_at || isCompleted
          const isActive = !isStopCompleted && i === completedCount
          const isPending = !isStopCompleted && !isActive

          return (
            <div key={stop.id} className="flex items-center gap-3">
              {i > 0 && (
                <div className={`w-6 h-0.5 ${isStopCompleted || isActive ? 'bg-pop-500' : 'bg-muted'}`} />
              )}
              <div className="flex items-center gap-1.5">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  isCancelled ? 'bg-muted text-muted-foreground' :
                  isStopCompleted ? 'bg-pop-500 text-background' :
                  isActive ? 'bg-pop-500 text-background' :
                  'bg-muted text-muted-foreground'
                }`}>
                  {isStopCompleted ? <FontAwesomeIcon icon={faCheck} className="text-[10px]" /> : i + 1}
                </div>
                <span className={`text-[10px] hidden sm:inline ${
                  isCancelled ? 'text-muted-foreground line-through' :
                  isActive ? 'text-foreground font-semibold' :
                  'text-muted-foreground'
                }`}>
                  {i === 0 ? t('steps.pickup') : i === stops.length - 1 ? t('steps.delivered') : t('steps.in_transit')}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
