import { PetsHeader } from '@/components/pets/pets-header'

export default function PublicLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <PetsHeader />
      {children}
    </>
  )
}
