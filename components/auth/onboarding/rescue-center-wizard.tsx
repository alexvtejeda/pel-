'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPaw } from '@fortawesome/free-solid-svg-icons'
import Stepper, { Step } from '@/components/Stepper'
import { createRescueCenter } from '@/lib/api/rescue-centers'

export function RescueCenterWizard() {
  const router = useRouter()
  const [centerName, setCenterName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [rnc, setRnc] = useState('')
  const [website, setWebsite] = useState('')
  const [instagram, setInstagram] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  const handleComplete = async () => {
    setSubmitting(true)
    setSubmitError(null)

    const { error } = await createRescueCenter({
      name: centerName,
      phone,
      address,
      ...(rnc && { rnc }),
      ...(website && { website }),
      instagram,
    })

    setSubmitting(false)

    if (error) {
      setSubmitError(error)
      return
    }

    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-md text-center space-y-6">
          <FontAwesomeIcon icon={faPaw} className="w-16 h-16" />
          <h1 className="text-2xl font-bold">¡Solicitud enviada!</h1>
          <p className="text-muted-foreground">
            Tu centro de rescate está en revisión. Nuestro equipo verificará la información y te notificará cuando sea aprobado.
          </p>
          <div className="p-4 bg-muted rounded-2xl text-sm text-muted-foreground">
            Estado: <span className="font-medium text-foreground">Pendiente de aprobación</span>
          </div>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors"
          >
            Ir al inicio
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold mb-1">Registra tu centro de rescate</h1>
          <p className="text-muted-foreground text-sm">Completa la información para comenzar</p>
        </div>

        <Stepper
          onFinalStepCompleted={handleComplete}
          backButtonText="Atrás"
          nextButtonText="Siguiente"
          nextButtonProps={{ disabled: submitting }}
        >
          {/* Step 1: Center name */}
          <Step>
            <div className="py-4 space-y-4">
              <h2 className="text-lg font-semibold mb-1">¿Cuál es el nombre de tu centro?</h2>
              <p className="text-muted-foreground text-sm mb-4">El nombre público de tu organización</p>
              <input
                type="text"
                placeholder="Nombre del centro de rescate"
                value={centerName}
                onChange={(e) => setCenterName(e.target.value)}
                className="w-full px-4 py-3 border border-input rounded-xl focus:outline-hidden focus:ring-2 focus:ring-ring focus:border-transparent bg-background"
              />
            </div>
          </Step>

          {/* Step 2: Phone */}
          <Step>
            <div className="py-4 space-y-4">
              <h2 className="text-lg font-semibold mb-1">¿Cuál es tu número de teléfono?</h2>
              <p className="text-muted-foreground text-sm mb-4">Para que los adoptantes puedan contactarte</p>
              <input
                type="tel"
                placeholder="809-000-0000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-4 py-3 border border-input rounded-xl focus:outline-hidden focus:ring-2 focus:ring-ring focus:border-transparent bg-background"
              />
            </div>
          </Step>

          {/* Step 3: Address */}
          <Step>
            <div className="py-4 space-y-4">
              <h2 className="text-lg font-semibold mb-1">¿Cuál es tu dirección?</h2>
              <p className="text-muted-foreground text-sm mb-4">Dirección física del centro</p>
              <input
                type="text"
                placeholder="Calle, número, sector"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-4 py-3 border border-input rounded-xl focus:outline-hidden focus:ring-2 focus:ring-ring focus:border-transparent bg-background"
              />
            </div>
          </Step>

          {/* Step 4: RNC */}
          <Step>
            <div className="py-4 space-y-4">
              <h2 className="text-lg font-semibold mb-1">¿Cuál es tu RNC?</h2>
              <p className="text-muted-foreground text-sm mb-4">Registro Nacional del Contribuyente — opcional</p>
              <input
                type="text"
                placeholder="1-23-45678-9 (opcional)"
                value={rnc}
                onChange={(e) => setRnc(e.target.value)}
                className="w-full px-4 py-3 border border-input rounded-xl focus:outline-hidden focus:ring-2 focus:ring-ring focus:border-transparent bg-background"
              />
            </div>
          </Step>

          {/* Step 5: Website */}
          <Step>
            <div className="py-4 space-y-4">
              <h2 className="text-lg font-semibold mb-1">¿Tienes sitio web?</h2>
              <p className="text-muted-foreground text-sm mb-4">Opcional, pero ayuda a generar confianza</p>
              <input
                type="url"
                placeholder="https://tucentro.com (opcional)"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className="w-full px-4 py-3 border border-input rounded-xl focus:outline-hidden focus:ring-2 focus:ring-ring focus:border-transparent bg-background"
              />
            </div>
          </Step>

          {/* Step 6: Instagram */}
          <Step>
            <div className="py-4 space-y-4">
              <h2 className="text-lg font-semibold mb-1">¿Cuál es tu Instagram?</h2>
              <p className="text-muted-foreground text-sm mb-4">Tu perfil de Instagram</p>
              <input
                type="text"
                placeholder="@tucentro"
                value={instagram}
                onChange={(e) => setInstagram(e.target.value)}
                className="w-full px-4 py-3 border border-input rounded-xl focus:outline-hidden focus:ring-2 focus:ring-ring focus:border-transparent bg-background"
              />
              {submitError && (
                <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-xl text-destructive text-sm">
                  {submitError}
                </div>
              )}
            </div>
          </Step>
        </Stepper>
      </div>
    </div>
  )
}
