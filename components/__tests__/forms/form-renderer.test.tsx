import { describe, it, expect } from 'vitest'
import { screen, fireEvent, within } from '@testing-library/react'
import { renderWithProviders } from '../test-utils'
import { FormRenderer } from '@/components/forms/form-renderer'
import type { Form, FormField } from '@/lib/api/forms'

/*
  Covers Task 1.1: consecutive fields are grouped into section cards and a
  sticky progress bar counts answered required questions.

  Cards are asserted through the rendered <section> elements rather than a
  role query: a <section> only exposes role="region" once it has an accessible
  name, and these are named by a plain <h2>, so they stay generic in the a11y
  tree. Reading the DOM the component actually produced is still an assertion
  about output, not about internals.
*/

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
