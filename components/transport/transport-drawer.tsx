'use client'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCheck, faLocationDot, faCreditCard } from '@fortawesome/free-solid-svg-icons'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/drawer'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Trip, DriverLocation } from '@/lib/api/transport'

interface TransportDrawerProps {
  trip: Trip
  driverLocation: DriverLocation | null
  onCancel: () => void
}

export function TransportDrawer({ trip, driverLocation, onCancel }: TransportDrawerProps) {
  const { t } = useTranslation('transport')
  const [snap, setSnap] = useState<number | string | null>(0.15)

  const statusMessage = (() => {
    switch (trip.status) {
      case 'pending': return t('drawer.searching_driver')
      case 'active': return t('drawer.pet_on_way')
      case 'completed': return t('drawer.delivery_complete')
      case 'cancelled': return t('drawer.trip_cancelled')
      default: return ''
    }
  })()

  const statusColor = (() => {
    switch (trip.status) {
      case 'pending': return 'bg-yellow-500/20 text-yellow-500'
      case 'active': return 'bg-pop-500/20 text-pop-500'
      case 'completed': return 'bg-green-500/20 text-green-500'
      case 'cancelled': return 'bg-destructive/20 text-destructive'
      default: return 'bg-muted text-muted-foreground'
    }
  })()

  const completedStops = trip.stops.filter(s => s.completed_at).length

  return (
    <Drawer
      open
      modal={false}
      snapPoints={[0.15, 0.65]}
      activeSnapPoint={snap}
      setActiveSnapPoint={setSnap}
      shouldScaleBackground={false}
    >
      <DrawerContent className="bg-sidebar/95 backdrop-blur-xl border-border rounded-t-2xl">
        <DrawerHeader className="px-4 pt-2 pb-3">
          <div className="flex items-center justify-between">
            <div>
              <DrawerTitle className="text-sm font-semibold text-foreground">
                {statusMessage}
              </DrawerTitle>
              <DrawerDescription className="text-xs text-muted-foreground mt-0.5">
                {driverLocation?.eta_minutes
                  ? t('drawer.eta', { minutes: driverLocation.eta_minutes })
                  : t('drawer.stop_of', { current: completedStops + 1, total: trip.stops.length })}
              </DrawerDescription>
            </div>
            <div className={`px-3 py-1 rounded-xl text-xs font-semibold ${statusColor}`}>
              {t(`status.${trip.status}`)}
            </div>
          </div>
        </DrawerHeader>

        {/* Expanded content — only visible when snapped to larger point */}
        <div className="px-4 pb-4 overflow-y-auto" style={{ display: snap === 0.65 ? 'block' : 'none' }}>
          {/* Stop list */}
          <div className="border-t border-border pt-3 mb-3">
            <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              {t('drawer.stops')}
            </div>
            <div className="flex flex-col gap-2.5">
              {trip.stops.map((stop, i) => {
                const isCompleted = !!stop.completed_at
                const isActive = !isCompleted && i === completedStops
                return (
                  <div key={stop.id} className="flex items-center gap-2.5">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold ${
                      isCompleted ? 'bg-pop-500 text-background' :
                      isActive ? 'bg-pop-500 text-background' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {isCompleted ? <FontAwesomeIcon icon={faCheck} className="text-[9px]" /> : i + 1}
                    </div>
                    <div>
                      <div className={`text-xs ${isCompleted ? 'text-muted-foreground line-through' : isActive ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                        {stop.address}
                      </div>
                      <div className="text-[9px] text-muted-foreground">
                        {i === 0 ? t('steps.pickup') : i === trip.stops.length - 1 ? t('steps.delivered') : t('steps.in_transit')}
                        {isCompleted && ` • ${t('drawer.completed_label')}`}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Payment placeholder */}
          <div className="border-t border-border pt-3 mb-3">
            <div className="flex items-center gap-2.5 bg-background p-3 rounded-2xl border border-border">
              <FontAwesomeIcon icon={faCreditCard} className="text-base text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{t('drawer.payment')}</span>
            </div>
          </div>

          {/* Cancel button — only for pending/active trips */}
          {(trip.status === 'pending' || trip.status === 'active') && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button className="w-full py-2.5 border border-red-500/40 text-red-500 rounded-xl text-xs font-medium">
                  {t('actions.cancel_trip')}
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t('actions.cancel_trip')}</AlertDialogTitle>
                  <AlertDialogDescription>{t('actions.cancel_confirm')}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t('actions.cancel_dialog_dismiss')}</AlertDialogCancel>
                  <AlertDialogAction onClick={onCancel} className="bg-destructive text-white hover:bg-destructive/90">
                    {t('actions.cancel_confirm_action')}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  )
}
