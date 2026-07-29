'use client'

import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowLeft, faPaw } from '@fortawesome/free-solid-svg-icons'
import { Pet } from '@/lib/api/pets'
import { getPublicPet, getPetForm, PetFormResponse } from '@/lib/api/pets-public'
import { submitAdoptionForm, uploadSubmissionFile } from '@/lib/api/submissions'
import { FormRenderer } from '@/components/forms/form-renderer'
import { ErrorState } from '@/components/ui/error-state'
import { PeluLoadingLogo } from '@/components/ui/pelu-loading-logo'
import { useAuth } from '@/lib/contexts/auth-context'

export function AdoptPetPage({ petId }: { petId: string }) {
  const { t } = useTranslation('pets')
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()

  const [pet, setPet] = useState<Pet | null>(null)
  const [formData, setFormData] = useState<PetFormResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [fileWarning, setFileWarning] = useState<string | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    setLoadFailed(false)

    Promise.all([getPublicPet(petId), getPetForm(petId)])
      .then(([petRes, formRes]) => {
        // A network/server failure and a genuine 404 both arrive as data: null.
        // Only the 404 (error: null) means "this pet does not exist" — the other
        // must not silently bounce the user back to /pets.
        if (petRes.error || formRes.error) {
          setLoadFailed(true)
          setLoading(false)
          return
        }
        if (!petRes.data || !formRes.data) {
          router.replace('/pets')
          return
        }
        setPet(petRes.data)
        setFormData(formRes.data)
        setLoading(false)
      })
      .catch(() => {
        // Belt and braces: pets-public never rejects today, but a future change
        // must not be able to strand the user on a spinner.
        setLoadFailed(true)
        setLoading(false)
      })
  }, [petId, router])

  useEffect(() => {
    if (authLoading) return

    if (!petId) {
      router.replace('/pets')
      return
    }

    if (!user) { router.replace('/auth/login'); return }

    load()
  }, [petId, router, user, authLoading, load])

  const handleSubmit = async (
    answers: Record<string, string | string[]>,
    files: Record<string, File>
  ) => {
    if (!formData) return
    setFileWarning(null)

    const { data, error: submitErr } = await submitAdoptionForm(petId, {
      form_id: formData.form.id,
      answers,
    })

    // Throwing keeps FormRenderer on the form with its own error banner — there
    // is no success to show, so the success screen must never render.
    if (submitErr || !data) {
      throw new Error(submitErr || t('adopt.submit_error'))
    }

    // The submission succeeded. A failed attachment is a warning ON the success
    // screen, not a competing error banner.
    for (const [fieldId, file] of Object.entries(files)) {
      const { error: fileErr } = await uploadSubmissionFile(
        data.submission_id,
        fieldId,
        file
      )
      if (fileErr) {
        setFileWarning(t('forms.success_file_warning'))
        break
      }
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <PeluLoadingLogo />
      </div>
    )
  }

  if (loadFailed) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <ErrorState message={t('adopt.load_error')} onRetry={load} />
      </div>
    )
  }

  if (!pet || !formData) return null

  const rc = formData.rc
  const firstPhoto = pet.photos?.[0]?.url

  return (
    <div className="min-h-screen bg-background">
      {/*
        h-40 must be a DEFINITE height, not max-h-40: with a max-height the
        child's h-full resolves to auto, the image lays out at its intrinsic
        ratio, and overflow-hidden crops it. bg-muted letterboxes wide banners.
      */}
      <div className="sticky top-0 z-10 w-full h-40 overflow-hidden bg-muted">
        {rc.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={rc.logo_url} alt={rc.name} className="w-full h-full object-contain" />
        ) : (
          <div className="w-full h-full bg-linear-to-r from-pop-500 to-pop-550 flex items-center justify-center">
            <span className="text-foreground text-2xl font-bold">{rc.name}</span>
          </div>
        )}
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">
        <button
          onClick={() => router.back()}
          className="focus-ring inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <FontAwesomeIcon icon={faArrowLeft} className="text-sm" />
          {t('adopt.back_to', { name: pet.name })}
        </button>

        <div className="flex items-center gap-3 p-3 rounded-2xl bg-card border border-border mb-8">
          {firstPhoto ? (
            <Image src={firstPhoto} alt={pet.name} width={48} height={48} className="w-12 h-12 rounded-xl object-cover shrink-0" />
          ) : (
            <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center shrink-0">
              <FontAwesomeIcon icon={faPaw} className="text-xl text-muted-foreground/40" />
            </div>
          )}
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate">{pet.name}</p>
            <p className="text-xs text-muted-foreground truncate">
              {rc.name}
              {rc.city && <span> &middot; {rc.city}</span>}
            </p>
          </div>
        </div>

        {formData.advisory && (
          <div className="mb-6 p-4 bg-warning-bg border border-warning/40 rounded-2xl text-sm text-warning-foreground">
            {t('adopt.advisory')}
          </div>
        )}

        <FormRenderer
          form={formData.form}
          rc={{ name: rc.name, logo_url: rc.logo_url }}
          onSubmit={handleSubmit}
          submitWarning={fileWarning}
        />
      </div>
    </div>
  )
}
