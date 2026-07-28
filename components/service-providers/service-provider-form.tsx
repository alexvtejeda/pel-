'use client'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSpinner } from '@fortawesome/free-solid-svg-icons'
import { geocodeAddress } from '@/lib/geocode'
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

  const canSubmit =
    !!description.trim() &&
    !!experience.trim() &&
    !!address.trim() &&
    services.length > 0 &&
    petTypes.length > 0 &&
    (!needsDocument || !!idDocument) &&
    (!needsTerms || termsAccepted) &&
    !submitting

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

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
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
          className="w-full px-3 py-2 border border-input rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-ring focus:border-transparent"
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
          className="w-full px-3 py-2 border border-input rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-ring focus:border-transparent"
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
          className="w-full px-3 py-2 border border-input rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-ring focus:border-transparent"
        />
        {addressError && <p className="text-xs text-destructive">{addressError}</p>}
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">{t('service_providers.services_label')}</p>
        <div className="flex flex-wrap gap-2">
          {SERVICE_TYPES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setServices((prev) => toggleValue(prev, s))}
              className={`focus-ring px-3 py-1.5 rounded-xl text-sm font-medium border transition-colors ${
                services.includes(s)
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-input text-muted-foreground hover:bg-muted'
              }`}
            >
              {t(`service_providers.services.${s}`)}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">{t('service_providers.pet_types_label')}</p>
        <div className="flex flex-wrap gap-2">
          {PET_TYPES.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPetTypes((prev) => toggleValue(prev, p))}
              className={`focus-ring px-3 py-1.5 rounded-xl text-sm font-medium border transition-colors ${
                petTypes.includes(p)
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-input text-muted-foreground hover:bg-muted'
              }`}
            >
              {t(`service_providers.pet_types.${p}`)}
            </button>
          ))}
        </div>
      </div>

      {needsDocument && (
        <div className="space-y-2">
          <label htmlFor="sp-id-document" className="text-sm font-medium">
            {t('service_providers.id_document_label')}
          </label>
          <input
            id="sp-id-document"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(e) => setIdDocument(e.target.files?.[0] ?? null)}
            className="w-full px-3 py-2 border border-input rounded-xl text-sm file:mr-3 file:rounded-xl file:border-0 file:bg-muted file:px-3 file:py-1 file:text-sm"
          />
          <p className="text-xs text-muted-foreground">{t('service_providers.id_document_hint')}</p>
          {idDocument && (
            <p className="text-xs text-muted-foreground">
              {t('service_providers.id_document_selected', { name: idDocument.name })}
            </p>
          )}
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

      <button
        type="submit"
        disabled={!canSubmit}
        className="focus-ring w-full py-2.5 px-4 bg-primary text-primary-foreground rounded-xl text-sm font-medium transition-[background-color,transform] hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50"
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
