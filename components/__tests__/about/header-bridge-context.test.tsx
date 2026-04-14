import { render, act } from '@testing-library/react'
import { HeaderBridgeProvider, useHeaderBridge } from '@/components/about/header-bridge-context'
import type { HeaderBridge } from '@/components/about/header-bridge-context'

function Capture({ onReady }: { onReady: (bridge: HeaderBridge) => void }) {
  const bridge = useHeaderBridge()
  onReady(bridge)
  return null
}

describe('HeaderBridge', () => {
  it('provides progress=0 by default', () => {
    let captured: HeaderBridge | null = null
    render(
      <HeaderBridgeProvider>
        <Capture onReady={(b) => { captured = b }} />
      </HeaderBridgeProvider>
    )
    expect(captured!.progress.get()).toBe(0)
  })

  it('updates progress when written', () => {
    let captured: HeaderBridge | null = null
    render(
      <HeaderBridgeProvider>
        <Capture onReady={(b) => { captured = b }} />
      </HeaderBridgeProvider>
    )
    act(() => {
      captured!.progress.set(0.5)
    })
    expect(captured!.progress.get()).toBe(0.5)
  })

  it('throws if useHeaderBridge used outside provider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() =>
      render(<Capture onReady={() => {}} />)
    ).toThrow(/HeaderBridgeProvider/)
    spy.mockRestore()
  })
})
