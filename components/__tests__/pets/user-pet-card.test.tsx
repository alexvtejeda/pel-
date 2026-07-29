import { describe, it, expect, vi, beforeAll } from 'vitest'
import { screen, fireEvent, within } from '@testing-library/react'
import { renderWithProviders } from '../test-utils'
import { UserPetCard } from '@/components/pets/user-pet-card'
import { UserPetCardSkeleton } from '@/components/pets/user-pet-card-skeleton'

const PHOTOS = ['https://cdn.test/luna-1.jpg', 'https://cdn.test/luna-2.jpg']

/*
  jsdom performs no layout, so every element reports offsetWidth 0 and the
  carousel — which only mounts once it has measured its container — would render
  no <img> at all. Give it a width so the photo assertions below exercise the
  real markup instead of an empty box.
*/
beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
    configurable: true,
    value: 240,
  })
})

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

  describe('photo alt text', () => {
    /*
      The bug: every carousel item was built with title:'' and Carousel forwards
      that straight into the <img alt>, so the whole grid was a wall of unlabelled
      images. Assert on every rendered <img>, not just the first — the carousel
      clones the edge slides when it loops.
    */
    it('names every photo after the pet', () => {
      const { container } = renderWithProviders(
        <UserPetCard name="Luna" age={6} gender="female" species="cat" photoUrls={PHOTOS} />
      )

      const imgs = Array.from(container.querySelectorAll('img'))
      expect(imgs.length).toBeGreaterThan(0)
      for (const img of imgs) {
        expect(img.getAttribute('alt')).toBe('Luna')
      }
    })

    /*
      Carousel renders `title` as a visible caption bar over the photo as well as
      into the alt, so naming the photos via `title` would stamp the pet's name
      across every card. The name must appear exactly as often with photos as
      without — i.e. only in the heading.
    */
    it('does not print the name over the photo', () => {
      const { container: withPhotos } = renderWithProviders(
        <UserPetCard name="Luna" age={6} gender="female" species="cat" photoUrls={PHOTOS} />
      )
      const { container: withoutPhotos } = renderWithProviders(
        <UserPetCard name="Luna" age={6} gender="female" species="cat" photoUrls={[]} />
      )

      expect(within(withPhotos).getAllByText('Luna')).toHaveLength(
        within(withoutPhotos).getAllByText('Luna').length
      )
    })

    /*
      The live preview inside MemberAddPetModal renders before the user has typed
      a name. Falling back to '' would put us right back at alt="".
    */
    it('falls back to the generic label when the pet has no name yet', () => {
      const { container } = renderWithProviders(
        <UserPetCard name="  " age={6} gender="female" species="cat" photoUrls={PHOTOS} />
      )

      const imgs = Array.from(container.querySelectorAll('img'))
      expect(imgs.length).toBeGreaterThan(0)
      for (const img of imgs) {
        // Matches the heading's own fallback, so the photo is never nameless.
        expect(img.getAttribute('alt')).toBe('Nombre')
      }
    })
  })

  /*
    The carousel used to render nothing until it had measured its container, so
    every card flashed an empty box on first paint. Simulate the unmeasured case
    by reporting offsetWidth 0: a photo must still be there.
  */
  it('shows a photo before the container has been measured', () => {
    Object.defineProperty(HTMLElement.prototype, 'offsetWidth', { configurable: true, value: 0 })
    try {
      const { container } = renderWithProviders(
        <UserPetCard name="Luna" age={6} gender="female" species="cat" photoUrls={PHOTOS} />
      )
      expect(container.querySelectorAll('img').length).toBeGreaterThan(0)
    } finally {
      Object.defineProperty(HTMLElement.prototype, 'offsetWidth', { configurable: true, value: 240 })
    }
  })

  /*
    Vaccinated/neutered used to be a green icon vs a grey one and nothing else,
    which WCAG 1.4.1 forbids. Both branches are asserted deliberately: a test that
    only checked the vaccinated case would also have to be written as "is there a
    green icon", which passes against the old colour-only markup.
  */
  describe('health status is stated in text, not just colour', () => {
    const render = (props: { vaccinated?: boolean; castrated?: boolean }) =>
      renderWithProviders(
        <UserPetCard
          name="Luna"
          age={6}
          gender="female"
          species="cat"
          photoUrls={[]}
          {...props}
        />
      )

    it('states that a vaccinated pet is vaccinated', () => {
      render({ vaccinated: true })
      expect(screen.getByText('Vacunado')).toBeInTheDocument()
      expect(screen.queryByText('Sin vacunar')).not.toBeInTheDocument()
    })

    it('states that an unvaccinated pet is not vaccinated', () => {
      render({ vaccinated: false })
      expect(screen.getByText('Sin vacunar')).toBeInTheDocument()
      expect(screen.queryByText('Vacunado')).not.toBeInTheDocument()
    })

    it('states that a neutered pet is neutered', () => {
      render({ castrated: true })
      expect(screen.getByText('Castrado')).toBeInTheDocument()
      expect(screen.queryByText('Sin castrar')).not.toBeInTheDocument()
    })

    it('states that an unneutered pet is not neutered', () => {
      render({ castrated: false })
      expect(screen.getByText('Sin castrar')).toBeInTheDocument()
      expect(screen.queryByText('Castrado')).not.toBeInTheDocument()
    })

    // An omitted flag is not a claim of health — it must read as "not", never blank.
    it('treats an unknown status as not-yet-done rather than silence', () => {
      render({})
      expect(screen.getByText('Sin vacunar')).toBeInTheDocument()
      expect(screen.getByText('Sin castrar')).toBeInTheDocument()
    })

    /*
      The status text is sr-only, so it must not add visible clutter — but it also
      must not be hidden from assistive tech. Guard both halves.
    */
    it('keeps the status text off-screen but exposed', () => {
      const { container } = render({ vaccinated: true, castrated: false })

      for (const label of ['Vacunado', 'Sin castrar']) {
        const node = screen.getByText(label)
        expect(node.className).toContain('sr-only')
        expect(node.closest('[aria-hidden="true"]')).toBeNull()
      }
      // The icons themselves carry no meaning any more.
      expect(container.querySelectorAll('[data-icon="syringe"][aria-hidden="true"]')).toHaveLength(1)
    })
  })
})

describe('UserPetCardSkeleton', () => {
  /*
    The skeleton stands in for a card mid-load; if its wrapper geometry drifts
    from UserPetCard's the grid visibly jumps when the pets land.
  */
  it('mirrors the card wrapper geometry', () => {
    const { container: skeleton } = renderWithProviders(<UserPetCardSkeleton />)
    const { container: card } = renderWithProviders(
      <UserPetCard name="Luna" age={6} gender="female" species="cat" photoUrls={[]} />
    )

    const skeletonWrapper = skeleton.firstElementChild!
    const cardWrapper = card.firstElementChild!

    for (const cls of ['rounded-2xl', 'border', 'bg-card']) {
      expect(skeletonWrapper.className).toContain(cls)
      expect(cardWrapper.className).toContain(cls)
    }
    // Same elevation, or the grid changes depth halfway through loading.
    const shadowOf = (el: Element) =>
      el.className.split(/\s+/).find((c) => c.startsWith('shadow-'))
    expect(shadowOf(skeletonWrapper)).toBe(shadowOf(cardWrapper))
    expect(shadowOf(cardWrapper)).toBeDefined()

    // It must actually read as a placeholder, not a rendered card.
    expect(skeletonWrapper.className).toContain('animate-pulse')
    expect(skeleton.querySelector('.aspect-square')).toBeInTheDocument()
  })
})
