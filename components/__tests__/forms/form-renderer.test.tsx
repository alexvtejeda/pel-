import { describe, it, expect, vi } from 'vitest'
import { screen, fireEvent, within } from '@testing-library/react'
import { renderWithProviders } from '../test-utils'
import { FormRenderer } from '@/components/forms/form-renderer'
import type { Form, FormField } from '@/lib/api/forms'

/*
  Covers Task 1.1 (fields grouped into section cards behind a sticky progress
  bar) and Task 1.2 (labels associated with their controls, described-by /
  invalid semantics, group roles, and 44px option rows).

  The section-grouping suite counts the rendered <section> elements directly
  because it cares about how fields were partitioned, not about naming; the
  landmark suite below asserts the accessible name those sections now carry.
*/

// jsdom does not implement scrollIntoView; validate() scrolls to the first error.
Element.prototype.scrollIntoView = vi.fn()

const field = (over: Partial<FormField> & Pick<FormField, 'id' | 'label'>): FormField => ({
  type: 'short_text',
  description: '',
  required: false,
  section: '',
  options: [],
  ratingMin: '',
  ratingMax: '',
  follow_ups: [],
  ...over,
})

const makeForm = (fields: FormField[]): Form => ({
  id: 'form-1',
  rescue_center_id: 'rc-1',
  name: 'Solicitud de adopción',
  is_special_needs: false,
  fields,
  created_at: '',
  updated_at: '',
})

const RC = { name: 'Refugio Pelú', logo_url: null }

const cards = (container: HTMLElement) =>
  Array.from(container.querySelectorAll('section'))

/*
  Resolves aria-describedby to the text a screen reader would actually
  announce. A dangling id resolves to null, so comparing against the expected
  strings also proves every referenced element really exists.
*/
const describedTexts = (el: Element) =>
  (el.getAttribute('aria-describedby') ?? '')
    .split(' ')
    .filter(Boolean)
    .map(id => document.getElementById(id)?.textContent ?? null)

const submit = () =>
  fireEvent.click(screen.getByRole('button', { name: /Enviar solicitud/ }))

describe('FormRenderer — section grouping', () => {
  it('puts consecutive fields sharing a section into one card', () => {
    const { container } = renderWithProviders(
      <FormRenderer
        form={makeForm([
          field({ id: 'a', label: '¿Cómo te llamas?', section: 'Sobre ti' }),
          field({ id: 'b', label: '¿Cuántos años tienes?', section: 'Sobre ti' }),
          field({ id: 'c', label: '¿Vives en casa o apartamento?', section: 'Tu hogar' }),
        ])}
        rc={RC}
      />
    )

    const rendered = cards(container)
    expect(rendered).toHaveLength(2)

    expect(within(rendered[0]).getByRole('heading', { name: 'Sobre ti' })).toBeInTheDocument()
    expect(within(rendered[0]).getByText('¿Cómo te llamas?')).toBeInTheDocument()
    expect(within(rendered[0]).getByText('¿Cuántos años tienes?')).toBeInTheDocument()
    expect(within(rendered[0]).queryByText('¿Vives en casa o apartamento?')).not.toBeInTheDocument()

    expect(within(rendered[1]).getByRole('heading', { name: 'Tu hogar' })).toBeInTheDocument()
    expect(within(rendered[1]).getByText('¿Vives en casa o apartamento?')).toBeInTheDocument()
  })

  it('does not merge non-consecutive fields that share a section name', () => {
    const { container } = renderWithProviders(
      <FormRenderer
        form={makeForm([
          field({ id: 'a', label: 'Pregunta A', section: 'Sobre ti' }),
          field({ id: 'b', label: 'Pregunta B', section: 'Tu hogar' }),
          field({ id: 'c', label: 'Pregunta C', section: 'Sobre ti' }),
        ])}
        rc={RC}
      />
    )

    const rendered = cards(container)
    expect(rendered).toHaveLength(3)
    expect(within(rendered[0]).getByText('Pregunta A')).toBeInTheDocument()
    expect(within(rendered[1]).getByText('Pregunta B')).toBeInTheDocument()
    expect(within(rendered[2]).getByText('Pregunta C')).toBeInTheDocument()

    // The repeated name renders twice — as two separate headings, not one card.
    expect(screen.getAllByRole('heading', { name: 'Sobre ti' })).toHaveLength(2)
  })

  it('falls back to "Tu solicitud" for fields with no section', () => {
    const { container } = renderWithProviders(
      <FormRenderer
        form={makeForm([
          field({ id: 'a', label: 'Pregunta suelta' }),
          field({ id: 'b', label: 'Otra pregunta suelta' }),
        ])}
        rc={RC}
      />
    )

    const rendered = cards(container)
    expect(rendered).toHaveLength(1)
    expect(within(rendered[0]).getByRole('heading', { name: 'Tu solicitud' })).toBeInTheDocument()
    expect(within(rendered[0]).getByText('Pregunta suelta')).toBeInTheDocument()
    expect(within(rendered[0]).getByText('Otra pregunta suelta')).toBeInTheDocument()
  })

  it('starts a new card when an unsectioned field follows a sectioned one', () => {
    const { container } = renderWithProviders(
      <FormRenderer
        form={makeForm([
          field({ id: 'a', label: 'Pregunta A', section: 'Sobre ti' }),
          field({ id: 'b', label: 'Pregunta B' }),
        ])}
        rc={RC}
      />
    )

    const rendered = cards(container)
    expect(rendered).toHaveLength(2)
    expect(within(rendered[0]).getByRole('heading', { name: 'Sobre ti' })).toBeInTheDocument()
    expect(within(rendered[1]).getByRole('heading', { name: 'Tu solicitud' })).toBeInTheDocument()
  })
})

