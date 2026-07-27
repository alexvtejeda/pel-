'use client'

import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTrash, faMapMarkerAlt, faPhone, faIdCard } from '@fortawesome/free-solid-svg-icons'
import { RescueCenter } from '@/lib/api/rescue-centers'
import { Business } from '@/lib/api/businesses'
import { ServiceProvider } from '@/lib/api/service-providers'
import * as adminApi from '@/lib/api/admin'
import { MfaCodeInput } from '@/components/auth/mfa/mfa-code-input'

type StatusFilter = 'all' | 'pending' | 'active' | 'rejected'
type TypeFilter = 'all' | 'rescue_center' | 'business' | 'service_provider'

// The service-provider variant declares the display fields the card reads
// (name/rnc/phone/instagram) so the union stays uniformly accessible.
type UnifiedItem =
  | (RescueCenter & { _type: 'rescue_center' })
  | (Business & { _type: 'business' })
  | (ServiceProvider & {
      _type: 'service_provider'
      name: string
      rnc?: string
      phone?: string
      instagram?: string
    })

const statusLabelKeys: Record<StatusFilter, string> = {
  all: 'admin.status_all',
  pending: 'admin.status_pending_plural',
  active: 'admin.status_active_plural',
  rejected: 'admin.status_rejected_plural',
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-500/20 text-yellow-500',
  active: 'bg-green-500/20 text-green-500',
  rejected: 'bg-destructive/20 text-destructive',
}

const statusTextKeys: Record<string, string> = {
  pending: 'admin.status_pending',
  active: 'admin.status_active',
  rejected: 'admin.status_rejected',
}

