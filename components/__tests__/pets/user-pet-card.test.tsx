import { describe, it, expect, vi } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../test-utils'
import { UserPetCard } from '@/components/pets/user-pet-card'

describe('UserPetCard', () => {
  it('renders name, age and size', () => {
    renderWithProviders(
      <UserPetCard name="Luna" age={6} gender="female" species="cat" photoUrls={[]} size="small" />
    )
    expect(screen.getByText('Luna')).toBeInTheDocument()
    // 6 months stays in months
    expect(screen.getByText('6 meses')).toBeInTheDocument()
    // size "small" → localized "Pequeño"
    expect(screen.getByText('Pequeño')).toBeInTheDocument()
  })

  it('renders an age of 72 months as 6 years', () => {
    renderWithProviders(
      <UserPetCard name="Kira" age={72} gender="female" species="dog" photoUrls={[]} />
    )
    expect(screen.getByText('6 años')).toBeInTheDocument()
  })

  it('respects a user-chosen years unit without re-converting', () => {
    renderWithProviders(
      <UserPetCard name="Rex" age={6} ageUnit="years" gender="male" species="dog" photoUrls={[]} />
    )
    expect(screen.getByText('6 años')).toBeInTheDocument()
  })

  it('fires edit and delete callbacks passed via actions', () => {
    const onEdit = vi.fn()
    const onDelete = vi.fn()
    renderWithProviders(
      <UserPetCard
        name="Rex"
        age={2}
        gender="male"
        species="dog"
        photoUrls={[]}
        actions={
          <>
            <button aria-label="edit" onClick={onEdit} />
            <button aria-label="delete" onClick={onDelete} />
          </>
        }
      />
    )
    fireEvent.click(screen.getByLabelText('edit'))
    fireEvent.click(screen.getByLabelText('delete'))
    expect(onEdit).toHaveBeenCalledTimes(1)
    expect(onDelete).toHaveBeenCalledTimes(1)
  })
})
