import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../test-utils'
import { FileDropzone } from '@/components/ui/file-dropzone'

/*
  The point of FileDropzone is that the upload zone is a real <button> rather
  than the <div onClick> it replaced, so most of these tests are about the
  element type and its keyboard reachability, not about styling.

  jsdom limitations this file works around, all verified rather than assumed:
    - jsdom implements no UA activation behaviour, so a focused <button> gets
      no synthesised click from Enter/Space, and @testing-library/user-event
      (which models that) is not a dependency here. `press()` below applies the
      UA rule itself; see the comment on it.
    - there is no DataTransfer constructor, so drops carry a hand-rolled
      FileList-alike.
    - fireEvent.change sets `files` directly and never touches `value`, so the
      input reset is observed through the value setter instead.
*/

const png = (name = 'foto.png') =>
  new File(['binary'], name, { type: 'image/png' })

/** jsdom has no DataTransfer, and a bare array is not indexable as a FileList. */
const asFileList = (...files: File[]): FileList =>
  ({
    ...files,
    length: files.length,
    item: (i: number) => files[i] ?? null,
    [Symbol.iterator]: function* () { yield* files },
  }) as unknown as FileList

const hiddenInput = (container: HTMLElement) =>
  container.querySelector('input[type="file"]') as HTMLInputElement

const zone = () => screen.getByRole('button', { name: 'Seleccionar archivo' })

/*
  Applies the user-agent's own activation rule: Enter and Space activate a
  <button> (and Enter activates a link), and nothing else. Swap the dropzone
  back to a <div onClick>, or drop `type="button"`, and the two keyboard tests
  below fail — which is precisely the regression they exist to catch.
*/
function press(el: HTMLElement, key: 'Enter' | ' ') {
  fireEvent.keyDown(el, { key })
  fireEvent.keyUp(el, { key })

  const activates =
    el instanceof HTMLButtonElement ||
    (el instanceof HTMLInputElement && ['button', 'submit', 'reset'].includes(el.type)) ||
    (el instanceof HTMLAnchorElement && el.hasAttribute('href') && key === 'Enter')

  if (activates && !(el as HTMLButtonElement).disabled) fireEvent.click(el)
}

let clickSpy: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  // The real picker never opens in jsdom; what matters is that .click() reached
  // the hidden input at all.
  clickSpy = vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => {})
})

afterEach(() => {
  clickSpy.mockRestore()
})

describe('FileDropzone — it is a real button', () => {
  it('renders a native <button>, not a div wearing role="button"', () => {
    const { container } = renderWithProviders(
      <FileDropzone accept="image/png" label="Adjuntar archivo" onFiles={() => {}} />
    )

    const btn = zone()
    expect(btn.tagName).toBe('BUTTON')
    expect(btn).toHaveAttribute('type', 'button')
    // A leftover div[role=button] would still satisfy getByRole, so rule it out.
    expect(container.querySelector('[role="button"]')).toBeNull()
  })

  it('is reachable by keyboard focus', () => {
    renderWithProviders(
      <FileDropzone accept="image/png" label="Adjuntar archivo" onFiles={() => {}} />
    )

    const btn = zone()
    btn.focus()
    expect(document.activeElement).toBe(btn)
  })

  it.each(['Enter' as const, ' ' as const])('opens the picker on %j', key => {
    renderWithProviders(
      <FileDropzone accept="image/png" label="Adjuntar archivo" onFiles={() => {}} />
    )

    const btn = zone()
    btn.focus()
    press(btn, key)

    expect(clickSpy).toHaveBeenCalledTimes(1)
  })

  it('opens the picker on pointer click too', () => {
    renderWithProviders(
      <FileDropzone accept="image/png" label="Adjuntar archivo" onFiles={() => {}} />
    )

    fireEvent.click(zone())
    expect(clickSpy).toHaveBeenCalledTimes(1)
  })
})

