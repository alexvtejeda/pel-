'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCheck, faHeart } from '@fortawesome/free-solid-svg-icons'
import Stepper, { Step } from '@/components/Stepper'

export function OwnerWizard() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [petName, setPetName] = useState('')
  const [petAge, setPetAge] = useState('')
  const [wantsAdoption, setWantsAdoption] = useState<boolean | null>(null)

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
          </Step>

          {/* Step 2: Pet name */}
          <Step>
            <div className="py-4 space-y-4">
              <h2 className="text-lg font-semibold mb-1">¿Cómo se llama tu mascota?</h2>
              <p className="text-muted-foreground text-sm mb-4">Cuéntanos sobre tu compañero</p>
              <input
                type="text"
                placeholder="Nombre de tu mascota"
                value={petName}
                onChange={(e) => setPetName(e.target.value)}
                className="w-full px-4 py-3 border border-input rounded-xl focus:outline-hidden focus:ring-2 focus:ring-ring focus:border-transparent bg-background"
              />
            </div>
          </Step>

          {/* Step 3: Pet age */}
          <Step>
            <div className="py-4 space-y-4">
              <h2 className="text-lg font-semibold mb-1">¿Cuántos años tiene tu mascota?</h2>
              <p className="text-muted-foreground text-sm mb-4">Edad aproximada en años</p>
              <input
                type="number"
                placeholder="Edad en años"
                min="0"
                max="30"
                value={petAge}
                onChange={(e) => setPetAge(e.target.value)}
                className="w-full px-4 py-3 border border-input rounded-xl focus:outline-hidden focus:ring-2 focus:ring-ring focus:border-transparent bg-background"
              />
            </div>
          </Step>

          {/* Step 4: Wants adoption */}
          <Step>
            <div className="py-4 space-y-4">
              <h2 className="text-lg font-semibold mb-1">¿Quieres dar a tu mascota en adopción?</h2>
              <p className="text-muted-foreground text-sm mb-4">Puedes cambiar esto en cualquier momento</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: true, label: 'Sí', icon: faCheck },
                  { value: false, label: 'No por ahora', icon: faHeart },
                ].map((opt) => (
                  <button
                    key={String(opt.value)}
                    onClick={() => setWantsAdoption(opt.value)}
                    className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${
                      wantsAdoption === opt.value
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
