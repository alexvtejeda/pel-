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
  { id: 'p1', name: 'Luna', imageUrl: '/assets/pets/1.png', status: 'available', interestedCount: 0 },
  { id: 'p2', name: 'Mango', imageUrl: '/assets/pets/2.png', status: 'interested', interestedCount: 3 },
  { id: 'p3', name: 'Coco', imageUrl: '/assets/pets/3.png', status: 'adopted', interestedCount: 1 },
  { id: 'p4', name: 'Bella', imageUrl: '/assets/pets/4.png', status: 'available', interestedCount: 0 },
  { id: 'p5', name: 'Rocky', imageUrl: '/assets/pets/5.png', status: 'interested', interestedCount: 5 },
  { id: 'p6', name: 'Nala', imageUrl: '/assets/pets/6.png', status: 'available', interestedCount: 0 },
  { id: 'p7', name: 'Max', imageUrl: '/assets/pets/7.png', status: 'adopted', interestedCount: 2 },
  { id: 'p8', name: 'Lola', imageUrl: '/assets/pets/8.png', status: 'interested', interestedCount: 1 },
]

export const mockInterestedUsers: MockInterestedUser[] = [
  { id: 'u1', name: 'María García', petId: 'p2', formFilled: true, waitingTransport: true, status: 'pending' },
  { id: 'u2', name: 'Carlos Pérez', petId: 'p2', formFilled: false, waitingTransport: false, status: 'pending' },
  { id: 'u3', name: 'Ana Martínez', petId: 'p2', formFilled: true, waitingTransport: false, status: 'approved' },
  { id: 'u4', name: 'Juan Rodríguez', petId: 'p5', formFilled: true, waitingTransport: true, status: 'pending' },
  { id: 'u5', name: 'Sofia Herrera', petId: 'p5', formFilled: false, waitingTransport: false, status: 'rejected' },
  { id: 'u6', name: 'Luis Torres', petId: 'p8', formFilled: true, waitingTransport: false, status: 'pending' },
]
