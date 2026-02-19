'use client'

import { useState } from 'react'
import { Eye, EyeOff, MoreHorizontal, RotateCcw, CalendarDays, Trash2 } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { ButtonGroup } from '@/components/ui/button-group'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { mockInterestedUsers, mockPets, MockInterestedUser, UserStatus } from '@/lib/data/mock-rescue-center'

function Initials({ name }: { name: string }) {
  const parts = name.trim().split(' ')
  const letters = parts.length >= 2
    ? parts[0][0] + parts[1][0]
    : parts[0].slice(0, 2)
  return (
    <div className="w-9 h-9 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center text-sm font-semibold shrink-0">
      {letters.toUpperCase()}
    </div>
  )
}

function getPetName(petId: string) {
  return mockPets.find((p) => p.id === petId)?.name ?? petId
}

interface ProfileSheetProps {
  user: MockInterestedUser | null
  open: boolean
  onClose: () => void
}

function ProfileSheet({ user, open, onClose }: ProfileSheetProps) {
  if (!user) return null
  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Perfil del interesado</SheetTitle>
        </SheetHeader>
        <div className="mt-6 space-y-4">
          <div className="flex items-center gap-3">
            <Initials name={user.name} />
            <span className="font-semibold text-lg">{user.name}</span>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between border-b py-2">
              <span className="text-muted-foreground">Mascota</span>
              <span className="font-medium">{getPetName(user.petId)}</span>
            </div>
            <div className="flex justify-between border-b py-2">
              <span className="text-muted-foreground">Formulario</span>
              <span>{user.formFilled ? 'Enviado' : 'Pendiente'}</span>
            </div>
            <div className="flex justify-between border-b py-2">
              <span className="text-muted-foreground">Transporte</span>
              <span>{user.waitingTransport ? 'Solicitado' : 'No solicitado'}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-muted-foreground">Estado</span>
              <span className="capitalize">{user.status}</span>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

export function InterestedTab() {
  const [users, setUsers] = useState(mockInterestedUsers)
  const [selectedUser, setSelectedUser] = useState<MockInterestedUser | null>(null)

  const setStatus = (id: string, status: UserStatus) => {
    setUsers((prev) => prev.map((u) => u.id === id ? { ...u, status } : u))
  }

  const deleteUser = (id: string) => {
    setUsers((prev) => prev.filter((u) => u.id !== id))
  }

  return (
    <div className="space-y-3">
      {users.map((user) => (
        <div
          key={user.id}
          className={`rounded-2xl border bg-card p-4 flex items-center gap-4 transition-opacity ${
            user.status === 'rejected' ? 'opacity-60 bg-muted' : ''
          }`}
        >
          {/* Left: avatar + info */}
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <Initials name={user.name} />
            <div className="min-w-0 flex flex-col gap-0.5">
              <p className="font-medium text-sm truncate">{user.name}</p>
              <p className="text-xs text-muted-foreground">
                Interesado en <span className="font-medium">{getPetName(user.petId)}</span>
              </p>
              {user.status === 'approved' && (
                <span className="mt-1 w-fit text-xs font-medium px-2 py-0.5 rounded-xl bg-green-100 text-green-800">
                  Aprobado
                </span>
              )}
              {user.status === 'rejected' && (
                <span className="mt-1 w-fit text-xs font-medium px-2 py-0.5 rounded-xl bg-red-100 text-red-800">
                  Rechazado
                </span>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="mt-1 h-6 px-2 text-xs rounded-xl w-fit"
                onClick={() => setSelectedUser(user)}
              >
                Ver perfil
              </Button>
            </div>
          </div>

          {/* Middle: form state */}
          <div className="hidden sm:flex items-center gap-1 shrink-0">
            {user.formFilled ? (
              <>
                <Eye size={14} className="text-foreground" />
                <span className="text-xs text-foreground">Ver formulario</span>
              </>
            ) : (
              <>
                <EyeOff size={14} className="text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Formulario incompleto</span>
              </>
            )}
          </div>

          {/* Right: actions */}
          <div className="flex items-center gap-2 shrink-0">
            {user.status === 'pending' && (
              <ButtonGroup>
                <Button
                  size="sm"
                  className="bg-green-100 text-green-800 hover:bg-green-600 hover:text-white transition-colors"
                  onClick={() => setStatus(user.id, 'approved')}
                >
                  Aprobar
                </Button>
                <Button
                  size="sm"
                  className="bg-red-100 text-red-700 hover:bg-red-600 hover:text-white transition-colors"
                  onClick={() => setStatus(user.id, 'rejected')}
                >
                  Rechazar
                </Button>
              </ButtonGroup>
            )}

            <Button variant="outline" size="sm" className="rounded-xl">
              Abrir Chat
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-xl">
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setStatus(user.id, 'pending')}>
                  <RotateCcw /> Revertir estado
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <CalendarDays /> Agregar en la agenda
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive focus:bg-destructive/10"
                  onClick={() => deleteUser(user.id)}
                >
                  <Trash2 /> Eliminar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      ))}

      <ProfileSheet
        user={selectedUser}
        open={selectedUser !== null}
        onClose={() => setSelectedUser(null)}
      />
    </div>
  )
}
