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
