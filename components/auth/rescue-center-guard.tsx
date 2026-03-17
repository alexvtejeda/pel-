'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPaw, faCircleXmark } from '@fortawesome/free-solid-svg-icons'
import { BackgroundBeams } from '@/components/ui/beams'
import { getMyRescueCenter, RescueCenter } from '@/lib/api/rescue-centers'

type Status = 'loading' | 'active' | 'pending' | 'rejected' | 'missing'

export function RescueCenterGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [status, setStatus] = useState<Status>('loading')
  const [center, setCenter] = useState<RescueCenter | null>(null)

  useEffect(() => {
    const check = () => {
      getMyRescueCenter().then(({ data, error }) => {
        if (error || !data) {
          setStatus('missing')
          return
        }
        setCenter(data)
        setStatus(data.status as Status)
      })
    }
    check()
  }, [])

  // Poll every 10s while pending so approval auto-transitions to dashboard
  useEffect(() => {
    if (status !== 'pending') return
    const interval = setInterval(() => {
      getMyRescueCenter().then(({ data }) => {
        if (data && data.status !== 'pending') {
          setCenter(data)
          setStatus(data.status as Status)
        }
      })
    }, 10000)
    return () => clearInterval(interval)
  }, [status])

  useEffect(() => {
    if (status === 'missing') {
      router.replace('/auth/onboarding/rescue_center')
    }
  }, [status, router])

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
      </div>
    )
  }

  if (status === 'missing') {
    return null
  }

  if (status === 'pending') {
    return (
      <div className="backdark relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-4">
        <BackgroundBeams />
        <div className="relative z-10 w-full rounded-lg max-w-md text-center space-y-6 bg-background/90 backdrop-blur-xl p-16 inset-shadow-[1px_1px_1px_var(--color-input)]">
          <FontAwesomeIcon icon={faPaw} className="w-16 h-16 text-foreground" />
          <h1 className="text-2xl font-bold text-foreground">Solicitud en revisión</h1>
          <p className="text-muted-foreground">
            Tu centro <span className="font-medium text-foreground">{center?.name}</span> está siendo verificado por nuestro equipo. Te notificaremos cuando sea aprobado.
          </p>
          <div className="p-4 bg-muted border border-border rounded-2xl text-sm text-muted-foreground">
            Estado: <span className="font-medium text-foreground">Pendiente de aprobación</span>
          </div>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-3 bg-pop-550 text-white rounded-xl font-medium hover:opacity-90 transition-opacity"
          >
            Ir al inicio
          </button>
        </div>
      </div>
    )
  }

  if (status === 'rejected') {
    return (
      <div className="backdark relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-4">
        <BackgroundBeams />
        <div className="relative z-10 w-full rounded-lg max-w-md text-center space-y-6 bg-background/90 backdrop-blur-xl p-16 inset-shadow-[1px_1px_1px_var(--color-input)]">
          <FontAwesomeIcon icon={faCircleXmark} className="w-16 h-16 text-destructive" />
          <h1 className="text-2xl font-bold text-foreground">Solicitud rechazada</h1>
          <p className="text-muted-foreground">
            Tu solicitud para <span className="font-medium text-foreground">{center?.name}</span> no fue aprobada. Contáctanos para más información.
          </p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-3 bg-pop-550 text-white rounded-xl font-medium hover:opacity-90 transition-opacity"
          >
            Ir al inicio
          </button>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
