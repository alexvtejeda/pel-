'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCat, faDog, faPaw, faCheck, faXmark } from '@fortawesome/free-solid-svg-icons'
import Stepper, { Step } from '@/components/Stepper'

type PetPreference = 'cat' | 'dog' | 'both'

export function AdopterWizard() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [petPreference, setPetPreference] = useState<PetPreference | null>(null)
  const [hasPets, setHasPets] = useState<boolean | null>(null)

  const handleComplete = () => {
    // Data stored locally — backend not ready yet
    router.push('/')
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold mb-1">Cuéntanos sobre ti</h1>
          <p className="text-muted-foreground text-sm">Solo unos pasos para personalizar tu experiencia</p>
        </div>

        <Stepper
          onFinalStepCompleted={handleComplete}
          backButtonText="Atrás"
          nextButtonText="Siguiente"
        >
          {/* Step 1: Name */}
          <Step>
            <div className="py-4 space-y-4">
              <div>
                <h2 className="text-lg font-semibold mb-1">¿Cuál es tu nombre?</h2>
                <p className="text-muted-foreground text-sm mb-4">Así te llamaremos dentro de la plataforma</p>
                <input
                  type="text"
                  placeholder="Tu nombre"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 border border-input rounded-xl focus:outline-hidden focus:ring-2 focus:ring-ring focus:border-transparent bg-background"
                />
              </div>
            </div>
          </Step>

          {/* Step 2: Pet preference */}
          <Step>
            <div className="py-4 space-y-4">
              <h2 className="text-lg font-semibold mb-1">¿Qué tipo de mascota te interesa adoptar?</h2>
              <p className="text-muted-foreground text-sm mb-4">Puedes cambiar esto luego</p>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: 'cat' as PetPreference, label: 'Gato', icon: faCat },
                  { value: 'dog' as PetPreference, label: 'Perro', icon: faDog },
                  { value: 'both' as PetPreference, label: 'Ambos', icon: faPaw },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setPetPreference(opt.value)}
                    className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${
                      petPreference === opt.value
                        ? 'border-primary bg-muted'
                        : 'border-border hover:border-input bg-card'
                    }`}
                  >
                    <FontAwesomeIcon icon={opt.icon} className="text-2xl w-8 h-8" />
                    <span className="text-sm font-medium">{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </Step>

          {/* Step 3: Has pets */}
          <Step>
            <div className="py-4 space-y-4">
              <h2 className="text-lg font-semibold mb-1">¿Tienes mascotas actualmente?</h2>
              <p className="text-muted-foreground text-sm mb-4">Esto nos ayuda a encontrar la mejor compatibilidad</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: true, label: 'Sí', icon: faCheck },
                  { value: false, label: 'No', icon: faXmark },
                ].map((opt) => (
                  <button
                    key={String(opt.value)}
                    onClick={() => setHasPets(opt.value)}
                    className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${
                      hasPets === opt.value
                        ? 'border-primary bg-muted'
                        : 'border-border hover:border-input bg-card'
                    }`}
                  >
                    <FontAwesomeIcon icon={opt.icon} className="w-8 h-8" />
                    <span className="text-sm font-medium">{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </Step>
        </Stepper>
      </div>
    </div>
  )
}
