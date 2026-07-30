import { describe, it, expect, vi } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../../test-utils'
import { MfaCodeInput } from '@/components/auth/mfa/mfa-code-input'

const GROUP_LABEL = 'Código de verificación de 6 dígitos'

function renderInput(props: Partial<React.ComponentProps<typeof MfaCodeInput>> = {}) {
  const onComplete = props.onComplete ?? vi.fn()
  const view = renderWithProviders(<MfaCodeInput {...props} onComplete={onComplete} />)
  return { ...view, onComplete }
}

/** The six boxes, in document order. */
const boxes = () => screen.getAllByRole('textbox')

function paste(target: HTMLElement, text: string) {
  fireEvent.paste(target, { clipboardData: { getData: () => text } })
}

describe('MfaCodeInput — the six boxes are one labelled control', () => {
  it('gives the group and every box an accessible name', () => {
    renderInput()

    // Without this each box was announced as an anonymous "edit text", six times
    // over, with nothing saying what was being asked for.
    expect(screen.getByRole('group', { name: GROUP_LABEL })).toBeInTheDocument()
    boxes().forEach((box, i) => {
      expect(box).toHaveAccessibleName(`Dígito ${i + 1} de 6`)
    })
  })

  it('opts every box into the OS one-time-code autofill', () => {
    renderInput()

    boxes().forEach((box) => {
      expect(box).toHaveAttribute('autocomplete', 'one-time-code')
      expect(box).toHaveAttribute('inputmode', 'numeric')
    })
  })

  it('completes once all six digits are typed', () => {
    const { onComplete } = renderInput()

    boxes().forEach((box, i) => fireEvent.change(box, { target: { value: String(i + 1) } }))

    expect(onComplete).toHaveBeenCalledExactlyOnceWith('123456')
  })

  it('advances focus as digits are typed', () => {
    renderInput()

    expect(document.activeElement).toBe(boxes()[0])
    fireEvent.change(boxes()[0], { target: { value: '7' } })
    expect(document.activeElement).toBe(boxes()[1])
  })
})

describe('MfaCodeInput — paste lands wherever the user pastes', () => {
  it('fills all six boxes when a full code is pasted into a later box', () => {
    const { onComplete } = renderInput()

    // Paste used to be wired to box 0 only, so pasting into any other box did
    // nothing at all.
    paste(boxes()[3], '123456')

    expect(boxes().map((b) => (b as HTMLInputElement).value)).toEqual(['1', '2', '3', '4', '5', '6'])
    expect(onComplete).toHaveBeenCalledExactlyOnceWith('123456')
  })

  it('strips non-digits and truncates an over-long paste', () => {
    const { onComplete } = renderInput()

    paste(boxes()[0], ' 12-34 56 789 ')

    expect(boxes().map((b) => (b as HTMLInputElement).value)).toEqual(['1', '2', '3', '4', '5', '6'])
    expect(onComplete).toHaveBeenCalledExactlyOnceWith('123456')
  })

  it('fills from the start and parks focus on the next empty box for a partial paste', () => {
    const { onComplete } = renderInput()

    paste(boxes()[5], '123')

    expect(boxes().map((b) => (b as HTMLInputElement).value)).toEqual(['1', '2', '3', '', '', ''])
    expect(document.activeElement).toBe(boxes()[3])
    expect(onComplete).not.toHaveBeenCalled()
  })

  it('ignores a paste with no digits in it', () => {
    const { onComplete } = renderInput()

    paste(boxes()[0], 'no code here')

    expect(boxes().map((b) => (b as HTMLInputElement).value)).toEqual(['', '', '', '', '', ''])
    expect(onComplete).not.toHaveBeenCalled()
  })

  it('spreads a whole code that autofill dropped into a single box', () => {
    const { onComplete } = renderInput()

    // maxLength={1} stops a second keystroke, but OS autofill writes the value
    // directly. Keeping only the last digit would silently eat the code.
    fireEvent.change(boxes()[0], { target: { value: '123456' } })

    expect(boxes().map((b) => (b as HTMLInputElement).value)).toEqual(['1', '2', '3', '4', '5', '6'])
    expect(onComplete).toHaveBeenCalledExactlyOnceWith('123456')
  })
})

describe('MfaCodeInput — keyboard navigation across the boxes', () => {
  it('moves left and right with the arrow keys', () => {
    renderInput()

    fireEvent.keyDown(boxes()[0], { key: 'ArrowRight' })
    expect(document.activeElement).toBe(boxes()[1])

    fireEvent.keyDown(boxes()[1], { key: 'ArrowLeft' })
    expect(document.activeElement).toBe(boxes()[0])
  })

  it('does not run off either end', () => {
    renderInput()

    fireEvent.keyDown(boxes()[0], { key: 'ArrowLeft' })
    expect(document.activeElement).toBe(boxes()[0])

    boxes()[5].focus()
    fireEvent.keyDown(boxes()[5], { key: 'ArrowRight' })
    expect(document.activeElement).toBe(boxes()[5])
  })

  it('steps back to the previous box on backspace in an empty box', () => {
    renderInput()

    boxes()[2].focus()
    fireEvent.keyDown(boxes()[2], { key: 'Backspace' })

    expect(document.activeElement).toBe(boxes()[1])
  })

  it('stays put on backspace when the box still has a digit to delete', () => {
    renderInput()

    fireEvent.change(boxes()[0], { target: { value: '4' } })
    boxes()[1].focus()
    fireEvent.change(boxes()[1], { target: { value: '5' } })
    // Focus has moved to box 2; go back and delete box 1's own digit first.
    boxes()[1].focus()
    fireEvent.keyDown(boxes()[1], { key: 'Backspace' })

    expect(document.activeElement).toBe(boxes()[1])
  })
})

describe('MfaCodeInput — the error is announced, not just coloured', () => {
  it('exposes the message as an alert wired to every box', () => {
    renderInput({ error: 'Código inválido o expirado' })

    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('Código inválido o expirado')
    boxes().forEach((box) => {
      expect(box).toHaveAttribute('aria-invalid', 'true')
      expect(box).toHaveAttribute('aria-describedby', alert.id)
    })
  })

  it('leaves the boxes valid and undescribed when there is no error', () => {
    renderInput()

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    boxes().forEach((box) => {
      expect(box).toHaveAttribute('aria-invalid', 'false')
      expect(box).not.toHaveAttribute('aria-describedby')
    })
  })

  it('keeps the wiring unique when two inputs share a page', () => {
    renderWithProviders(
      <>
        <MfaCodeInput onComplete={vi.fn()} error="Código inválido" />
        <MfaCodeInput onComplete={vi.fn()} error="Código inválido" />
      </>
    )

    const ids = screen.getAllByRole('alert').map((a) => a.id)
    expect(new Set(ids).size).toBe(2)
  })
})
