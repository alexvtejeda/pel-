'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/contexts/auth-context'
import { signOut } from '@/lib/firebase/auth'
import { deleteDocument } from '@/lib/firebase/firestore'

export function SettingsTab() {
  const { user, userProfile } = useAuth()
  const router = useRouter()

  const [displayName, setDisplayName] = useState(userProfile?.profile?.name ?? '')
  const [rescueName, setRescueName] = useState('')
  const [avatarPreview, setAvatarPreview] = useState<string | null>(userProfile?.profile?.avatarUrl ?? null)
  const [savedName, setSavedName] = useState(false)
  const [savedRescue, setSavedRescue] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleLogout = async () => {
    await signOut()
    router.push('/')
  }

  const handleDeleteAccount = async () => {
    if (!user) return
    setIsDeleting(true)
    setDeleteError(null)
    const { error: firestoreError } = await deleteDocument('users', user.uid)
    if (firestoreError) {
      setDeleteError('No se pudo eliminar la cuenta. Intenta de nuevo.')
      setIsDeleting(false)
      return
    }
    try {
      await user.delete()
      router.push('/')
    } catch (err: any) {
      if (err.code === 'auth/requires-recent-login') {
        setDeleteError('Por seguridad, cierra sesión, vuelve a iniciar sesión y luego elimina la cuenta.')
      } else {
        setDeleteError('No se pudo eliminar la cuenta. Intenta de nuevo.')
      }
      setIsDeleting(false)
    }
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    setAvatarPreview(url)
  }

  const handleSaveName = () => {
    setSavedName(true)
    setTimeout(() => setSavedName(false), 2000)
  }

  const handleSaveRescue = () => {
    setSavedRescue(true)
    setTimeout(() => setSavedRescue(false), 2000)
  }

  return (
    <div className="max-w-lg space-y-8">
      {/* Profile picture */}
      <div className="rounded-2xl border bg-card p-6 space-y-4">
        <h2 className="font-semibold">Foto de perfil</h2>
        <div className="flex items-center gap-4">
          <div className="relative w-20 h-20 rounded-full overflow-hidden bg-muted shrink-0">
            {avatarPreview ? (
              <Image src={avatarPreview} alt="Avatar" fill className="object-cover" unoptimized />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-muted-foreground">
                {displayName ? displayName[0].toUpperCase() : '?'}
              </div>
            )}
          </div>
          <div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="text-sm px-4 py-2 rounded-xl border border-input hover:bg-muted transition-colors"
            >
              Cambiar foto
            </button>
            <p className="text-xs text-muted-foreground mt-1">JPG, PNG o GIF · máx. 5 MB</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>
        </div>
      </div>

      {/* Display name */}
      <div className="rounded-2xl border bg-card p-6 space-y-4">
        <h2 className="font-semibold">Nombre de usuario</h2>
        <div className="flex gap-2">
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Tu nombre"
            className="flex-1 px-4 py-2 border border-input rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-ring focus:border-transparent"
          />
          <button
            onClick={handleSaveName}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm hover:bg-primary/90 transition-colors"
          >
            {savedName ? 'Guardado' : 'Guardar'}
          </button>
        </div>
      </div>

      {/* Rescue center name */}
      <div className="rounded-2xl border bg-card p-6 space-y-4">
        <h2 className="font-semibold">Nombre del centro de rescate</h2>
        <div className="flex gap-2">
          <input
            type="text"
            value={rescueName}
            onChange={(e) => setRescueName(e.target.value)}
            placeholder="Ej. Rescate Animal Santo Domingo"
            className="flex-1 px-4 py-2 border border-input rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-ring focus:border-transparent"
          />
          <button
            onClick={handleSaveRescue}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm hover:bg-primary/90 transition-colors"
          >
            {savedRescue ? 'Guardado' : 'Guardar'}
          </button>
        </div>
      </div>
      {/* Logout */}
      <div className="rounded-2xl border bg-card p-6 space-y-4">
        <h2 className="font-semibold">Sesión</h2>
        <button
          onClick={handleLogout}
          className="px-4 py-2 border border-input rounded-xl text-sm hover:bg-muted transition-colors"
        >
          Cerrar sesión
        </button>
      </div>

      {/* Delete account */}
      <div className="rounded-2xl border border-destructive/40 bg-card p-6 space-y-4">
        <h2 className="font-semibold text-destructive">Zona de peligro</h2>
        {!confirmDelete ? (
          <button
            onClick={() => setConfirmDelete(true)}
            className="px-4 py-2 border border-destructive text-destructive rounded-xl text-sm hover:bg-destructive/10 transition-colors"
          >
            Eliminar cuenta
          </button>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Esta acción es permanente y no se puede deshacer. ¿Confirmas?
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleDeleteAccount}
                disabled={isDeleting}
                className="px-4 py-2 bg-destructive text-destructive-foreground rounded-xl text-sm hover:bg-destructive/90 transition-colors disabled:opacity-50"
              >
                {isDeleting ? 'Eliminando…' : 'Sí, eliminar'}
              </button>
              <button
                onClick={() => { setConfirmDelete(false); setDeleteError(null) }}
                disabled={isDeleting}
                className="px-4 py-2 border border-input rounded-xl text-sm hover:bg-muted transition-colors"
              >
                Cancelar
              </button>
            </div>
            {deleteError && (
              <p className="text-sm text-destructive">{deleteError}</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
