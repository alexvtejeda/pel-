'use client'

import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { FormField } from '@/lib/api/forms'
import { FormRenderer } from '@/components/forms/form-renderer'
import { FormBuilder } from '@/components/forms/form-builder'
import * as adminApi from '@/lib/api/admin'

export function AdminFormTab() {
  const [fields, setFields]     = useState<FormField[]>([])
  const [view, setView]         = useState<'edit' | 'preview'>('edit')
  const [dirty, setDirty]       = useState(false)
  const [saving, setSaving]     = useState(false)
  const [saveMsg, setSaveMsg]   = useState('')
  const [loading, setLoading]   = useState(true)
  const [formName, setFormName] = useState('Plantilla de adopción')
  const [loadError, setLoadError] = useState(false)

  // Load master template on mount
  const loadTemplate = useCallback(() => {
    setLoadError(false)
    setLoading(true)
    adminApi.getFormTemplate().then(({ data, error }) => {
      if (error || !data) {
        setLoadError(true)
      } else {
        setFields(data.fields)
        if (data.name) setFormName(data.name)
      }
      setLoading(false)
    })
  }, [])

  useEffect(() => { loadTemplate() }, [loadTemplate])

  // Save calls admin API
  const handleSave = async () => {
    setSaving(true)
    const { error } = await adminApi.updateFormTemplate({ name: formName, fields })
    setSaving(false)
    if (error) { setSaveMsg(`Error: ${error}`); return }
    setDirty(false)
    setSaveMsg('Guardado ✓')
    setTimeout(() => setSaveMsg(''), 2000)
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4">
        <p className="text-sm text-muted-foreground">No se pudo cargar la plantilla. Verifica que el servidor esté disponible.</p>
        <Button size="sm" className="rounded-xl" onClick={loadTemplate}>
          Reintentar
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Top bar: Edit/Preview tabs + Save */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Edit/Preview switcher */}
        <div className="flex gap-1">
          {(['edit', 'preview'] as const).map(v => (
            <button key={v} onClick={() => setView(v)}
              className={v === view
                ? 'px-4 py-1.5 rounded-xl bg-pop-550 text-white text-sm font-medium'
                : 'px-4 py-1.5 rounded-xl text-muted-foreground text-sm hover:bg-muted'}>
              {v === 'edit' ? `Editar${dirty ? ' •' : ''}` : 'Vista previa'}
            </button>
          ))}
        </div>

        <div className="ml-auto">
          <Button size="sm" className="rounded-xl" onClick={handleSave} disabled={!dirty || saving}>
            {saving ? 'Guardando...' : saveMsg || 'Guardar plantilla'}
          </Button>
        </div>
      </div>

      {/* Preview mode */}
      {view === 'preview' && (
        <div className="border rounded-2xl overflow-hidden">
          <FormRenderer
            form={{ id: 'preview', rescue_center_id: '', name: formName, is_special_needs: false, fields, created_at: '', updated_at: '' }}
            rc={{ name: 'Pelú Admin', logo_url: null }}
          />
        </div>
      )}

      {/* Edit mode */}
      {view === 'edit' && (
        <FormBuilder
          fields={fields}
          onChange={newFields => { setFields(newFields); setDirty(true) }}
          formName={formName}
          onNameChange={name => { setFormName(name); setDirty(true) }}
        />
      )}
    </div>
  )
}
