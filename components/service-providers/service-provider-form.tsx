'use client'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSpinner, faCheck } from '@fortawesome/free-solid-svg-icons'
import { geocodeAddress } from '@/lib/geocode'
import { FileDropzone } from '@/components/ui/file-dropzone'
import { RequirementsChecklist, Requirement } from './requirements-checklist'
import {
  ServiceProvider,
  SERVICE_TYPES,
  PET_TYPES,
  registerServiceProvider,
  updateServiceProviderProfile,
  reapplyServiceProvider,
} from '@/lib/api/service-providers'

export type ServiceProviderFormMode = 'register' | 'edit' | 'reapply'

interface ServiceProviderFormProps {
  mode: ServiceProviderFormMode
  provider?: ServiceProvider
  onSaved: (provider: ServiceProvider) => void
}

export function ServiceProviderForm({ mode, provider, onSaved }: ServiceProviderFormProps) {
  const { t } = useTranslation('business')
  const [description, setDescription] = useState(provider?.description ?? '')
  const [experience, setExperience] = useState(provider?.experience ?? '')
  const [address, setAddress] = useState(provider?.address ?? '')
  const [services, setServices] = useState<string[]>(provider?.services ?? [])
  const [petTypes, setPetTypes] = useState<string[]>(provider?.pet_types ?? [])
  const [idDocument, setIdDocument] = useState<File | null>(null)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [addressError, setAddressError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Only register/reapply carry the ID document; the JSON edit mode never does.
  const needsDocument = mode !== 'edit'
  // Terms are accepted once, at registration.
  const needsTerms = mode === 'register'

  const toggleValue = (list: string[], value: string) =>
    list.includes(value) ? list.filter((v) => v !== value) : [...list, value]

  // canSubmit is derived *from* the rendered checklist, so the button's disabled
  // state and the list of what is still missing can never disagree.
  const requirements: Requirement[] = [
    { key: 'description', labelKey: 'service_providers.req_description', met: !!description.trim() },
    { key: 'experience', labelKey: 'service_providers.req_experience', met: !!experience.trim() },
    { key: 'address', labelKey: 'service_providers.req_address', met: !!address.trim() },
    { key: 'services', labelKey: 'service_providers.req_services', met: services.length > 0 },
    { key: 'pet_types', labelKey: 'service_providers.req_pet_types', met: petTypes.length > 0 },
    ...(needsDocument ? [{ key: 'document', labelKey: 'service_providers.req_document', met: !!idDocument }] : []),
    ...(needsTerms ? [{ key: 'terms', labelKey: 'service_providers.req_terms', met: termsAccepted }] : []),
  ]

  const canSubmit = requirements.every((r) => r.met) && !submitting

  const submitLabel =
    mode === 'register' ? t('service_providers.submit_register')
      : mode === 'edit' ? t('service_providers.submit_edit')
        : t('service_providers.submit_reapply')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    setAddressError('')
    setSubmitting(true)

    const coords = await geocodeAddress(address)
    if (!coords) {
      setAddressError(t('service_providers.address_not_found'))
      setSubmitting(false)
      return
    }

    const fields = {
      description: description.trim(),
      experience: experience.trim(),
      address: address.trim(),
      lat: coords.lat,
      lng: coords.lng,
      services,
      pet_types: petTypes,
    }

    const result =
      mode === 'edit'
        ? await updateServiceProviderProfile(fields)
        : mode === 'register'
          ? await registerServiceProvider({ ...fields, id_document: idDocument! })
          : await reapplyServiceProvider({ ...fields, id_document: idDocument! })

    setSubmitting(false)

    if (result.error || !result.data) {
      toast.error(result.error || t('service_providers.save_error'))
      return
    }
    toast.success(mode === 'edit' ? t('service_providers.saved') : t('service_providers.submitted'))
    onSaved(result.data)
  }

  const legendClass = 'mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground'
  const fieldClass =
    'w-full px-3 py-2 border border-input rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-ring focus:border-transparent'
  const chipClass = (selected: boolean) =>
    `focus-ring inline-flex min-h-11 items-center gap-1.5 rounded-xl border px-3 text-sm font-medium transition-colors ${
      selected
        ? 'bg-primary text-primary-foreground border-primary'
        : 'border-input text-muted-foreground hover:bg-muted'
    }`

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <fieldset className="space-y-6">
        <legend className={legendClass}>{t('service_providers.section_about')}</legend>

        <div className="space-y-2">
          <label htmlFor="sp-description" className="text-sm font-medium">
            {t('service_providers.description_label')}
          </label>
          <textarea
            id="sp-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('service_providers.description_placeholder')}
            rows={3}
            className={fieldClass}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="sp-experience" className="text-sm font-medium">
            {t('service_providers.experience_label')}
          </label>
          <textarea
            id="sp-experience"
            value={experience}
            onChange={(e) => setExperience(e.target.value)}
            placeholder={t('service_providers.experience_placeholder')}
            rows={2}
            className={fieldClass}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="sp-address" className="text-sm font-medium">
            {t('service_providers.address_label')}
          </label>
          <input
            id="sp-address"
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder={t('service_providers.address_placeholder')}
            autoComplete="street-address"
            aria-invalid={!!addressError}
            aria-describedby={addressError ? 'sp-address-error' : undefined}
            className={fieldClass}
          />
          {addressError && (
            <p id="sp-address-error" role="alert" className="text-xs text-destructive">
              {addressError}
            </p>
          )}
        </div>
      </fieldset>

      <fieldset className="space-y-6">
        <legend className={legendClass}>{t('service_providers.section_services')}</legend>

        <div className="space-y-2">
          <p id="sp-services-label" className="text-sm font-medium">
            {t('service_providers.services_label')}
          </p>
          {/*
            role="group" + aria-labelledby, not <label htmlFor>: a label pointing
            at a chip group would hijack the first button's accessible name.
          */}
          <div role="group" aria-labelledby="sp-services-label" className="flex flex-wrap gap-2">
            {SERVICE_TYPES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setServices((prev) => toggleValue(prev, s))}
                aria-pressed={services.includes(s)}
                className={chipClass(services.includes(s))}
              >
                {services.includes(s) && (
                  <FontAwesomeIcon icon={faCheck} className="text-xs" aria-hidden="true" />
                )}
                {t(`service_providers.services.${s}`)}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <p id="sp-pet-types-label" className="text-sm font-medium">
            {t('service_providers.pet_types_label')}
          </p>
          <div role="group" aria-labelledby="sp-pet-types-label" className="flex flex-wrap gap-2">
            {PET_TYPES.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPetTypes((prev) => toggleValue(prev, p))}
                aria-pressed={petTypes.includes(p)}
                className={chipClass(petTypes.includes(p))}
              >
                {petTypes.includes(p) && (
                  <FontAwesomeIcon icon={faCheck} className="text-xs" aria-hidden="true" />
                )}
                {t(`service_providers.pet_types.${p}`)}
              </button>
            ))}
          </div>
        </div>
      </fieldset>

      {/* Edit mode needs neither, and an empty legend is worse than no section. */}
      {(needsDocument || needsTerms) && (
        <fieldset className="space-y-6">
          <legend className={legendClass}>{t('service_providers.section_verification')}</legend>

          {needsDocument && (
            <div className="space-y-2">
              {/*
                A real <label htmlFor> pointing at the dropzone's hidden input, as
                in components/forms/form-renderer.tsx: it keeps the input named and
                keeps clicking the label opening the picker.
              */}
              <label htmlFor="sp-id-document" id="sp-id-document-label" className="text-sm font-medium">
                {t('service_providers.id_document_label')}
              </label>
              <FileDropzone
                accept="image/png,image/jpeg,image/webp"
                label={t('service_providers.id_document_label')}
                hint={t('service_providers.id_document_hint')}
                selectedName={idDocument?.name ?? null}
                onFiles={(list) => setIdDocument(list[0] ?? null)}
                onClear={() => setIdDocument(null)}
                inputId="sp-id-document"
                aria-labelledby="sp-id-document-label"
              />
            </div>
          )}

          {needsTerms && (
            <div className="flex items-start gap-2">
              <input
                id="sp-terms"
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                className="mt-1"
              />
              <label htmlFor="sp-terms" className="text-sm text-muted-foreground">
                {t('service_providers.terms_label')}
              </label>
            </div>
          )}
        </fieldset>
      )}

      <RequirementsChecklist requirements={requirements} />

      <button
        type="submit"
        disabled={!canSubmit}
        className="focus-ring w-full rounded-xl bg-pop-solid px-4 py-2.5 text-sm font-medium text-white transition-[background-color,transform] hover:bg-pop-850 active:scale-[0.98] disabled:opacity-50"
      >
        {submitting ? (
          <>
            <FontAwesomeIcon icon={faSpinner} className="text-sm mr-2 animate-spin" />
            {t('service_providers.submitting')}
          </>
        ) : (
          submitLabel
        )}
      </button>
    </form>
  )
}
