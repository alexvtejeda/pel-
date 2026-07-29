'use client'

import { useEffect, useState, useCallback } from 'react'
import { UnifiedProvider, listProviders } from '@/lib/api/providers'
import { ProviderGrid } from './provider-grid'
import { ProviderDetail } from './provider-detail'
import { useMediaQuery } from '@/lib/hooks/use-media-query'
import { useRouteTransition } from '@/components/transitions/route-transition-context'
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Drawer, DrawerContent, DrawerTitle, DrawerDescription } from '@/components/ui/drawer'
import { Footer } from '@/components/footer'

export function AliadosPage() {
  const [providers, setProviders] = useState<UnifiedProvider[]>([])
  const [selected, setSelected] = useState<UnifiedProvider | null>(null)
  const [loading, setLoading] = useState(true)
  const { status: transitionStatus, type: transitionType } = useRouteTransition()
  const [holdSkeleton, setHoldSkeleton] = useState(
    () => transitionStatus === 'entering' && transitionType === 'skeleton',
  )
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const useSheet = useMediaQuery('(min-width: 640px)')

  const fetchProviders = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error: err } = await listProviders()
    if (err) {
      setError(err)
      setProviders([])
    } else {
      setProviders(data || [])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    if (transitionStatus === 'entering' && transitionType === 'skeleton') {
      setHoldSkeleton(true)
      const t = setTimeout(() => setHoldSkeleton(false), 150)
      return () => clearTimeout(t)
    }
  }, [transitionStatus, transitionType])

  useEffect(() => {
    fetchProviders()
  }, [fetchProviders])

  const handleSelect = useCallback((provider: UnifiedProvider) => {
    setSelected(provider)
    setOpen(true)
  }, [])

  return (
    <div data-route="aliados" className="flex flex-col min-h-screen bg-muted">
      <div className="container mx-auto flex-1 flex flex-col sm:px-4 sm:pb-0">
        <ProviderGrid
          providers={providers}
          loading={loading || holdSkeleton}
          error={error}
          selectedId={selected?.id ?? null}
          onSelect={handleSelect}
          onRetry={fetchProviders}
        />
      </div>

      {/* Desktop: Sheet from right */}
      {useSheet ? (
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent side="right" className="p-0 overflow-y-auto">
            <SheetTitle className="sr-only">{selected?.name ?? ''}</SheetTitle>
            <SheetDescription className="sr-only">{selected?.description ?? ''}</SheetDescription>
            {selected && <ProviderDetail provider={selected} />}
          </SheetContent>
        </Sheet>
      ) : (
        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerContent className="max-h-[85vh]">
            <DrawerTitle className="sr-only">{selected?.name ?? ''}</DrawerTitle>
            <DrawerDescription className="sr-only">{selected?.description ?? ''}</DrawerDescription>
            <div className="overflow-y-auto">
              {selected && <ProviderDetail provider={selected} />}
            </div>
          </DrawerContent>
        </Drawer>
      )}
      <Footer />
    </div>
  )
}
