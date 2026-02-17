export type PetStatus = 'available' | 'interested' | 'adopted'
export type UserStatus = 'pending' | 'approved' | 'rejected'

export interface MockPet {
  id: string
  name: string
  imageUrl: string
  status: PetStatus
  interestedCount: number
}

export interface MockInterestedUser {
  id: string
  name: string
  petId: string
  formFilled: boolean
  waitingTransport: boolean
  status: UserStatus
}

export const mockPets: MockPet[] = [
  { id: 'p1', name: 'Luna', imageUrl: 'https://placehold.co/400x400', status: 'available', interestedCount: 0 },
  { id: 'p2', name: 'Mango', imageUrl: 'https://placehold.co/400x400', status: 'interested', interestedCount: 3 },
  { id: 'p3', name: 'Coco', imageUrl: 'https://placehold.co/400x400', status: 'adopted', interestedCount: 1 },
  { id: 'p4', name: 'Bella', imageUrl: 'https://placehold.co/400x400', status: 'available', interestedCount: 0 },
  { id: 'p5', name: 'Rocky', imageUrl: 'https://placehold.co/400x400', status: 'interested', interestedCount: 5 },
  { id: 'p6', name: 'Nala', imageUrl: 'https://placehold.co/400x400', status: 'available', interestedCount: 0 },
  { id: 'p7', name: 'Max', imageUrl: 'https://placehold.co/400x400', status: 'adopted', interestedCount: 2 },
  { id: 'p8', name: 'Lola', imageUrl: 'https://placehold.co/400x400', status: 'interested', interestedCount: 1 },
]

export const mockInterestedUsers: MockInterestedUser[] = [
  { id: 'u1', name: 'María García', petId: 'p2', formFilled: true, waitingTransport: true, status: 'pending' },
  { id: 'u2', name: 'Carlos Pérez', petId: 'p2', formFilled: false, waitingTransport: false, status: 'pending' },
  { id: 'u3', name: 'Ana Martínez', petId: 'p2', formFilled: true, waitingTransport: false, status: 'approved' },
  { id: 'u4', name: 'Juan Rodríguez', petId: 'p5', formFilled: true, waitingTransport: true, status: 'pending' },
  { id: 'u5', name: 'Sofia Herrera', petId: 'p5', formFilled: false, waitingTransport: false, status: 'rejected' },
  { id: 'u6', name: 'Luis Torres', petId: 'p8', formFilled: true, waitingTransport: false, status: 'pending' },
]
