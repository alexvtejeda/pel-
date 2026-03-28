'use client'
import { OnboardingNav } from './onboarding-nav'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faArrowLeft,
  faPaw,
} from '@fortawesome/free-solid-svg-icons'
import { createRescueCenter, getMyRescueCenter } from '@/lib/api/rescue-centers'
import { BackgroundBeams } from '@/components/ui/beams'
import { MfaEnrollment } from '@/components/auth/mfa/mfa-enrollment'
import { getMethods } from '@/lib/api/mfa'


export function RescueCenterWizard() {
  const router = useRouter()

  // If RC already exists, redirect to dashboard (prevents re-showing form after approval)
  useEffect(() => {
    getMyRescueCenter().then(({ data }) => {
      if (data) router.replace('/dashboard/rescue-center')
    })
  }, [router])

  // Center fields
  const [centerName, setCenterName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [rnc, setRnc] = useState('')
  const [website, setWebsite] = useState('')
  const [instagram, setInstagram] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [showMfaEnrollment, setShowMfaEnrollment] = useState(false)

  const handleSubmit = async () => {
    if (!centerName.trim() || !phone.trim() || !address.trim()) return
    setSubmitting(true)
    setSubmitError(null)

    const { error } = await createRescueCenter({
      name: centerName.trim(),
      phone: phone.trim(),
      address: address.trim(),
      ...(rnc.trim() && { rnc: rnc.trim() }),
      ...(website.trim() && { website: website.trim() }),
      ...(instagram.trim() && { instagram: instagram.trim() }),
    })

    if (error) {
      setSubmitError(error)
      setSubmitting(false)
      return
    }

    setSubmitting(false)

    // Skip MFA enrollment if already configured (e.g. during post-registration prompt)
    const { data: mfaData } = await getMethods()
    if (mfaData?.mfa_enabled) {
      setSubmitted(true)
    } else {
      setShowMfaEnrollment(true)
    }
  }

  const canSubmit =
    centerName.trim() !== '' &&
    phone.trim() !== '' &&
    address.trim() !== '' &&
    !submitting

  if (showMfaEnrollment) {
    return (
      <MfaEnrollment
        onComplete={() => {
          setShowMfaEnrollment(false)
          setSubmitted(true)
        }}
        breadcrumbItems={[
          { label: 'Inicio', href: '/' },
          { label: 'Registro', href: '/auth/register' },
          { label: 'Rol', href: '/auth/role-selection', changeRole: true },
          { label: 'Centro de Rescate' },
          { label: 'Seguridad', current: true },
        ]}
      />
    )
  }

  if (submitted) {
    return (
      <div className="backdark relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-4">
        <BackgroundBeams />
        <div className="relative z-10 w-full rounded-2xl max-w-md text-center space-y-6 bg-background/90 backdrop-blur-xl p-16 inset-shadow-[1px_1px_1px_var(--color-input)]">
          <FontAwesomeIcon icon={faPaw} className="text-6xl text-foreground" />
          <h1 className="text-2xl font-bold text-foreground">¡Solicitud enviada!</h1>
          <p className="text-muted-foreground">
            Tu centro de rescate está en revisión. Nuestro equipo verificará la información y te notificará cuando sea aprobado.
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

  return (
    <div className="dark relative min-h-screen overflow-hidden bg-background">
      <BackgroundBeams />

      <OnboardingNav
        items={[
          {label: 'Inicio', current: false, href: "/"},
          {label: 'Registro', current: false, href: "/auth/register"},
          {label: 'Rol', current: false, href: "/auth/role-selection", changeRole: true},
          {label: 'Centro de Rescate', current: true}
        ]}
      />

      {/* Page content */}
      <main className="backdrop-blur-sm my-4 rounded-2xl relative z-10 max-w-230 mx-auto px-8 py-12 pb-20 bg-background/30  inset-shadow-[-1px_1px_1px_1px_var(--color-input)]">

        <h1 className="text-2xl font-bold tracking-tight mb-1">Registra tu centro de rescate</h1>
        <p className="text-sm text-muted-foreground mb-10">Completa tu perfil para que adoptantes puedan encontrarte</p>

        {/* Center fields */}
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Nombre del centro <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              placeholder="ej. Centro de Rescate Esperanza"
              value={centerName}
              onChange={(e) => setCenterName(e.target.value)}
              className="w-full rounded-xl border border-input bg-background/50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Teléfono <span className="text-destructive">*</span>
            </label>
            <input
              type="tel"
              placeholder="809-000-0000"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-xl border border-input bg-background/50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Dirección <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              placeholder="Calle, número, sector, ciudad"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full rounded-xl border border-input bg-background/50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                RNC{' '}
                <span className="text-muted-foreground/50 font-normal normal-case tracking-normal">
                  (opcional)
                </span>
              </label>
              <input
                type="text"
                placeholder="1-23-45678-9"
                value={rnc}
                onChange={(e) => setRnc(e.target.value)}
                className="w-full rounded-xl border border-input bg-background/50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Sitio web{' '}
                <span className="text-muted-foreground/50 font-normal normal-case tracking-normal">
                  (opcional)
                </span>
              </label>
              <input
                type="url"
                placeholder="https://tucentro.com"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className="w-full rounded-xl border border-input bg-background/50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Instagram
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">
                @
              </span>
              <input
                type="text"
                placeholder="tucentro"
                value={instagram}
                onChange={(e) => setInstagram(e.target.value)}
                className="w-full rounded-xl border border-input bg-background/50 pl-8 pr-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-10">
          <button
            type="button"
            onClick={() => {
              sessionStorage.setItem('pelu_changing_role', '1')
              router.push('/auth/role-selection')
            }}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <FontAwesomeIcon icon={faArrowLeft} className="text-xs" />
            Cambiar rol
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="px-8 py-3 bg-pop-550 text-white rounded-xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitting ? 'Enviando…' : 'Enviar solicitud →'}
          </button>
        </div>

        {submitError && (
          <div className="animate-wiggle mt-8 p-4 bg-destructive/10 border border-destructive/30 rounded-2xl text-destructive text-sm">
            {submitError}
          </div>
        )}
      </main>
    </div>
  )
}
