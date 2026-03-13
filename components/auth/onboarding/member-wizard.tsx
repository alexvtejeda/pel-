'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faDog, faCat, faMars, faVenus, faArrowLeft } from '@fortawesome/free-solid-svg-icons'
import { AnimatePresence, motion } from 'motion/react'
import { OnboardingNav } from './onboarding-nav'
import { BackgroundBeams } from '@/components/ui/beams'
import { apiClient } from '@/lib/api/client'
import { createUserPets } from '@/lib/api/user-pets'
import { useAuth } from '@/lib/contexts/auth-context'

interface PetFormData {
  name: string
  age: string
  species: 'dog' | 'cat'
  gender: 'male' | 'female'
}

const slideVariants = {
  enter: (dir: number) => ({ x: dir >= 0 ? '-100%' : '100%', opacity: 0 }),
  center: { x: '0%', opacity: 1 },
  exit:  (dir: number) => ({ x: dir >= 0 ? '50%'  : '-50%', opacity: 0 }),
}

export function MemberWizard() {
  const router = useRouter()
  const { updateSession } = useAuth()

  const [step, setStep]           = useState(1)
  const [direction, setDirection] = useState(1)
  const [name, setName]           = useState('')
  const [hasPets, setHasPets]     = useState<boolean | null>(null)
  const [motivation, setMotivation] = useState<'adopt' | 'rehome' | 'explore' | null>(null)
  const [petCount, setPetCount]   = useState(1)
  const [petForms, setPetForms]   = useState<PetFormData[]>([
    { name: '', age: '', species: 'dog', gender: 'male' },
  ])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]           = useState<string | null>(null)

  const goTo = (next: number) => {
    setDirection(next > step ? 1 : -1)
    setStep(next)
  }

  const handlePetCount = (count: number) => {
    const n = Math.max(1, Math.min(10, count))
    setPetCount(n)
    setPetForms(prev => {
      if (n > prev.length) {
        const extras: PetFormData[] = Array(n - prev.length)
          .fill(null)
          .map(() => ({ name: '', age: '', species: 'dog' as const, gender: 'male' as const }))
        return [...prev, ...extras]
      }
      return prev.slice(0, n)
    })
  }

  const updatePet = (i: number, changes: Partial<PetFormData>) =>
    setPetForms(prev => prev.map((p, idx) => (idx === i ? { ...p, ...changes } : p)))

  const canNext = (): boolean => {
    if (step === 1) return name.trim() !== ''
    if (step === 2) return hasPets !== null
    if (step === 3 && hasPets === false) return motivation !== null
    if (step === 3 && hasPets === true)  return petCount >= 1
    if (step === 4) return petForms.every(p => p.name.trim() !== '' && p.age !== '')
    return false
  }

  const isLastStep = (): boolean =>
    (hasPets === false && step === 3) || (hasPets === true && step === 4)

  const handleNext = () => {
    if (!canNext()) return
    if (isLastStep()) { handleSubmit(); return }
    goTo(step + 1)
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    setError(null)

    const res  = await apiClient('/api/v1/auth/profile', {
      method: 'PATCH',
      body: JSON.stringify({ display_name: name.trim() }),
    })
    const json = await res.json()
    if (!res.ok) {
      setError(json.error || 'Error al guardar el nombre')
      setSubmitting(false)
      return
    }
    if (json.user && json.access_token) updateSession(json.user, json.access_token)

    if (!hasPets) {
      if (motivation) localStorage.setItem('pelu_motivation', motivation)
      setSubmitting(false)
      router.push('/')
      return
    }

    const { error: petsError } = await createUserPets(
      petForms.map(p => ({
        name:    p.name.trim(),
        age:     parseInt(p.age, 10) || 0,
        species: p.species,
        gender:  p.gender,
      }))
    )
    if (petsError) {
      setError(petsError)
      setSubmitting(false)
      return
    }
    router.push('/')
  }

  const totalSteps = hasPets === true ? 4 : 3

  return (
    <div className="dark relative min-h-screen overflow-hidden bg-background">
      <BackgroundBeams />
      <OnboardingNav
        items={[
          { label: 'Inicio',    href: '/' },
          { label: 'Registro',  href: '/auth/register' },
          { label: 'Rol',       href: '/auth/role-selection', changeRole: true },
          { label: 'Miembro',   current: true },
        ]}
      />

      <div className="relative z-10 w-full max-w-lg mx-auto mt-12 px-4">
        <div className="mx-auto w-full max-w-lg rounded-2xl shadow-xl border border-input bg-background">

          {/* Header */}
          <div className="p-8 pb-4">
            <button
              onClick={() => { localStorage.setItem('pelu_changing_role', '1'); router.push('/auth/role-selection') }}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
            >
              <FontAwesomeIcon icon={faArrowLeft} className="w-3 h-3" />
              Cambiar rol
            </button>
            <h1 className="text-xl font-bold">Cuéntanos sobre ti</h1>
            <p className="text-muted-foreground text-sm mt-1">Solo unos pasos para personalizar tu experiencia</p>
          </div>

          {/* Progress bar */}
          <div className="flex items-center gap-2 px-8 py-3">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${i + 1 <= step ? 'bg-pop-550' : 'bg-muted'}`}
              />
            ))}
          </div>

          {/* Slide content */}
          <div className="relative overflow-hidden px-8" style={{ minHeight: '200px' }}>
            <AnimatePresence mode="sync" custom={direction}>
              <motion.div
                key={step}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.35 }}
                style={{ position: 'absolute', left: '2rem', right: '2rem', top: 0 }}
                className="py-4 space-y-4"
              >
                {/* Step 1: Name */}
                {step === 1 && (
                  <div>
                    <h2 className="text-lg font-semibold mb-1">¿Cómo te llamamos?</h2>
                    <p className="text-muted-foreground text-sm mb-4">Así te verán los centros de rescate</p>
                    <input
                      autoFocus
                      type="text"
                      placeholder="ej. María"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && canNext() && handleNext()}
                      className="w-full px-4 py-3 border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-ring bg-background text-sm"
                    />
                  </div>
                )}

                {/* Step 2: Has pets? */}
                {step === 2 && (
                  <div>
                    <h2 className="text-lg font-semibold mb-4">¿Tienes mascotas?</h2>
                    <div className="grid grid-cols-2 gap-3">
                      {[{ value: true, label: 'Sí' }, { value: false, label: 'No' }].map(opt => (
                        <button
                          key={String(opt.value)}
                          onClick={() => setHasPets(opt.value)}
                          className={`p-6 rounded-2xl border-2 text-lg font-semibold transition-all ${hasPets === opt.value ? 'border-pop-550 bg-pop-550/10 text-pop-300' : 'border-border hover:border-input'}`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Step 3a: Motivation (no pets) */}
                {step === 3 && hasPets === false && (
                  <div>
                    <h2 className="text-lg font-semibold mb-4">¿Qué te trae a Pelú?</h2>
                    <div className="space-y-2">
                      {[
                        { value: 'adopt'   as const, label: 'Quiero adoptar una mascota' },
                        { value: 'rehome'  as const, label: 'Tengo un animal callejero y quiero rescatarlo' },
                        { value: 'explore' as const, label: 'Solo estoy explorando' },
                      ].map(opt => (
                        <button
                          key={opt.value}
                          onClick={() => setMotivation(opt.value)}
                          className={`w-full text-left p-4 rounded-2xl border-2 text-sm transition-all ${motivation === opt.value ? 'border-pop-550 bg-pop-550/10' : 'border-border hover:border-input'}`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Step 3b: Pet count (has pets) */}
                {step === 3 && hasPets === true && (
                  <div>
                    <h2 className="text-lg font-semibold mb-4">¿Cuántas mascotas tienes?</h2>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={petCount}
                      onChange={e => handlePetCount(parseInt(e.target.value, 10) || 1)}
                      className="w-full px-4 py-3 border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-ring bg-background text-sm"
                    />
                  </div>
                )}

                {/* Step 4: Pet forms */}
                {step === 4 && (
                  <div className="space-y-4 max-h-64 overflow-y-auto pr-1">
                    {petForms.map((pet, i) => (
                      <div key={i} className="rounded-2xl border p-4 space-y-3">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                          Mascota {i + 1} de {petCount}
                        </p>
                        <input
                          type="text"
                          placeholder="Nombre"
                          value={pet.name}
                          onChange={e => updatePet(i, { name: e.target.value })}
                          className="w-full px-4 py-2.5 border border-input rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ring bg-background"
                        />
                        <input
                          type="number"
                          placeholder="Edad (meses)"
                          min={0}
                          value={pet.age}
                          onChange={e => updatePet(i, { age: e.target.value })}
                          className="w-full px-4 py-2.5 border border-input rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ring bg-background"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <p className="text-xs text-muted-foreground mb-1.5">Tipo</p>
                            <div className="flex gap-1.5">
                              {(['dog', 'cat'] as const).map(s => (
                                <button key={s} type="button" onClick={() => updatePet(i, { species: s })}
                                  className={`flex-1 py-2 rounded-xl border text-xs font-medium transition-colors ${pet.species === s ? 'bg-pop-550/10 border-pop-550 text-pop-300' : 'border-input text-muted-foreground'}`}>
                                  <FontAwesomeIcon icon={s === 'dog' ? faDog : faCat} className="mr-1" />
                                  {s === 'dog' ? 'Perro' : 'Gato'}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1.5">Género</p>
                            <div className="flex gap-1.5">
                              {(['male', 'female'] as const).map(g => (
                                <button key={g} type="button" onClick={() => updatePet(i, { gender: g })}
                                  className={`flex-1 py-2 rounded-xl border text-xs font-medium transition-colors ${pet.gender === g ? 'bg-pop-550/10 border-pop-550 text-pop-300' : 'border-input text-muted-foreground'}`}>
                                  <FontAwesomeIcon icon={g === 'male' ? faMars : faVenus} className="mr-1" />
                                  {g === 'male' ? 'Macho' : 'Hembra'}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div className="px-8 pb-8 pt-56">
            {error && (
              <div className="mb-4 p-3 bg-destructive/10 border border-destructive/30 rounded-xl text-destructive text-sm">
                {error}
              </div>
            )}
            <div className={`flex ${step !== 1 ? 'justify-between' : 'justify-end'}`}>
              {step !== 1 && (
                <button onClick={() => goTo(step - 1)}
                  className="px-3 py-1 text-neutral-400 hover:text-neutral-700 transition rounded">
                  Atrás
                </button>
              )}
              <button
                onClick={handleNext}
                disabled={!canNext() || submitting}
                className="flex items-center justify-center rounded-xl bg-pop-550 py-1.5 px-3.5 font-medium tracking-tight text-white transition hover:opacity-90 active:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {submitting ? 'Enviando…' : isLastStep() ? 'Completar' : 'Siguiente'}
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