describe('FileDropzone — selecting a file', () => {
  it('hands the selected files to onFiles', () => {
    const onFiles = vi.fn()
    const { container } = renderWithProviders(
      <FileDropzone accept="image/png" label="Adjuntar archivo" onFiles={onFiles} />
    )

    const file = png('cedula.png')
    fireEvent.change(hiddenInput(container), { target: { files: [file] } })

    expect(onFiles).toHaveBeenCalledTimes(1)
    expect(onFiles.mock.calls[0][0][0]).toBe(file)
  })

  it('ignores a change event that carries no files', () => {
    const onFiles = vi.fn()
    const { container } = renderWithProviders(
      <FileDropzone accept="image/png" label="Adjuntar archivo" onFiles={onFiles} />
    )

    fireEvent.change(hiddenInput(container), { target: { files: [] } })
    expect(onFiles).not.toHaveBeenCalled()
  })

  it('clears the input value so re-picking the same file still fires change', () => {
    const { container } = renderWithProviders(
      <FileDropzone accept="image/png" label="Adjuntar archivo" onFiles={() => {}} />
    )

    /*
      fireEvent.change assigns `files` and leaves `value` alone, so jsdom shows
      "" either way and the end-to-end consequence is unobservable. Watching the
      setter is what actually proves the reset line ran — and it has to be
      watched on the node, because React's input value tracker installs an own
      `value` descriptor that shadows the prototype one.
    */
    const input = hiddenInput(container)
    const original =
      Object.getOwnPropertyDescriptor(input, 'value') ??
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!
    const setValue = vi.fn()
    Object.defineProperty(input, 'value', {
      configurable: true,
      get: () => original.get!.call(input),
      set: (v: string) => { setValue(v); original.set!.call(input, v) },
    })

    fireEvent.change(input, { target: { files: [png()] } })

    expect(setValue).toHaveBeenCalledWith('')
  })

  it('forwards accept and multiple to the underlying input', () => {
    const { container } = renderWithProviders(
      <FileDropzone accept="image/png,.pdf" label="Adjuntar archivo" multiple onFiles={() => {}} />
    )

    const input = hiddenInput(container)
    expect(input).toHaveAttribute('accept', 'image/png,.pdf')
    expect(input).toHaveAttribute('multiple')
  })
})