export function RescueCentersTab() {
  const { t } = useTranslation('pets')
  const [centers, setCenters] = useState<RescueCenter[]>([])
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [serviceProviders, setServiceProviders] = useState<ServiceProvider[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<StatusFilter>('all')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')

  // Reject state
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  // Delete state
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteCode, setDeleteCode] = useState('')

  useEffect(() => {
    Promise.all([
      adminApi.listAllRescueCenters(),
      adminApi.listAllBusinesses(),
      adminApi.listServiceProviders('all'),
    ]).then(([rcResult, bizResult, spResult]) => {
      if (rcResult.error || !rcResult.data) { setError(rcResult.error || 'Error'); setLoading(false); return }
      setCenters(rcResult.data)
      if (bizResult.data) setBusinesses(bizResult.data)
      if (spResult.data) setServiceProviders(spResult.data)
      setLoading(false)
    })
  }, [])

  const unified: UnifiedItem[] = [
    ...centers.map(c => ({ ...c, _type: 'rescue_center' as const })),
    ...businesses.map(b => ({ ...b, _type: 'business' as const })),
    ...serviceProviders.map(sp => ({
      ...sp,
      _type: 'service_provider' as const,
      name: sp.applicant_name || sp.applicant_email || sp.user_id,
    })),
  ]

  const filtered = unified.filter(item => {
    const matchesType = typeFilter === 'all' || item._type === typeFilter
    const matchesStatus = filter === 'all' || item.status === filter
    return matchesType && matchesStatus
  })

  const handleApprove = async (item: UnifiedItem) => {
    if (item._type === 'service_provider') {
      const { data, error: err } = await adminApi.approveServiceProvider(item.id)
      if (err || !data) return
      // Merge, don't replace: applicant_name/applicant_email only exist on admin-list rows and
      // are omitted from the review response, so replacing would blank the row heading.
      setServiceProviders(prev => prev.map(sp => sp.id === item.id ? { ...sp, ...data } : sp))
    } else if (item._type === 'business') {
      const { data, error: err } = await adminApi.approveBusiness(item.id)
      if (err || !data) return
      setBusinesses(prev => prev.map(b => b.id === item.id ? data : b))
    } else {
      const { data, error: err } = await adminApi.approveRescueCenter(item.id)
      if (err || !data) return
      setCenters(prev => prev.map(c => c.id === item.id ? data : c))
    }
  }

  const handleReject = async (item: UnifiedItem) => {
    if (!rejectReason.trim()) return
    if (item._type === 'service_provider') {
      const { data, error: err } = await adminApi.rejectServiceProvider(item.id, rejectReason.trim())
      if (err || !data) return
      // Merge, don't replace — see handleApprove: the review response omits the applicant fields.
      setServiceProviders(prev => prev.map(sp => sp.id === item.id ? { ...sp, ...data } : sp))
    } else if (item._type === 'business') {
      const { data, error: err } = await adminApi.rejectBusiness(item.id, rejectReason.trim())
      if (err || !data) return
      setBusinesses(prev => prev.map(b => b.id === item.id ? data : b))
    } else {
      const { data, error: err } = await adminApi.rejectRescueCenter(item.id, rejectReason.trim())
      if (err || !data) return
      setCenters(prev => prev.map(c => c.id === item.id ? data : c))
    }
    setRejectingId(null)
    setRejectReason('')
  }

  // The endpoint returns a short-lived presigned S3 URL — open it, never store it.
  const handleViewIdDocument = async (id: string) => {
    const { data } = await adminApi.getServiceProviderIdDocument(id)
    if (data?.url) window.open(data.url, '_blank')
  }

  const handleDelete = async (id: string) => {
    const { error: err } = await adminApi.deleteRescueCenter(id, deleteCode)
    if (err) return
    setCenters(prev => prev.filter(c => c.id !== id))
    setDeletingId(null)
    setDeleteCode('')
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  if (error) {
    return <p className="text-destructive text-sm py-8 text-center">{error}</p>
  }

  return (
    <div className="space-y-4">
      {/* Type filter pills */}
      <div className="flex gap-1 bg-muted rounded-xl p-1 w-fit">
        {(['all', 'rescue_center', 'business', 'service_provider'] as TypeFilter[]).map((type) => {
          const labelKey =
            type === 'all' ? 'admin.filter_all'
              : type === 'rescue_center' ? 'admin.filter_rescue_centers'
                : type === 'business' ? 'admin.filter_businesses'
                  : 'admin.filter_service_providers'
          return (
            <button
              key={type}
              onClick={() => setTypeFilter(type)}
              className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-colors ${
                typeFilter === type ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t(labelKey, { ns: 'business' })}
            </button>
          )
        })}
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-1 bg-muted rounded-xl p-1 w-fit">
        {(Object.keys(statusLabelKeys) as StatusFilter[]).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-colors ${
              filter === s ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t(statusLabelKeys[s])}
          </button>
        ))}
      </div>

      {/* Card grid */}
      {filtered.length === 0 ? (
        <p className="text-muted-foreground text-sm py-8 text-center">
          {filter !== 'all' ? t('admin.no_centers_filtered', { status: t(statusLabelKeys[filter]).toLowerCase() }) : `${t('admin.no_centers')}.`}
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((item) => {
            const city = item._type === 'rescue_center' ? (item as RescueCenter).city : undefined
            const website = item._type === 'rescue_center' ? (item as RescueCenter).website : undefined
            const rejectReason_ = item._type === 'rescue_center'
              ? (item as RescueCenter).reject_reason
              : item._type === 'service_provider'
                ? (item as ServiceProvider).rejection_reason
                : undefined
            // Service providers have no RNC — show the services they offer instead.
            const subtitle = item._type === 'service_provider'
              ? (item as ServiceProvider).services.map(s => t(`service_providers.services.${s}`, { ns: 'business' })).join(', ')
              : (item.rnc || '')
            const typeLabelKey = item._type === 'rescue_center'
              ? 'admin.type_rescue_center'
              : item._type === 'business'
                ? 'admin.type_business'
                : 'admin.type_service_provider'
            const typeBadgeClass = item._type === 'rescue_center'
              ? 'bg-blue-500/20 text-blue-500'
              : item._type === 'business'
                ? 'bg-amber-500/20 text-amber-500'
                : 'bg-purple-500/20 text-purple-500'
            return (
              <div key={`${item._type}-${item.id}`} className="rounded-2xl border bg-card p-5 space-y-3">
                {/* Header */}
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <h3 className="font-semibold">{item.name}</h3>
                    <p className="text-sm text-muted-foreground">{subtitle}</p>
                    <span className={`inline-block text-xs px-2 py-1 rounded-xl font-medium ${typeBadgeClass}`}>
                      {t(typeLabelKey, { ns: 'business' })}
                    </span>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-xl font-medium ${statusColors[item.status] || ''}`}>
                    {statusTextKeys[item.status] ? t(statusTextKeys[item.status]) : item.status}
                  </span>
                </div>

                {/* Details */}
                <div className="space-y-1 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <FontAwesomeIcon icon={faMapMarkerAlt} className="text-sm" />
                    <span>{item.address}{city ? `, ${city}` : ''}</span>
                  </div>
                  {item.phone && (
                    <div className="flex items-center gap-2">
                      <FontAwesomeIcon icon={faPhone} className="text-sm" />
                      <span>{item.phone}</span>
                    </div>
                  )}
                  {item._type === 'service_provider' && (
                    <p className="text-xs">{(item as ServiceProvider).applicant_email}</p>
                  )}
                  {website && <p className="text-xs truncate">{website}</p>}
                  {item.instagram && <p className="text-xs">{item.instagram}</p>}
                </div>

                {/* Reject reason */}
                {item.status === 'rejected' && rejectReason_ && (
                  <p className="text-xs text-destructive bg-destructive/10 p-2 rounded-xl">
                    {t('admin.reject_reason')} {rejectReason_}
                  </p>
                )}

                {/* Reject inline input */}
                {rejectingId === item.id && (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder={t('admin.reject_placeholder')}
                      className="w-full px-3 py-2 border border-input rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-ring focus:border-transparent"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleReject(item)}
                        disabled={!rejectReason.trim()}
                        className="flex-1 py-1.5 px-3 bg-destructive text-destructive-foreground rounded-xl text-sm font-medium hover:bg-destructive/90 transition-colors disabled:opacity-50"
                      >
                        {t('confirm', { ns: 'common' })}
                      </button>
                      <button
                        onClick={() => { setRejectingId(null); setRejectReason('') }}
                        className="flex-1 py-1.5 px-3 border border-input rounded-xl text-sm hover:bg-muted transition-colors"
                      >
                        {t('cancel', { ns: 'common' })}
                      </button>
                    </div>
                  </div>
                )}

                {/* Actions */}
                {rejectingId !== item.id && (
                  <div className="flex gap-2">
                    {item.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleApprove(item)}
                          className="flex-1 py-1.5 px-3 bg-green-500/20 border border-green-500/40 rounded-xl text-sm font-medium text-green-500 hover:bg-green-500/30 transition-colors"
                        >
                          {t('admin.approve')}
                        </button>
                        <button
                          onClick={() => setRejectingId(item.id)}
                          className="flex-1 py-1.5 px-3 bg-destructive/20 border border-destructive/40 rounded-xl text-sm font-medium text-destructive hover:bg-destructive/30 transition-colors"
                        >
                          {t('admin.reject')}
                        </button>
                      </>
                    )}
                    {item._type === 'service_provider' && item.status === 'pending' && (
                      <button
                        onClick={() => handleViewIdDocument(item.id)}
                        className="flex-1 py-1.5 px-3 border border-input rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
                      >
                        <FontAwesomeIcon icon={faIdCard} className="text-sm mr-1.5" />
                        {t('admin.view_id_document', { ns: 'business' })}
                      </button>
                    )}
                    {item._type === 'rescue_center' && (
                      <button
                        onClick={() => setDeletingId(item.id)}
                        className="py-1.5 px-3 border border-input rounded-xl text-sm text-muted-foreground hover:bg-muted transition-colors"
                      >
                        <FontAwesomeIcon icon={faTrash} className="text-sm" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Delete confirmation dialog */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { setDeletingId(null); setDeleteCode('') }} />
          <div className="relative bg-card rounded-2xl p-6 w-full max-w-sm space-y-4 border shadow-lg">
            <h3 className="font-semibold">{t('admin.delete_title')}</h3>
            <p className="text-sm text-muted-foreground">
              {t('admin.delete_description')}
            </p>
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">{t('admin.delete_mfa_prompt')}</p>
              <MfaCodeInput onComplete={(code) => setDeleteCode(code)} error={null} />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleDelete(deletingId)}
                disabled={!deleteCode}
                className="flex-1 py-2 px-4 bg-destructive text-destructive-foreground rounded-xl text-sm font-medium hover:bg-destructive/90 transition-colors disabled:opacity-50"
              >
                {t('delete', { ns: 'common' })}
              </button>
              <button
                onClick={() => { setDeletingId(null); setDeleteCode('') }}
                className="flex-1 py-2 px-4 border border-input rounded-xl text-sm hover:bg-muted transition-colors"
              >
                {t('cancel', { ns: 'common' })}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
