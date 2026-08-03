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
      case 'requested':
      case 'accepted': return t('drawer.searching_driver')
      case 'picking_up':
      case 'in_transit': return t('drawer.pet_on_way')
      case 'completed': return t('drawer.delivery_complete')
      case 'cancelled': return t('drawer.trip_cancelled')
      default: return ''
    }
  })()

  const statusColor = (() => {
    switch (trip.status) {
      case 'requested':
      case 'accepted': return 'bg-yellow-500/20 text-yellow-500'
      case 'picking_up':
      case 'in_transit': return 'bg-pop-500/20 text-pop-500'
      case 'completed': return 'bg-green-500/20 text-green-500'
      case 'cancelled': return 'bg-destructive/20 text-destructive'
      default: return 'bg-muted text-muted-foreground'
    }
  })()

  const completedStops = (trip.stops ?? []).filter(s => s.completed_at).length
  const expanded = snap === 0.65
  const canCancel =
    trip.status === 'requested' ||
    trip.status === 'accepted' ||
    trip.status === 'picking_up' ||
    trip.status === 'in_transit'

  return (
    <Drawer
      open
      modal={false}
      snapPoints={[0.15, 0.65]}
      activeSnapPoint={snap}
      setActiveSnapPoint={setSnap}
      shouldScaleBackground={false}
    >
      {/*
        `top-0 mt-0 h-full` is load-bearing, not cosmetic — do not drop it.

        Vaul turns a fractional snap point into an offset of
        `innerHeight - innerHeight * snapPoint` and applies it as translateY.
        That formula only lands where you want if the sheet spans the viewport
        from `top: 0`. The shared `DrawerContent` primitive is `bottom-0 mt-24
        h-auto`, i.e. already bottom-anchored, so the translate stacks on top of
        that anchoring and pushes the sheet clean off the bottom of the screen
        (at a 900px viewport: natural top 816 + 765 translate ≈ 1581).

        These three classes override the primitive's `bottom`-anchored box via
        `cn()`/tailwind-merge (`h-auto` -> `h-full`, `mt-24` -> `mt-0`) so the
        element spans the full viewport and the snap offsets mean what they say.
        This is the only drawer in the app that passes `snapPoints`, which is
        why the fix lives here and not in `components/ui/drawer.tsx`.
      */}
      <DrawerContent className="bg-sidebar/95 backdrop-blur-xl border-border rounded-t-2xl top-0 mt-0 h-full">
        {/*
          The sheet element above is a full 100vh box (see the note on
          `h-full`), but only `snap * viewport` of it is ever above the fold.
          This column bounds the *visible* part to exactly that, so the content
          inside can never run past the bottom of the screen: at 390x667 with 8
          stops, "Cancelar viaje" used to land at y=741 with nothing scrollable
          anywhere in the subtree.

          Height is a percentage of the sheet, not `vh`: the sheet is a fixed
          element sized to the containing block vaul itself measures
          (`window.innerHeight`), whereas `100vh` on mobile is the *large*
          viewport and overshoots whenever browser chrome is showing. `1.5rem`
          is the drag handle (`mt-4 h-2`) the primitive renders above us.

          `min-h-0` is what actually makes the scroll happen — a flex child
          defaults to `min-height: auto` and refuses to shrink under its
          content, so `overflow-y-auto` alone never engages and the box just
          grows again. Both the expanded region and the scroll region need it.

          The stop list is `shrink`, not `flex-1`, on purpose: it keeps its
          natural height while it fits (so the cancel button sits right under
          the payment block, as it always has, instead of being flung to the
          bottom edge on a tall viewport) and only gives up height — becoming
          scrollable — once the list is too long. Either way the button lives
          outside the scroll region, so it can never be scrolled out of reach.
        */}
        <div
          data-testid="transport-drawer-column"
          className={`flex flex-col ${expanded ? 'h-[calc(65%_-_1.5rem)]' : 'h-[calc(15%_-_1.5rem)]'}`}
        >
          <DrawerHeader className="px-4 pt-2 pb-3 shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <DrawerTitle className="text-sm font-semibold text-foreground">
                  {statusMessage}
                </DrawerTitle>
                <DrawerDescription className="text-xs text-muted-foreground mt-0.5">
                  {driverLocation?.eta_minutes
                    ? t('drawer.eta', { minutes: driverLocation.eta_minutes })
                    : t('drawer.stop_of', { current: completedStops + 1, total: (trip.stops ?? []).length })}
                </DrawerDescription>
              </div>
              <div className={`px-3 py-1 rounded-xl text-xs font-semibold ${statusColor}`}>
                {t(`status.${trip.status}`)}
              </div>
            </div>
          </DrawerHeader>

          {/* Expanded content — only visible when snapped to larger point */}
          <div className="flex flex-col flex-1 min-h-0" style={{ display: expanded ? 'flex' : 'none' }}>
            {/* Everything above the pinned action scrolls */}
            <div data-testid="transport-drawer-scroll" className="px-4 shrink min-h-0 overflow-y-auto">
              {/* Stop list */}
              <div className="border-t border-border pt-3 mb-3">
                <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  {t('drawer.stops')}
                </div>
                <div className="flex flex-col gap-2.5">
                  {(trip.stops ?? []).map((stop, i) => {
                    const isCompleted = !!stop.completed_at
                    const isActive = !isCompleted && i === completedStops
                    return (
                      <div key={stop.id} className="flex items-center gap-2.5">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 ${
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
                            {i === 0 ? t('steps.pickup') : i === (trip.stops ?? []).length - 1 ? t('steps.delivered') : t('steps.in_transit')}
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
            </div>

            {/* Cancel button — only for pre-transit trips. Pinned outside the
                scroll region so a long stop list can never bury it. */}
            {canCancel && (
              <div className="px-4 pt-3 pb-4 border-t border-border shrink-0">
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
              </div>
            )}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  )
}