describe('FileDropzone — selected state', () => {
  it('shows selectedName in place of the label', () => {
    renderWithProviders(
      <FileDropzone
        accept="image/png"
        label="Adjuntar archivo"
        hint="PNG o PDF"
        selectedName="cedula.png"
        onFiles={() => {}}
      />
    )

    expect(screen.getByText('cedula.png')).toBeInTheDocument()
    expect(screen.queryByText('Adjuntar archivo')).not.toBeInTheDocument()
    // The hint survives — it still describes what may be picked next.
    expect(screen.getByText('PNG o PDF')).toBeInTheDocument()
  })

  it('renders the clear control only when both selectedName and onClear are given', () => {
    const { rerender } = renderWithProviders(
      <FileDropzone accept="image/png" label="Adjuntar archivo" onFiles={() => {}} onClear={() => {}} />
    )
    expect(screen.queryByRole('button', { name: 'Quitar archivo' })).not.toBeInTheDocument()

    rerender(
      <FileDropzone accept="image/png" label="Adjuntar archivo" selectedName="cedula.png" onFiles={() => {}} />
    )
    expect(screen.queryByRole('button', { name: 'Quitar archivo' })).not.toBeInTheDocument()

    rerender(
      <FileDropzone
        accept="image/png"
        label="Adjuntar archivo"
        selectedName="cedula.png"
        onFiles={() => {}}
        onClear={() => {}}
      />
    )
    expect(screen.getByRole('button', { name: 'Quitar archivo' })).toBeInTheDocument()
  })

  it('calls onClear without re-opening the picker', () => {
    const onClear = vi.fn()
    renderWithProviders(
      <FileDropzone
        accept="image/png"
        label="Adjuntar archivo"
        selectedName="cedula.png"
        onFiles={() => {}}
        onClear={onClear}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Quitar archivo' }))
    expect(onClear).toHaveBeenCalledTimes(1)
    expect(clickSpy).not.toHaveBeenCalled()
  })
})

describe('FileDropzone — drag and drop', () => {
  it('hands dropped files to onFiles', () => {
    const onFiles = vi.fn()
    renderWithProviders(
      <FileDropzone accept="image/png" label="Adjuntar archivo" onFiles={onFiles} />
    )

    const file = png('arrastrado.png')
    fireEvent.drop(zone(), { dataTransfer: { files: asFileList(file) } })

    expect(onFiles).toHaveBeenCalledTimes(1)
    expect(onFiles.mock.calls[0][0][0]).toBe(file)
  })

  it('ignores an empty drop', () => {
    const onFiles = vi.fn()
    renderWithProviders(
      <FileDropzone accept="image/png" label="Adjuntar archivo" onFiles={onFiles} />
    )

    fireEvent.drop(zone(), { dataTransfer: { files: asFileList() } })
    expect(onFiles).not.toHaveBeenCalled()
  })

  it('cancels dragover so the browser does not navigate to the file', () => {
    renderWithProviders(
      <FileDropzone accept="image/png" label="Adjuntar archivo" onFiles={() => {}} />
    )

    // fireEvent returns false when the handler called preventDefault.
    expect(fireEvent.dragOver(zone(), { dataTransfer: { files: asFileList() } })).toBe(false)
  })

  it('toggles the dragging treatment on dragover and dragleave', () => {
    renderWithProviders(
      <FileDropzone accept="image/png" label="Adjuntar archivo" onFiles={() => {}} />
    )

    // jsdom applies no styles, so the state is asserted through the classes
    // that produce it rather than through a computed colour.
    const btn = zone()
    expect(btn.className).toContain('border-input')
    expect(btn.className).not.toContain('bg-pop-550/5')

    fireEvent.dragOver(btn)
    expect(btn.className).toContain('border-pop-550/50')
    expect(btn.className).toContain('bg-pop-550/5')
    expect(btn.className).not.toContain('border-input')

    fireEvent.dragLeave(btn)
    expect(btn.className).toContain('border-input')
    expect(btn.className).not.toContain('bg-pop-550/5')
  })

  it('resets the dragging treatment after a drop', () => {
    renderWithProviders(
      <FileDropzone accept="image/png" label="Adjuntar archivo" onFiles={() => {}} />
    )

    const btn = zone()
    fireEvent.dragOver(btn)
    fireEvent.drop(btn, { dataTransfer: { files: asFileList(png()) } })

    expect(btn.className).toContain('border-input')
  })
})

describe('FileDropzone — disabled', () => {
  it('does not open the picker by click or by keyboard', () => {
    renderWithProviders(
      <FileDropzone accept="image/png" label="Adjuntar archivo" disabled onFiles={() => {}} />
    )

    const btn = zone()
    expect(btn).toBeDisabled()

    fireEvent.click(btn)
    press(btn, 'Enter')

    expect(clickSpy).not.toHaveBeenCalled()
  })

  it('ignores dropped files', () => {
    const onFiles = vi.fn()
    renderWithProviders(
      <FileDropzone accept="image/png" label="Adjuntar archivo" disabled onFiles={onFiles} />
    )

    fireEvent.drop(zone(), { dataTransfer: { files: asFileList(png()) } })
    expect(onFiles).not.toHaveBeenCalled()
  })

  it('disables the hidden input too', () => {
    const { container } = renderWithProviders(
      <FileDropzone accept="image/png" label="Adjuntar archivo" disabled onFiles={() => {}} />
    )

    expect(hiddenInput(container)).toBeDisabled()
  })
})

describe('FileDropzone — naming and label association', () => {
  it('lets an external <label htmlFor> reach the real input', () => {
    renderWithProviders(
      <>
        <label id="lbl-x" htmlFor="file-input-x">Comprobante</label>
        <FileDropzone
          accept="image/png"
          label="Adjuntar archivo"
          inputId="file-input-x"
          aria-labelledby="lbl-x"
          onFiles={() => {}}
        />
      </>
    )

    // Both the input (clicking the label opens the picker) and the button
    // (what a screen reader actually reaches) answer to the same name.
    const named = screen.getAllByLabelText('Comprobante')
    const input = named.find(el => el.tagName === 'INPUT') as HTMLInputElement
    const btn = named.find(el => el.tagName === 'BUTTON')

    expect(input?.type).toBe('file')
    expect(input?.id).toBe('file-input-x')
    expect(btn).toBeInTheDocument()
    // aria-labelledby wins, so the generic fallback name is not applied.
    expect(btn).not.toHaveAttribute('aria-label')
  })

  it('generates a unique input id when none is supplied', () => {
    const { container } = renderWithProviders(
      <>
        <FileDropzone accept="image/png" label="Uno" onFiles={() => {}} />
        <FileDropzone accept="image/png" label="Dos" onFiles={() => {}} />
      </>
    )

    const ids = Array.from(container.querySelectorAll('input[type="file"]')).map(i => i.id)
    expect(ids).toHaveLength(2)
    expect(ids.every(Boolean)).toBe(true)
    expect(new Set(ids).size).toBe(2)
  })

  it('falls back to the translated activate name with no aria-labelledby', () => {
    renderWithProviders(
      <FileDropzone accept="image/png" label="Adjuntar archivo" onFiles={() => {}} />
    )

    expect(screen.getByRole('button', { name: 'Seleccionar archivo' })).toBeInTheDocument()
  })
})