describe('FormRenderer — progress indicator', () => {
  const twoRequired = makeForm([
    field({ id: 'a', label: 'Nombre', required: true, section: 'Sobre ti' }),
    field({ id: 'b', label: 'Teléfono', required: true, section: 'Sobre ti' }),
    field({ id: 'c', label: 'Comentario', section: 'Sobre ti' }),
  ])

  it('counts only required questions and updates as they are answered', () => {
    renderWithProviders(<FormRenderer form={twoRequired} rc={RC} />)

    const bar = screen.getByRole('progressbar')
    expect(bar).toHaveAttribute('aria-valuenow', '0')
    expect(bar).toHaveAttribute('aria-valuemax', '2')
    expect(screen.getByText('0 de 2 preguntas obligatorias')).toBeInTheDocument()

    fireEvent.change(screen.getAllByRole('textbox')[0], { target: { value: 'Ana' } })

    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1')
    expect(screen.getByText('1 de 2 preguntas obligatorias')).toBeInTheDocument()

    fireEvent.change(screen.getAllByRole('textbox')[1], { target: { value: '809-555-0100' } })

    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '2')
    expect(screen.getByText('2 de 2 preguntas obligatorias')).toBeInTheDocument()
  })

  it('does not count a required field answered with only whitespace', () => {
    renderWithProviders(<FormRenderer form={twoRequired} rc={RC} />)

    fireEvent.change(screen.getAllByRole('textbox')[0], { target: { value: '   ' } })

    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0')
    expect(screen.getByText('0 de 2 preguntas obligatorias')).toBeInTheDocument()
  })

  it('renders no progress bar when the form has no required questions', () => {
    renderWithProviders(
      <FormRenderer form={makeForm([field({ id: 'a', label: 'Opcional' })])} rc={RC} />
    )

    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
  })

  it('renders no progress bar in preview mode', () => {
    const { container } = renderWithProviders(
      <FormRenderer form={twoRequired} rc={RC} preview />
    )

    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
    // The cards themselves still apply in preview — that is the intended change.
    expect(cards(container)).toHaveLength(1)
  })
})

describe('FormRenderer — label association', () => {
  /*
    getByLabelText is the real regression guard: it only resolves when
    htmlFor and id genuinely point at each other. Asserting the attributes
    directly would still pass if they pointed at nothing.
  */
  it.each([
    ['short_text' as const, 'input'],
    ['long_text' as const, 'textarea'],
    ['date' as const, 'input'],
    ['dropdown' as const, 'select'],
  ])('associates the %s label with its <%s>', (type, tag) => {
    renderWithProviders(
      <FormRenderer
        form={makeForm([field({ id: 'q1', label: '¿Cómo te llamas?', type, options: ['A'] })])}
        rc={RC}
      />
    )

    const control = screen.getByLabelText('¿Cómo te llamas?')
    expect(control.tagName.toLowerCase()).toBe(tag)
  })

  it('never points a label at a control that does not exist', () => {
    const { container } = renderWithProviders(
      <FormRenderer
        form={makeForm([
          field({ id: 't', label: 'Texto' }),
          field({ id: 'l', label: 'Largo', type: 'long_text' }),
          field({ id: 'd', label: 'Fecha', type: 'date' }),
          field({ id: 'm', label: 'Opción', type: 'multiple_choice', options: ['A', 'B'] }),
          field({ id: 'c', label: 'Casillas', type: 'checkbox', options: ['A'] }),
          field({ id: 's', label: 'Lista', type: 'dropdown', options: ['A'] }),
          field({ id: 'r', label: 'Escala', type: 'rating', ratingMin: '1', ratingMax: '5' }),
          field({ id: 'f', label: 'Archivo', type: 'file_upload' }),
        ])}
        rc={RC}
      />
    )

    const labelled = Array.from(container.querySelectorAll('label[for]'))
    expect(labelled.length).toBeGreaterThan(0)
    for (const label of labelled) {
      const target = label.getAttribute('for')!
      expect(
        document.getElementById(target),
        `label "${label.textContent}" points at missing control #${target}`
      ).not.toBeNull()
    }
  })

  it('names the radio set as a group instead of a dangling label', () => {
    renderWithProviders(
      <FormRenderer
        form={makeForm([
          field({ id: 'v', label: '¿Dónde vives?', type: 'multiple_choice', options: ['Casa', 'Apartamento'] }),
        ])}
        rc={RC}
      />
    )

    const group = screen.getByRole('group', { name: '¿Dónde vives?' })
    expect(within(group).getAllByRole('radio')).toHaveLength(2)
  })

  it('names the rating scale as a group', () => {
    renderWithProviders(
      <FormRenderer
        form={makeForm([
          field({ id: 'r', label: '¿Qué tanto espacio tienes?', type: 'rating', ratingMin: 'Poco', ratingMax: 'Mucho' }),
        ])}
        rc={RC}
      />
    )

    const group = screen.getByRole('group', { name: '¿Qué tanto espacio tienes?' })
    expect(within(group).getAllByRole('button')).toHaveLength(5)
  })
})

