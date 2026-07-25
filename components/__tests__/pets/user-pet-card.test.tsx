import { describe, it, expect, vi } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../test-utils'
import { UserPetCard } from '@/components/pets/user-pet-card'

describe('UserPetCard', () => {
  it('renders name, age unit and size', () => {
    renderWithProviders(
      <UserPetCard name="Luna" age={6} gender="female" species="cat" photoUrls={[]} size="small" />
    )
    expect(screen.getByText('Luna')).toBeInTheDocument()
    // age "6" with the months unit label
    expect(screen.getByText(/Meses/)).toBeInTheDocument()
    // size "small" → localized "Pequeño"
    expect(screen.getByText('Pequeño')).toBeInTheDocument()
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
