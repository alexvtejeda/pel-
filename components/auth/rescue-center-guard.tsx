'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCircleCheck, faCircleXmark } from '@fortawesome/free-solid-svg-icons'
import { getMyRescueCenter, RescueCenter } from '@/lib/api/rescue-centers'

type Status = 'loading' | 'active' | 'pending' | 'rejected' | 'missing'

export function RescueCenterGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [status, setStatus] = useState<Status>('loading')
  const [center, setCenter] = useState<RescueCenter | null>(null)

  useEffect(() => {
    getMyRescueCenter().then(({ data, error }) => {
      if (error || !data) {
        setStatus('missing')
        return
      }
      setCenter(data)
      setStatus(data.status as Status)
    })
  }, [])

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
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="max-w-sm w-full text-center flex flex-col items-center gap-4">
          <FontAwesomeIcon icon={faCircleCheck} className="w-12 h-12 text-muted-foreground" />
          <h1 className="text-xl font-semibold">Solicitud en revisión</h1>
          <p className="text-sm text-muted-foreground">
            Tu centro <span className="font-medium text-foreground">{center?.name}</span> está siendo verificado por nuestro equipo. Te notificaremos cuando sea aprobado.
          </p>
        </div>
      </div>
    )
  }

  if (status === 'rejected') {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="max-w-sm w-full text-center flex flex-col items-center gap-4">
          <FontAwesomeIcon icon={faCircleXmark} className="w-12 h-12 text-destructive" />
          <h1 className="text-xl font-semibold">Solicitud rechazada</h1>
          <p className="text-sm text-muted-foreground">
            Tu solicitud para <span className="font-medium text-foreground">{center?.name}</span> no fue aprobada. Contáctanos para más información.
          </p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