describe('FormRenderer — option rows', () => {
  it('makes the whole option row clickable and at least 44px tall', () => {
    renderWithProviders(
      <FormRenderer
        form={makeForm([
          field({ id: 'v', label: '¿Dónde vives?', type: 'multiple_choice', options: ['Casa', 'Apartamento'] }),
        ])}
        rc={RC}
      />
    )

    // Clicking the option text — not the 16px radio — selects it, which only
    // works because the row is a <label> wrapping its control.
    fireEvent.click(screen.getByText('Apartamento'))
    expect(screen.getByRole('radio', { name: 'Apartamento' })).toBeChecked()

    // jsdom has no layout, so the touch target is asserted through the class
    // that produces it (min-h-11 = 44px).
    const row = screen.getByText('Casa').closest('label')!
    expect(row.className).toContain('min-h-11')
  })

  it('toggles checkbox options from anywhere in the row', () => {
    renderWithProviders(
      <FormRenderer
        form={makeForm([
          field({ id: 'c', label: '¿Qué tienes?', type: 'checkbox', options: ['Patio', 'Balcón'] }),
        ])}
        rc={RC}
      />
    )

    fireEvent.click(screen.getByText('Patio'))
    expect(screen.getByRole('checkbox', { name: 'Patio' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Balcón' })).not.toBeChecked()

    const row = screen.getByText('Balcón').closest('label')!
    expect(row.className).toContain('min-h-11')
  })
})

describe('FormRenderer — error semantics', () => {
  const withDescription = makeForm([
    field({
      id: 'tel',
      label: 'Teléfono',
      description: 'Incluye el código de área.',
      required: true,
    }),
  ])

  it('describes the control by its hint, then by hint and error together', () => {
    renderWithProviders(
      <FormRenderer form={withDescription} rc={RC} onSubmit={async () => {}} />
    )

    // The required marker is aria-hidden but still part of the label's text.
    const input = screen.getByLabelText(/Teléfono/)
    expect(input).toHaveAttribute('aria-invalid', 'false')
    expect(describedTexts(input)).toEqual(['Incluye el código de área.'])

    submit()

    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(describedTexts(input)).toEqual([
      'Incluye el código de área.',
      'Este campo es obligatorio',
    ])
  })

  it('announces the validation error with role="alert"', () => {
    renderWithProviders(
      <FormRenderer form={withDescription} rc={RC} onSubmit={async () => {}} />
    )

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()

    submit()

    expect(screen.getByRole('alert')).toHaveTextContent('Este campo es obligatorio')
  })

  it('clears the invalid state only on the field that was answered', () => {
    renderWithProviders(
      <FormRenderer
        form={makeForm([
          field({ id: 'tel', label: 'Teléfono', required: true }),
          field({ id: 'dir', label: 'Dirección', required: true }),
        ])}
        rc={RC}
        onSubmit={async () => {}}
      />
    )

    submit()
    expect(screen.getByLabelText(/Teléfono/)).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByLabelText(/Dirección/)).toHaveAttribute('aria-invalid', 'true')

    fireEvent.change(screen.getByLabelText(/Teléfono/), { target: { value: '809-555-0100' } })
    // Re-validating still fails on the other field, so the form stays put.
    submit()

    expect(screen.getByLabelText(/Teléfono/)).toHaveAttribute('aria-invalid', 'false')
    expect(screen.getByLabelText(/Dirección/)).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getAllByRole('alert')).toHaveLength(1)
  })
})

describe('FormRenderer — section landmarks', () => {
  it('exposes each section card as a region named by its heading', () => {
    renderWithProviders(
      <FormRenderer
        form={makeForm([
          field({ id: 'a', label: 'Pregunta A', section: 'Sobre ti' }),
          field({ id: 'b', label: 'Pregunta B', section: 'Tu hogar' }),
        ])}
        rc={RC}
      />
    )

    expect(screen.getByRole('region', { name: 'Sobre ti' })).toBeInTheDocument()
    const hogar = screen.getByRole('region', { name: 'Tu hogar' })
    expect(within(hogar).getByText('Pregunta B')).toBeInTheDocument()
  })

  it('names an unsectioned card by its fallback heading', () => {
    renderWithProviders(
      <FormRenderer form={makeForm([field({ id: 'a', label: 'Pregunta suelta' })])} rc={RC} />
    )

    expect(screen.getByRole('region', { name: 'Tu solicitud' })).toBeInTheDocument()
  })
})
