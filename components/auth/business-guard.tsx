'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faBriefcase, faCircleXmark } from '@fortawesome/free-solid-svg-icons'
import { BackgroundBeams } from '@/components/ui/beams'
import { getMyBusiness, Business } from '@/lib/api/businesses'

type Status = 'loading' | 'active' | 'pending' | 'rejected' | 'missing'

export function BusinessGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [status, setStatus] = useState<Status>('loading')
  const [business, setBusiness] = useState<Business | null>(null)

  useEffect(() => {
    let retries = 0
    const check = () => {
      getMyBusiness().then(({ data, error }) => {
        if (error || !data) {
          if (retries < 1) {
            retries++
            setTimeout(check, 1000)
            return
          }
          setStatus('missing')
          return
        }
        setBusiness(data)
        setStatus(data.status as Status)
      })
    }
    check()
  }, [])

  // Poll every 10s while pending so approval auto-transitions to dashboard
  useEffect(() => {
    if (status !== 'pending') return
    const interval = setInterval(() => {
      getMyBusiness().then(({ data }) => {
        if (data && data.status !== 'pending') {
          setBusiness(data)
          setStatus(data.status as Status)
        }
      })
    }, 10000)
    return () => clearInterval(interval)
  }, [status])

  useEffect(() => {
    if (status === 'missing') {
      router.replace('/auth/onboarding/business')
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
        <div className="relative z-10 w-full rounded-2xl max-w-md text-center space-y-6 bg-background/90 backdrop-blur-xl p-16 inset-shadow-[1px_1px_1px_var(--color-input)]">
          <FontAwesomeIcon icon={faBriefcase} className="text-6xl text-foreground" />
          <h1 className="text-2xl font-bold text-foreground">Solicitud en revisión</h1>
          <p className="text-muted-foreground">
            Tu negocio <span className="font-medium text-foreground">{business?.name}</span> está pendiente de aprobación. Te notificaremos cuando sea aprobado.
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
        <div className="relative z-10 w-full rounded-2xl max-w-md text-center space-y-6 bg-background/90 backdrop-blur-xl p-16 inset-shadow-[1px_1px_1px_var(--color-input)]">
          <FontAwesomeIcon icon={faCircleXmark} className="text-6xl text-destructive" />
          <h1 className="text-2xl font-bold text-foreground">Solicitud rechazada</h1>
          <p className="text-muted-foreground">
            Tu solicitud para <span className="font-medium text-foreground">{business?.name}</span> fue rechazada.
            {business?.rejection_reason && (
              <> Razón: <span className="font-medium text-foreground">{business.rejection_reason}</span></>
            )}
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
