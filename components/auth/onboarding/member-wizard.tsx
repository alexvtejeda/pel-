'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faDog, faCat, faMars, faVenus } from '@fortawesome/free-solid-svg-icons'
import { OnboardingNav } from './onboarding-nav'
import { BackgroundBeams } from '@/components/ui/beams'
import { apiClient } from '@/lib/api/client'
import { createUserPets } from '@/lib/api/user-pets'
import { useAuth } from '@/lib/contexts/auth-context'
import Stepper, { Step } from '@/components/Stepper'

interface PetFormData {
  name: string
  age: string
  species: 'dog' | 'cat'
  gender: 'male' | 'female'
}

export function MemberWizard() {
  const router = useRouter()
  const { updateSession } = useAuth()

  const [name, setName] = useState('')
  const [hasPets, setHasPets] = useState<boolean | null>(null)
  const [motivation, setMotivation] = useState<'adopt' | 'rehome' | 'explore' | null>(null)
  const [petCount, setPetCount] = useState<number | ''>('')
  const [petForms, setPetForms] = useState<PetFormData[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentStep, setCurrentStep] = useState(1)

  const handlePetCount = (raw: string) => {
    if (raw === '') {
      setPetCount('')
      return
    }
    const n = parseInt(raw, 10)
    if (isNaN(n)) return
    const clamped = Math.max(1, Math.min(10, n))
    setPetCount(clamped)
    setPetForms(prev => {
      if (clamped > prev.length) {
        const extras: PetFormData[] = Array(clamped - prev.length)
          .fill(null)
          .map(() => ({ name: '', age: '', species: 'dog' as const, gender: 'male' as const }))
        return [...prev, ...extras]
      }
      return prev.slice(0, clamped)
    })
  }

  const updatePet = (i: number, changes: Partial<PetFormData>) =>
    setPetForms(prev => prev.map((p, idx) => (idx === i ? { ...p, ...changes } : p)))

  // Determine which step is currently disabled
  const isNextDisabled = (): boolean => {
    if (currentStep === 1) return name.trim() === ''
    if (currentStep === 2) return hasPets === null
    // Step 3 differs based on hasPets
    if (hasPets === true) {
      // Step 3 = pet count, Step 4 = pet forms
      if (currentStep === 3) return petCount === '' || (typeof petCount === 'number' && (petCount < 1 || petCount > 10))
      if (currentStep === 4) return !petForms.every(p => p.name.trim() !== '' && p.age !== '')
    } else if (hasPets === false) {
      // Step 3 = motivation
      if (currentStep === 3) return motivation === null
    }
    return false
  }

  const handleSubmit = async () => {
    if (submitting) return
    setSubmitting(true)
    setError(null)

    const res = await apiClient('/api/v1/auth/profile', {
      method: 'PATCH',
      body: JSON.stringify({ display_name: name.trim() }),
    })
    const json = await res.json()
    if (!res.ok) {
      setError(json.error || 'Error al guardar el nombre')
      setSubmitting(false)
      return
    }
    if (json.user) updateSession(json.user)

    if (!hasPets) {
      if (motivation) localStorage.setItem('pelu_motivation', motivation)
      setSubmitting(false)
      router.push('/')
      return
    }

    const { error: petsError } = await createUserPets(
      petForms.map(p => ({
        name: p.name.trim(),
        age: parseInt(p.age, 10) || 0,
        species: p.species,
        gender: p.gender,
      }))
    )
    if (petsError) {
      setError(petsError)
      setSubmitting(false)
      return
    }
    router.push('/')
  }

  return (
    <div className="dark relative min-h-screen overflow-hidden bg-background">
      <BackgroundBeams />
      <OnboardingNav
        items={[
          { label: 'Inicio', href: '/' },
          { label: 'Registro', href: '/auth/register' },
          { label: 'Rol', href: '/auth/role-selection', changeRole: true },
          { label: 'Miembro', current: true },
        ]}
      />

      <div className="relative z-10">
        <Stepper
          initialStep={1}
          onStepChange={setCurrentStep}
          onFinalStepCompleted={handleSubmit}
          backButtonText="Atrás"
          nextButtonText="Siguiente"
          completeButtonText={submitting ? 'Enviando…' : 'Completar'}
          disableNext={isNextDisabled() || submitting}
          disableStepIndicators
          title="Cuéntanos sobre ti"
          subtitle="Solo unos pasos para personalizar tu experiencia"
          headerLeft={
            <button
              onClick={() => {
                localStorage.setItem('pelu_changing_role', '1')
                router.push('/auth/role-selection')
              }}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Cambiar rol
            </button>
          }
        >
          {/* Step 1: Name */}
          <Step>
            <div>
              <h2 className="text-lg font-semibold mb-1">¿Cómo te llamamos?</h2>
              <p className="text-muted-foreground text-sm mb-4">Así te verán los centros de rescate</p>
              <input
                autoFocus
                type="text"
                placeholder="ej. María"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-4 py-3 border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-ring bg-background text-sm"
              />
            </div>
          </Step>

          {/* Step 2: Has pets? */}
          <Step>
            <div>
              <h2 className="text-lg font-semibold mb-4">¿Tienes mascotas?</h2>
              <div className="grid grid-cols-2 gap-3">
                {[{ value: true, label: 'Sí' }, { value: false, label: 'No' }].map(opt => (
                  <button
                    key={String(opt.value)}
                    onClick={() => setHasPets(opt.value)}
                    className={`p-6 rounded-2xl border-2 text-lg font-semibold transition-all ${
                      hasPets === opt.value
                        ? 'border-pop-550 bg-pop-550/10 text-pop-300'
                        : 'border-border hover:border-input'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </Step>

          {/* Conditional steps based on hasPets */}
          {hasPets === true && (
            <Step>
              <div>
                <h2 className="text-lg font-semibold mb-4">¿Cuántas mascotas tienes?</h2>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={petCount}
                  onChange={e => handlePetCount(e.target.value)}
                  placeholder="1-10"
                  className="w-full px-4 py-3 border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-ring bg-background text-sm"
                />
                {typeof petCount === 'number' && (petCount < 1 || petCount > 10) && (
                  <p className="text-destructive text-xs mt-2">Ingresa un número entre 1 y 10</p>
                )}
              </div>
            </Step>
          )}

          {hasPets === true && (
            <Step>
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
                              className={`flex-1 py-2 rounded-xl border text-xs font-medium transition-colors ${
                                pet.species === s
                                  ? 'bg-pop-550/10 border-pop-550 text-pop-300'
                                  : 'border-input text-muted-foreground'
                              }`}>
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
                              className={`flex-1 py-2 rounded-xl border text-xs font-medium transition-colors ${
                                pet.gender === g
                                  ? 'bg-pop-550/10 border-pop-550 text-pop-300'
                                  : 'border-input text-muted-foreground'
                              }`}>
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
            </Step>
          )}

          {hasPets === false && (
            <Step>
              <div>
                <h2 className="text-lg font-semibold mb-4">¿Qué te trae a Pelú?</h2>
                <div className="space-y-2">
                  {[
                    { value: 'adopt' as const, label: 'Quiero adoptar una mascota' },
                    { value: 'rehome' as const, label: 'Tengo un animal callejero y quiero rescatarlo' },
                    { value: 'explore' as const, label: 'Solo estoy explorando' },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setMotivation(opt.value)}
                      className={`w-full text-left p-4 rounded-2xl border-2 text-sm transition-all ${
                        motivation === opt.value
                          ? 'border-pop-550 bg-pop-550/10'
                          : 'border-border hover:border-input'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </Step>
          )}
        </Stepper>

        {error && (
          <div className="max-w-lg mx-auto mt-4 p-3 bg-destructive/10 border border-destructive/30 rounded-xl text-destructive text-sm text-center">
            {error}
          </div>
        )}
      </div>
    </div>
  )
}
