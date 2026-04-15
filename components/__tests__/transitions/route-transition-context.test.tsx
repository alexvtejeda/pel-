import { renderHook, act } from '@testing-library/react'
import { ReactNode } from 'react'
import {
  RouteTransitionProvider,
  useRouteTransition,
} from '@/components/transitions/route-transition-context'

const mockPush = vi.fn()
const mockPathname = vi.fn(() => '/pets')

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => mockPathname(),
}))

const wrapper = ({ children }: { children: ReactNode }) => (
  <RouteTransitionProvider>{children}</RouteTransitionProvider>
)

beforeEach(() => {
  mockPush.mockClear()
  mockPathname.mockReturnValue('/pets')
  sessionStorage.clear()
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('RouteTransitionProvider', () => {
  it('starts in idle state', () => {
    const { result } = renderHook(() => useRouteTransition(), { wrapper })
    expect(result.current.status).toBe('idle')
    expect(result.current.type).toBe(null)
  })

  it('short-circuits navigation to the same route', async () => {
    const { result } = renderHook(() => useRouteTransition(), { wrapper })
    await act(async () => {
      await result.current.navigate('/pets')
    })
    expect(mockPush).not.toHaveBeenCalled()
    expect(result.current.status).toBe('idle')
  })

  it('runs skeleton transition: idle → exiting → entering → idle', async () => {
    const { result } = renderHook(() => useRouteTransition(), { wrapper })
    let promise: Promise<void>
    act(() => {
      promise = result.current.navigate('/aliados')
    })
    expect(result.current.status).toBe('exiting')
    expect(result.current.type).toBe('skeleton')

    await act(async () => {
      await vi.advanceTimersByTimeAsync(200)
    })
    expect(mockPush).toHaveBeenCalledWith('/aliados')
    expect(result.current.status).toBe('entering')

    document.body.innerHTML = '<div data-route="aliados"></div>'

    await act(async () => {
      await vi.advanceTimersByTimeAsync(400)
      await promise!
    })
    expect(result.current.status).toBe('idle')
    expect(result.current.type).toBe(null)
  })

  it('locks further navigation while a transition is in flight', async () => {
    const { result } = renderHook(() => useRouteTransition(), { wrapper })
    act(() => {
      void result.current.navigate('/aliados')
    })
    expect(result.current.status).toBe('exiting')
    act(() => {
      void result.current.navigate('/eventos')
    })
    expect(mockPush).not.toHaveBeenCalledWith('/eventos')
  })

  it('sets sessionStorage flag on about-in transition', async () => {
    mockPathname.mockReturnValue('/pets')
    const { result } = renderHook(() => useRouteTransition(), { wrapper })
    act(() => {
      void result.current.navigate('/about')
    })
    document.body.innerHTML = '<div data-about-hero-logo></div>'
    await act(async () => {
      await vi.advanceTimersByTimeAsync(800)
    })
    expect(sessionStorage.getItem('pelu:skip-scene-1-intro')).toBe('1')
  })

  it('setLogoRect updates logoRect in state', () => {
    const { result } = renderHook(() => useRouteTransition(), { wrapper })
    act(() => {
      result.current.setLogoRect({ x: 24, y: 32, width: 56, height: 56 })
    })
    expect(result.current.logoRect).toEqual({ x: 24, y: 32, width: 56, height: 56 })
  })
})
